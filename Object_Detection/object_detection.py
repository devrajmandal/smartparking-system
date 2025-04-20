import cv2
import pickle
import cvzone
import numpy as np

# Replace with your ESP32-CAM IP
esp32_cam_url = "http://192.168.137.97:81/stream"  # Default port is 81

# Video feed from ESP32-CAM
cap = cv2.VideoCapture(esp32_cam_url)

# Load parking positions
with open('CarParkPos', 'rb') as f:
    posList = pickle.load(f)

width, height = 130,220

def checkParkingSpace(imgPro):
    spaceCounter = 0
    for pos in posList:
        x, y = pos
        imgCrop = imgPro[y:y+height, x:x+width]
        count = cv2.countNonZero(imgCrop)
        cvzone.putTextRect(img, str(count), (x, y+height-3), scale=1, thickness=2, offset=0, colorR=(0, 0, 255))

        if count < 3500:
            color = (0, 255, 0)  # Green (empty)
            thickness = 5
            spaceCounter += 1
        else:
            color = (0, 0, 255)  # Red (occupied)
            thickness = 2
        cv2.rectangle(img, pos, (pos[0] + width, pos[1] + height), color, thickness)
    cvzone.putTextRect(img, f'Free: {spaceCounter}/{len(posList)}', (100, 50), scale=3, thickness=5, offset=20, colorR=(0, 200, 0))

while True:
    success, img = cap.read()
    if not success:
        print("Failed to read from stream. Reconnecting...")
        cap.release()
        cap = cv2.VideoCapture(esp32_cam_url)  # Reconnect
        continue

    # Image processing
    imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)
    imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 16)
    imgMedian = cv2.medianBlur(imgThreshold, 5)
    kernel = np.ones((3, 3), np.uint8)
    imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

    checkParkingSpace(imgDilate)

    cv2.imshow("ESP32-CAM Parking Detection", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()