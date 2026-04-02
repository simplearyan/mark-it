# 📦 Releasing IITM Annotator 
**Store Submission & Packaging Guide**

This guide explains how to package and release the extension for major browser marketplaces.

---

## 🏗️ 1. Prepare for Release

1. **Verify `manifest.json`**:
   - Ensure the version number is incremented (e.g., `1.0.1`).
   - Check that all icon paths (`icons/icon16.png`, etc.) point to existing files.
2. **Icons**:
   - Create high-quality PNG icons for each required size:
     - `16x16` (Tab icon)
     - `48x48` (Extension management icon)
     - `128x128` (Store icon)
3. **Zipping the Project**:
   - Use a zip tool to compress the **entire project folder**.
   - **Exclude**: `.git/`, `.gitignore`, `RELEASING.md`, and any other internal docs if not needed in the store.

---

## 🌐 2. Chrome Web Store (CWS)

1. **Visit [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)**.
2. **Pay the Developer Fee** (One-time $5 fee if not already paid).
3. **Click "Add new item"** and upload your `project.zip` file.
4. **Product Details**:
   - **Title**: IITM Annotator
   - **Description**: (Use the description from `README.md`).
   - **Category**: Productivity / Education.
5. **Screenshots**:
   - Upload at least one `1280x800` or `640x400` screenshot of the annotator in action.
6. **Privacy**:
   - Declare that the extension **collects NO user data**.
7. **Submit for Review**. Review typically takes 24–72 hours.

---

## 🦊 3. Mozilla Firefox Add-ons (AMO)

1. **Visit [Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/)**.
2. **Create/Log into your account**.
3. **Click "Submit a New Add-on"**.
4. **Choose "On your own" or "On this site"**.
5. **Upload the ZIP**.
   - *Note*: Firefox supports Manifest V3 (MV3), but you might need to specify a `browser_specific_settings` key in the manifest for ID tracking.
6. **Self-Signing**:
   - If you choose "On your own," Mozilla will sign the XPI file for you to distribute manually.

---

## 🛠️ Multi-Browser Tools

- **[`web-ext`](https://github.com/mozilla/web-ext)** (Mozilla's CLI tool):
  - Use `web-ext lint` to check for cross-browser compatibility issues.
  - Use `web-ext build` to create a production-ready package.

---

## 🛡️ Privacy Policy (Standard)

*IITM Annotator respects user privacy. It operates entirely locally and does not collect, transmit, or store any personal data. All drawings are saved locally within the browser's sandbox.*
