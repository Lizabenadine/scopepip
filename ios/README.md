# Scopepipe Room Scanner

Open `ScopepipeRoomScanner.xcodeproj` in Xcode on a Mac, select your signing team,
and run it on a LiDAR-equipped iPhone or iPad running iOS/iPadOS 17 or later.

1. Tap **Scan Room** and walk around one room, capturing its floor and walls.
2. Tap **Finish Scan**. Check the floor area and open **View 3D Model** to inspect the capture.
3. Tap **Export Measurements** and choose **Save to Files**.
4. In the Scopepipe Flooring Estimator, tap **Scan Room** beside **Add Room**.
   In refinishing, choose **Measure Rooms** first.
5. Pick the JSON file, confirm the floor area, and apply it to a new or existing room.
   Choose the existing Main Room to replace the starter dimensions when appropriate.
6. Save the estimate using Scopepipe's existing save flow.

The 3D model stays in the scanner. The exported JSON contains room dimensions,
gross floor area, and perimeter. Review the scan against a known measurement
before quoting. Set deductions, additions, material, and labor in the estimator.
Editing the imported length or width switches the room back to manual rectangular geometry.
