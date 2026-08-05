# IEC AAST App Data Manager

A fast, standalone desktop application built to streamline data entry, cross-reference student IDs, and manage academic scores. Built with React, Node.js, and Electron.

## 🚀 How to Use

This application is packaged as a single, portable executable. No complex installation or database configuration is required.

1. Download the latest `.exe` file from the Releases section.
2. Double-click the downloaded file.
3. Set up your Master Data file on the first run.
4. You're ready to go!

## ✨ Features

* **Automated Data Processing:** Seamlessly cross-reference daily student IDs and exam scores against your Master Data file without manual Excel entry.
* **Smart Master Sync:** Automatically injects processed scores and updates retake counters directly into your master tracking sheet.
* **Daily Operations Dashboard:** A highly visual, calendar-based interface to track exactly which days have been processed, skipped, or are missing data.
* **Comprehensive Audit Logs:** Built-in tracking system that logs every "ID Check", "Score Export", and daily override so you always have a historical record of system activity.
* **Modern UI/UX:** A sleek, glassmorphic design featuring animated modals, color-coded status badges, and optimistic UI updates for a lightning-fast experience.

## 🛠️ Built With

* **[Electron](https://www.electronjs.org/)** - Desktop application framework
* **[React](https://reactjs.org/)** - User interface & frontend state
* **[Node.js](https://nodejs.org/) & [MongoDB](https://www.mongodb.com/)** - Local backend and persistent storage
* **[Vite](https://vitejs.dev/)** - Lightning fast build tooling
