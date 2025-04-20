# ESP32 Smart Parking System

## Project Overview
This Smart Parking System is an IoT-based solution that automates and secures vehicle access management through RFID authentication. The system features dual RFID readers to monitor both entry and exit points, with real-time data visualization and comprehensive logging capabilities along with real-time parking slot detection using OpenCV. It manages RFID authentication for both entry and exit points, communicates with a backend server, and controls the gate mechanism using a servo motor. This project provides both secure access management and efficient space utilization monitoring.

## Hardware Components
- ESP32 microcontroller
- 2× RFID-RC522 readers (entry and exit)
- 1× Servo motor (gate control)
- Connecting wires
- Power supply
- ESP32 CAM

## Features
- Dual RFID reader support for separate entry/exit tracking
- WiFi connectivity for real-time server communication
- JSON-based data exchange with the backend
- Separate monitoring for entry and exit
- Instant updates on the web interface when vehicles enter or exit
- Complete records of all entry and exit events
- Option to download entry and exit logs for analysis
- Automatic gate control based on authorization results
- Error handling for network disconnection
- Real time parking slot detection

## Technical Details

### Pin Connections
Based on the code, the components are connected to the ESP32 as follows:

#### RFID Reader 1 (Entry)
- SS/SDA: GPIO 5
- RST: GPIO 22
- MOSI: Connected to ESP32's MOSI (GPIO 23)
- MISO: Connected to ESP32's MISO (GPIO 19)
- SCK: Connected to ESP32's SCK (GPIO 18)
- VCC: 3.3V
- GND: GND

#### RFID Reader 2 (Exit)
- SS/SDA: GPIO 4
- RST: GPIO 21
- MOSI: Connected to ESP32's MOSI (GPIO 23)
- MISO: Connected to ESP32's MISO (GPIO 19)
- SCK: Connected to ESP32's SCK (GPIO 18)
- VCC: 3.3V
- GND: GND

#### Servo Motor
- Signal: GPIO 2
- VCC: Vin (Use external power supply for better performance)
- GND: GND

### Communication Flow
- The system continuously monitors both RFID readers
- When a tag is detected, its UID is read and sent to the server along with the reader type (entry/exit)
- The server validates the UID against the database
- If authorized, the servo motor activates to open the gate for 3 seconds
- All events are logged on the server for reporting and analytics
  
### Computer Vision Module
The system employs OpenCV for image processing to:
- Process camera feeds from the parking area
- Apply image segmentation to identify individual parking spaces
- Use contour detection and color thresholding to determine if spaces are occupied
- Update the central database with real-time occupancy information
- Generate a visual map of available parking slots for display on the web interface
