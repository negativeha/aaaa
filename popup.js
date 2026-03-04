const button = document.getElementById("download-main");
const status = document.getElementById("status");

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? "#b00020" : "#333";
};

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Procurando imagem na aba atual...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error("Aba ativa não encontrada.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "DOWNLOAD_FROM_POPUP" });

    if (!response?.ok) {
      throw new Error(response?.error || "Não foi possível baixar a imagem.");
    }

    setStatus("Download iniciado. Verifique a caixa de salvar arquivo.");
  } catch (error) {
    setStatus(
      "Não consegui baixar. Abra uma página de produto do AliExpress e recarregue a aba.",
      true
    );
    console.error(error);
  } finally {
    button.disabled = false;
  }
});
