chrome.runtime.onInstalled.addListener(() => {
  console.log('CyberCoach Extension Installed/Updated (v2.0 - Local Analysis)');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message (not handled):", message);
});