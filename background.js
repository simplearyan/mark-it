/**
 * IITM Annotation Extension - Background Service Worker (V2)
 * Robust messaging for Stable Connection
 */

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Try sending a message to see if content script is already there
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_whiteboard" });
  } catch (err) {
    // If it fails (Receiving end does not exist), inject it again or notify user
    console.warn("IITM Annotator: Connection failed. Attempting to ensure script presence.", err);
    
    // We can't easily re-inject 'rough.js' via background since it's a content script asset,
    // but we can ask the user to refresh the page as a safe fallback.
    // For MV3, we can also try scripting.executeScript if necessary, but refresh is safest.
  }
});
