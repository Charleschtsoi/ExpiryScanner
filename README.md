# ExpiryScanner

ExpiryScanner is a React Native mobile application built with Expo. It allows users to scan product barcodes to instantly check their expiration status.

Currently, this project is an **MVP (Minimum Viable Product)** that demonstrates the core scanning logic using the device camera and a local mock database.

## 🚀 Features

- **Fast Scanning:** Instantly reads QR codes, EAN13, and UPC barcodes using `expo-camera`.
- **Visual Feedback:** Clear UI indicators for "Safe" (Green) vs. "Expired" (Red) products.
- **Mock Data Integration:** Simulates database lookups for immediate testing without a backend.
- **Permission Handling:** Built-in flows for requesting camera access.

## 🛠 Tech Stack

- **Framework:** React Native
- **Platform:** Expo (SDK 53+)
- **Camera:** `expo-camera`
- **Language:** JavaScript/JSX

## 📦 Installation

**Clone the repository**
   ```bash
   git clone https://github.com/charleschtsoi/ExpiryScanner.git
   cd ExpiryScanner```

Install dependencies

```bash
npm install
```

Install the Camera package
(Required for the scanning functionality)

```
bash
npx expo install expo-camera
```

📱 How to Run
Start the Expo development server:

```bash
npx expo start
```
Run on your device:

Download the Expo Go app from the App Store (iOS) or Google Play (Android).
https://expo.dev/go 

Scan the QR code displayed in your terminal.

🧪 How to Test (Mock Database)

Since this MVP uses a local MOCK_DATABASE inside App.js, it will only recognize specific test codes.

Test Codes:

123456789: Returns "Milk" (Expires in 2 days) - Green UI
987654321: Returns "Yogurt" (Expired) - Red UI
111222333: Returns "Canned Beans" (Safe) - Green UI

Real Barcodes:

If you scan a real product barcode (e.g., a soda can), the app will detect the code but display "Unknown Product" because it is not yet in the mock database.

🔮 Future Roadmap
 Connect to a real backend API (Node.js/Firebase) for live product data.
 Add "Add Product" functionality to save new items to the database.
 Implement Push Notifications for expiring items.
 User Authentication.
 
📝 Configuration Notes
If you encounter warnings regarding the "New Architecture," ensure your app.json does not contain "newArchEnabled": false if you are using Expo SDK 53 or higher.

Author: Charles T
