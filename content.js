(() => {
  const MIN_SIZE = 80;
  const URL_PATTERN = /(alicdn\.com|aliexpress\.)/i;
  let activeMediaUrl = null;

  const sanitizeFileName = (name) =>
    name
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "aliexpress-photo";

  const normalizeUrl = (url) => {
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

  const parseBackgroundImageUrl = (value) => {
    if (!value || value === "none") return null;
    const match = value.match(/url\((['"]?)(.*?)\1\)/i);
    return match?.[2] || null;
  };

  const isLargeEnough = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= MIN_SIZE && rect.height >= MIN_SIZE;
  };

  const findMediaUrlFromPath = (path) => {
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      if (node instanceof HTMLImageElement) {
        const source = normalizeUrl(node.currentSrc || node.src);
        if (source && URL_PATTERN.test(source) && isLargeEnough(node)) {
          return source;
        }
      }

      const bgUrl = normalizeUrl(parseBackgroundImageUrl(getComputedStyle(node).backgroundImage));
      if (bgUrl && URL_PATTERN.test(bgUrl) && isLargeEnough(node)) {
        return bgUrl;
      }
    }

    return null;
  };

  const button = document.createElement("button");
  button.type = "button";
  button.className = "aepd-floating-download-button";
  button.textContent = "Baixar foto";
  button.title = "Baixar imagem selecionada";
  button.style.display = "none";

  const showButton = (clientX, clientY, mediaUrl) => {
    activeMediaUrl = mediaUrl;
    button.style.left = `${Math.max(8, clientX + 12)}px`;
    button.style.top = `${Math.max(8, clientY + 12)}px`;
    button.style.display = "inline-flex";
  };

  const hideButton = () => {
    activeMediaUrl = null;
    button.style.display = "none";
  };

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!activeMediaUrl) return;

    const extension = activeMediaUrl.split(".").pop()?.split("#")[0] || "jpg";
    const filename = `${sanitizeFileName(getProductName())}-${Date.now()}.${extension}`;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_IMAGE",
        payload: { url: activeMediaUrl, filename },
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
      const path = event.composedPath?.() || [event.target];
      const mediaUrl = findMediaUrlFromPath(path);

      if (!mediaUrl) {
        if (event.target !== button) hideButton();
        return;
      }

      showButton(event.clientX, event.clientY, mediaUrl);
    },
    true
  );

  document.addEventListener(
    "pointerleave",
    () => {
      hideButton();
    },
    true
  );
})();
