chrome.runtime.onInstalled.addListener(() => {
  console.log('CyberCoach Pro Extension Installed/Updated (v3.0 - AI Analysis & Highlighting)');
  // Set default preference for highlighting maybe?
  chrome.storage.local.set({ highlightingEnabled: true });
});

// Listen for messages if needed later (e.g., from options page)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message (not handled):", message);
  // Example: Handle API key saving from an options page
  // if (message.action === "saveApiKey" && message.apiKey) {
  //   chrome.storage.local.set({ geminiApiKey: message.apiKey }, () => {
  //     console.log("API Key saved via background.");
  //     sendResponse({ success: true });
  //   });
  //   return true; // Indicates asynchronous response
  // }
});