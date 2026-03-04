chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_IMAGE") {
    return;
  }

  const { url, filename } = message.payload || {};
  if (!url) {
    sendResponse({ ok: false, error: "URL ausente." });
    return;
  }

  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true,
      conflictAction: "uniquify",
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, downloadId });
    }
  );

  return true;
});
