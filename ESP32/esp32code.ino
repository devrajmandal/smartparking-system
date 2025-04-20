#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server details
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/scan";

// Authorized UIDs (format: byte arrays)
byte authorizedUID1[4] = {0xBF, 0x5A, 0x87, 0x1F}; // BF 5A 87 1F
byte authorizedUID2[4] = {0xDF, 0x34, 0x89, 0x1C}; // DF 34 89 1C

// RFID Reader 1 (Entry)
#define SS_PIN_1  5
#define RST_PIN_1 22
// RFID Reader 2 (Exit)
#define SS_PIN_2  4
#define RST_PIN_2 21

MFRC522 rfid1(SS_PIN_1, RST_PIN_1);
MFRC522 rfid2(SS_PIN_2, RST_PIN_2);
Servo myservo;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Initialize SPI and RFID readers
  SPI.begin();
  rfid1.PCD_Init();
  rfid2.PCD_Init();
  
  // Initialize servo
  myservo.attach(2);
  myservo.write(0); // Initial position
  
  Serial.println("Smart Parking System Ready!");
  Serial.println("Scan a card on either reader...");
  
  // Print authorized UIDs for reference
  Serial.println("Authorized UIDs:");
  Serial.println("1. BF 5A 87 1F");
  Serial.println("2. DF 34 89 1C");
}

void loop() {
  checkReader(rfid1, "entry");
  checkReader(rfid2, "exit");
}

void checkReader(MFRC522 &rfid, String readerType) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getUIDString(rfid);
    Serial.print(readerType + " - UID Tag: ");
    Serial.println(uid);
    
    // Check if card is authorized locally (as backup to server validation)
    bool isAuthorized = checkLocalAuthorization(rfid.uid.uidByte);
    if (isAuthorized) {
      Serial.println("Card authorized locally!");
    }
    
    // Send data to server for validation
    sendToServer(uid, readerType);
    
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}

String getUIDString(MFRC522 &rfid) {
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uidString += "0";
    }
    uidString += String(rfid.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();
  return uidString;
}

bool checkLocalAuthorization(byte* cardUID) {
  // Compare with first authorized UID
  bool match1 = true;
  for (byte i = 0; i < 4; i++) {
    if (cardUID[i] != authorizedUID1[i]) {
      match1 = false;
      break;
    }
  }
  
  // Compare with second authorized UID
  bool match2 = true;
  for (byte i = 0; i < 4; i++) {
    if (cardUID[i] != authorizedUID2[i]) {
      match2 = false;
      break;
    }
  }
  
  return match1 || match2;
}

void sendToServer(String uid, String readerType) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<200> doc;
    doc["uid"] = uid;
    doc["readerType"] = readerType;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println(response);

      // Parse server response
      DynamicJsonDocument responseDoc(1024);
      deserializeJson(responseDoc, response);
      
      if (responseDoc["authorized"]) {
        // Open gate for both entry and exit
        myservo.write(90);
        delay(3000);
        myservo.write(0);
      }
    } else {
      Serial.println("Error sending HTTP request: " + String(httpResponseCode));
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected");
    // Attempt to reconnect
    WiFi.begin(ssid, password);
  }
}