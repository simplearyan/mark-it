/**
 * IITM Annotation Extension - Background Service Worker (V2)
 * Robust messaging for Stable Connection
 */

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith("chrome://")) return;

  try {
    // 1. Try to "Ping" the content script
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_whiteboard" });
  } catch (err) {
    // 2. If it fails, the script is missing. Inject it!
    console.log("Markit: Script missing on tab. Auto-injecting...");
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["libs/rough.js", "content.js"]
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["styles.css"]
      });

      // 3. Now send the toggle message again
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tab.id, { action: "toggle_whiteboard" });
      }, 100);
      
    } catch (injectionErr) {
      console.error("Markit: Injection failed:", injectionErr);
    }
  }
});
