# 🖌️ IITM Annotator 
**Professional, Pixel-Perfect & SPA-Resilient Annotation Suite**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![Platform](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge%20%7C%20Firefox-orange.svg)]()

**IITM Annotator** is a high-performance browser extension designed specifically for students and professionals. Unlike basic annotation tools, it is built to handle modern Single Page Applications (SPAs) like the IITM LMS with zero-jitter, sticky scrolling, and mobile responsiveness.

---

## 🌟 Key Features

### 💎 Pixel-Perfect Precision
- **Zero-Jitter Engine**: Advanced coordinate resolution ensures your marks stay exactly where you put them, even on extremely long pages.
- **Rough.js Integration**: Beautiful, hand-drawn aesthetic for lines, rectangles, and circles.

### 🔄 SPA Resilience (Heartbeat System)
- Automatically detects DOM changes in React/Angular/Vue environments.
- Re-injects drawing layers instantly if the framework clears the page content.

### 📱 Mobile & Tablet Ready
- **Universal Touch Support**: Smooth drawing with finger or stylus.
- **Swipeable Toolbar**: Horizontal tool scrolling for narrow devices.
- **Palm Rejection**: Intelligent pointer tracking to ignore accidental touches.

### 💾 Persistent Workspace
- Drawings are automatically saved to `chrome.storage.local` based on the specific URL.
- Your notes remain ready exactly where you left them, even after browser restarts.

---

## 🚀 Installation (Developer Mode)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/simplearyan/IITM-Annotation-Extension.git
   ```
2. **Open Extensions Page**:
   - Go to `chrome://extensions/` in Chrome/Edge, or `about:debugging` in Firefox.
3. **Enable Developer Mode**:
   - Toggle the switch in the top-right corner.
4. **Load Unpacked**:
   - Click **Load Unpacked** and select the project folder.

---

## 🛠️ How to Use

1. **Activation**: Click the **Pen Icon (FAB)** in the bottom-right corner to toggle the whiteboard.
2. **Safety Mode**: The tool starts in **Cursor/Pointer Mode**. This allows you to interact with links and buttons without accidentally drawing.
3. **Drawing**: Choose a tool (Pen, Line, Rectangle, etc.) and start annotating.
4. **Settings**: Switch colors and stroke weights instantly via the glassmorphic toolbar.
5. **Clean Up**: Use the **Clear All** button for a fresh start with a non-blocking confirmation popover.

---

## 👨‍💻 About the Author

Built with ❤️ by **Aryan**.

- **GitHub**: [@simplearyan](https://github.com/simplearyan)
- **Portfolio**: [simplearyan.github.io](https://simplearyan.github.io)
- **YouTube**: [@SimpleAryan](https://youtube.com/@SimpleAryan)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
