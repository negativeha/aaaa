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

  const isDownloadable = (url) => {
    if (!url) return false;
    return URL_PATTERN.test(url);
  };

  const findMediaUrlFromPath = (path) => {
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      if (node instanceof HTMLImageElement) {
        const source = normalizeUrl(node.currentSrc || node.src);
        if (source && isDownloadable(source) && isLargeEnough(node)) {
          return source;
        }
      }

      const bgUrl = normalizeUrl(parseBackgroundImageUrl(getComputedStyle(node).backgroundImage));
      if (bgUrl && isDownloadable(bgUrl) && isLargeEnough(node)) {
        return bgUrl;
      }
    }

    return null;
  };

  const guessMainImage = () => {
    const candidates = [];

    document.querySelectorAll("img").forEach((img) => {
      const source = normalizeUrl(img.currentSrc || img.src);
      if (!isDownloadable(source)) return;
      const rect = img.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      candidates.push({ url: source, score: area });
    });

    document.querySelectorAll("*").forEach((el) => {
      const bgUrl = normalizeUrl(parseBackgroundImageUrl(getComputedStyle(el).backgroundImage));
      if (!isDownloadable(bgUrl)) return;
      const rect = el.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area < MIN_SIZE * MIN_SIZE) return;
      candidates.push({ url: bgUrl, score: area });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.url || null;
  };

  const requestDownload = async (url) => {
    if (!url) return { ok: false, error: "Nenhuma URL encontrada" };

    const extension = url.split(".").pop()?.split("#")[0] || "jpg";
    const filename = `${sanitizeFileName(getProductName())}-${Date.now()}.${extension}`;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_IMAGE",
        payload: { url, filename },
      });

      return response?.ok ? { ok: true } : { ok: false, error: response?.error || "Erro desconhecido" };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
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

    const result = await requestDownload(activeMediaUrl);
    if (!result.ok) {
      console.error("Falha ao baixar imagem:", result.error);
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "DOWNLOAD_FROM_POPUP") {
      return;
    }

    const preferred = activeMediaUrl || guessMainImage();
    requestDownload(preferred).then(sendResponse);
    return true;
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
