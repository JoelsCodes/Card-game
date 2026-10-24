# Triple Triad: Final Fantasy Edition - Mobile App

Your Triple Triad card game is now set up as a **Progressive Web App (PWA)** that you can install on your phone!

## 🚀 Quick Start

### Option 1: Run Locally (Recommended for PC/Mac)

```bash
cd Card-game
python3 serve.py
```

Then open `http://localhost:8000` in your browser.

### Option 2: Use a Simple Python Server

```bash
python3 -m http.server 8000
```

## 📱 Installing on Your Phone

### iPhone (iOS)
1. Open Safari and go to `http://<your-computer-ip>:8000`
2. Tap the **Share** button
3. Select **Add to Home Screen**
4. Name it "Triple Triad" and tap **Add**
5. The app appears on your home screen!

### Android
1. Open Chrome and go to `http://<your-computer-ip>:8000`
2. Tap the **menu** (three dots)
3. Select **"Install app"** or **"Add to Home Screen"**
4. Confirm the installation
5. The app appears on your home screen!

## 🖥️ Finding Your Computer's IP Address

**On Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows (PowerShell):**
```powershell
ipconfig | findstr IPv4
```

Look for an address like `192.168.1.x` or `10.0.0.x`

## ✨ Features

- ✅ Works offline after first load
- ✅ Feels like a native app
- ✅ Updates automatically when you refresh
- ✅ Fully editable by Claude
- ✅ No installation required - just web standards

## 🔄 Updating the Game

Whenever Claude makes changes to the files, just:
1. Save the changes to the repo
2. The app auto-reloads on refresh
3. On your phone, pull down to refresh or close/reopen the app

## 📝 Project Structure

```
Card-game/
├── index.html          # Main game file (code only; images and music are in assets/)
├── assets/             # Card, sprite and art images and the Original music track (content-hashed names)
├── assets-manifest.json # List of assets/ files the app keeps cached offline
├── scripts/make-asset-manifest.js # Rebuild assets-manifest.json after adding or removing assets
├── manifest.json       # PWA configuration
├── service-worker.js   # Offline support
├── serve.py           # Local development server
└── README.md          # This file
```

## 🛠️ Development

To edit the game:
- Modify `index.html` directly
- Refresh your browser to see changes
- On your phone app, pull down to refresh

## 📚 How PWA Works

- **Service Worker**: Caches your game so it works offline
- **Manifest**: Makes it installable and configurable
- **Web Standards**: No native app framework needed - just HTML/CSS/JS

Enjoy your card game! 🎮
