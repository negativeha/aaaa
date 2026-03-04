const button = document.getElementById("download-main");
const status = document.getElementById("status");

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? "#b00020" : "#333";
};

const isAliExpressUrl = (url = "") => /https:\/\/[\w.-]*aliexpress\.com\//i.test(url);

const getActiveTab = async () => {
  if (!chrome?.tabs?.query) {
    throw new Error("API chrome.tabs indisponível. Reinstale a extensão e tente novamente.");
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = Array.isArray(tabs) ? tabs[0] : null;

  if (!tab?.id) {
    throw new Error("Aba ativa não encontrada.");
  }

  return tab;
};

const sendDownloadMessage = async (tabId) => {
  return chrome.tabs.sendMessage(tabId, { type: "DOWNLOAD_FROM_POPUP" });
};

const ensureContentScriptReady = async (tabId) => {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["styles.css"],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
};

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Procurando imagem na aba atual...");

  try {
    const tab = await getActiveTab();

    if (!isAliExpressUrl(tab.url)) {
      throw new Error("Abra uma página de produto do AliExpress para baixar a foto.");
    }

    let response;

    try {
      response = await sendDownloadMessage(tab.id);
    } catch (error) {
      const message = String(error?.message || error);
      const noReceiver =
        message.includes("Receiving end does not exist") ||
        message.includes("Could not establish connection");

      if (!noReceiver) {
        throw error;
      }

      setStatus("Preparando extensão na aba e tentando novamente...");
      await ensureContentScriptReady(tab.id);
      response = await sendDownloadMessage(tab.id);
    }

    if (!response?.ok) {
      throw new Error(response?.error || "Não foi possível baixar a imagem.");
    }

    setStatus("Download iniciado. Verifique a caixa de salvar arquivo.");
  } catch (error) {
    setStatus(error?.message || "Não consegui baixar a foto.", true);
    console.error("Falha no popup:", error);
  } finally {
    button.disabled = false;
  }
});
