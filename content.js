(() => {
  const MIN_SIZE = 80;
  const POPUP_MIN_SIDE = 220;
  const URL_PATTERN = /(alicdn\.com|aliexpress\.)/i;
  const DISALLOWED_URL_KEYWORDS = ["cart", "icon", "sprite", "logo", "avatar", "coupon", "placeholder"];

  let activeMediaUrl = null;
  let activeAnchorElement = null;

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

  const isLargeEnough = (element, min = MIN_SIZE) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= min && rect.height >= min;
  };

  const hasValidExtension = (url) => /\.(jpe?g|png|webp|avif)(?:$|#)/i.test(url);

  const hasDisallowedKeyword = (url) => {
    const lower = url.toLowerCase();
    return DISALLOWED_URL_KEYWORDS.some((word) => lower.includes(word));
  };

  const isDownloadable = (url) => {
    if (!url) return false;
    return URL_PATTERN.test(url) && hasValidExtension(url) && !hasDisallowedKeyword(url);
  };

  const findMediaFromPath = (path) => {
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      if (node instanceof HTMLImageElement) {
        const source = normalizeUrl(node.currentSrc || node.src);
        if (source && isDownloadable(source) && isLargeEnough(node)) {
          return { url: source, element: node };
        }
      }

      const bgUrl = normalizeUrl(parseBackgroundImageUrl(getComputedStyle(node).backgroundImage));
      if (bgUrl && isDownloadable(bgUrl) && isLargeEnough(node, 160)) {
        return { url: bgUrl, element: node };
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
      if (rect.width < POPUP_MIN_SIDE || rect.height < POPUP_MIN_SIDE) return;

      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      const isInViewport = rect.bottom > 0 && rect.right > 0;
      const yBias = rect.top < window.innerHeight * 0.8 ? 1.2 : 1;
      const visibilityBias = isInViewport ? 1.1 : 1;

      candidates.push({
        url: source,
        score: area * yBias * visibilityBias,
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.url || null;
  };

  const requestDownload = async (url) => {
    if (!url) return { ok: false, error: "Nenhuma URL de foto do anúncio encontrada" };

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

  const positionButtonNearElement = (element) => {
    const rect = element.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 8, Math.max(8, rect.right - 8));
    const top = Math.max(8, rect.top + 8);
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.transform = "translateX(-100%)";
  };

  const showButton = (target) => {
    activeMediaUrl = target.url;
    activeAnchorElement = target.element;
    positionButtonNearElement(target.element);
    button.style.display = "inline-flex";
  };

  const hideButton = () => {
    activeMediaUrl = null;
    activeAnchorElement = null;
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
    if (message?.type !== "DOWNLOAD_FROM_POPUP") return;

    const preferred = activeMediaUrl || guessMainImage();
    requestDownload(preferred).then(sendResponse);
    return true;
  });

  document.documentElement.appendChild(button);

  document.addEventListener(
    "pointermove",
    (event) => {
      const path = event.composedPath?.() || [event.target];
      const media = findMediaFromPath(path);

      if (!media) {
        if (event.target !== button) hideButton();
        return;
      }

      showButton(media);
    },
    true
  );

  window.addEventListener("scroll", () => {
    if (activeAnchorElement && button.style.display !== "none") {
      positionButtonNearElement(activeAnchorElement);
    }
  });

  document.addEventListener(
    "pointerleave",
    () => {
      hideButton();
    },
    true
  );
})();
