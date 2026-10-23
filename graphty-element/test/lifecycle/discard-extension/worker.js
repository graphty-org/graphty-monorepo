// Driven over the DevTools protocol by test/lifecycle/cdp-harness.ts: the tests evaluate
// chrome.tabs.query, chrome.tabs.discard and chrome.tabs.update in this worker.
self.addEventListener("install", () => self.skipWaiting());
