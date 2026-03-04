(() => {
  const MIN_SIZE = 80;
  let activeImage = null;

  const sanitizeFileName = (name) =>
    name
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "aliexpress-photo";

  const getDownloadableUrl = (url) => {
    if (!url) return null;
    return url.split("?")[0];
  };

  const getProductName = () => {
    const heading =
      document.querySelector("h1") ||
      document.querySelector('[data-pl="product-title"]') ||
      document.querySelector('[class*="title"]');

    return heading?.textContent?.trim() || "aliexpress-photo";
  };

  const button = document.createElement("button");
  button.type = "button";
  button.className = "aepd-floating-download-button";
  button.textContent = "Baixar foto";
  button.title = "Baixar imagem selecionada";
  button.style.display = "none";

  const positionButton = (img) => {
    if (!img || !img.isConnected) {
      button.style.display = "none";
      activeImage = null;
      return;
    }

    const rect = img.getBoundingClientRect();
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      button.style.display = "none";
      return;
    }

    const top = Math.max(8, rect.top + 8);
    const left = Math.max(8, rect.right - button.offsetWidth - 8);

    button.style.top = `${top + window.scrollY}px`;
    button.style.left = `${left + window.scrollX}px`;
    button.style.display = "inline-flex";
    activeImage = img;
  };

  const isAliExpressImage = (img) => {
    const source = img.currentSrc || img.src || "";
    return /alicdn\.com|aliexpress\./i.test(source);
  };

  const maybeActivateForTarget = (target) => {
    const img = target?.closest?.("img");
    if (!img) return;
    if (!isAliExpressImage(img)) return;
    if (!img.src && !img.currentSrc) return;

    positionButton(img);
  };

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!activeImage) return;

    const rawUrl = activeImage.currentSrc || activeImage.src;
    const url = getDownloadableUrl(rawUrl);
    if (!url) return;

    const extension = url.split(".").pop()?.split("#")[0] || "jpg";
    const filename = `${sanitizeFileName(getProductName())}-${Date.now()}.${extension}`;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_IMAGE",
        payload: { url, filename },
      });

      if (!response?.ok) {
        console.error("Falha no download:", response?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Falha ao baixar imagem:", error);
    }
  });

  document.documentElement.appendChild(button);

  document.addEventListener(
    "pointermove",
    (event) => {
      maybeActivateForTarget(event.target);
    },
    true
  );

  document.addEventListener(
    "scroll",
    () => {
      if (activeImage) positionButton(activeImage);
    },
    true
  );

  window.addEventListener("resize", () => {
    if (activeImage) positionButton(activeImage);
  });

  document.addEventListener(
    "click",
    (event) => {
      maybeActivateForTarget(event.target);
    },
    true
  );
})();
