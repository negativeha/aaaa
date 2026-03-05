(() => {
  const MIN_SIZE = 120;
  const MIN_SIZE_KNOWN_SELECTOR = 60;
  const URL_PATTERN = /(alicdn\.com|aliexpress\.)/i;
  const BLOCKED_HINTS = /(cart|carrinho|logo|icon|avatar|store|ship|frete|payment|footer|header)/i;
  const PRODUCT_IMAGE_SELECTORS = [
    ".image-view-v2--previewWrap img",
    ".image-view-v2--previewBox img",
    ".magnifier--wrap img",
    ".pdp-info-left img",
    "div.pdp-info-left img",
  ];

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

  const isDownloadable = (url) => Boolean(url && URL_PATTERN.test(url));

  const getImageUrl = (img) => {
    const candidates = [
      img.currentSrc,
      img.src,
      img.getAttribute("data-src"),
      img.getAttribute("data-zoom-image"),
      img.getAttribute("data-srcset")?.split(",")?.[0]?.trim()?.split(" ")?.[0],
    ];

    for (const candidate of candidates) {
      const normalized = normalizeUrl(candidate);
      if (isDownloadable(normalized)) {
        return normalized;
      }
    }

    return null;
  };

  const isLargeEnough = (rect, minSize = MIN_SIZE) => rect.width >= minSize && rect.height >= minSize;

  const isLikelyProductImage = (img, options = {}) => {
    const rect = img.getBoundingClientRect();
    const minSize = options.allowKnownSmall ? MIN_SIZE_KNOWN_SELECTOR : MIN_SIZE;
    if (!isLargeEnough(rect, minSize)) return false;

    const hint = `${img.alt || ""} ${img.className || ""} ${img.id || ""}`;
    if (BLOCKED_HINTS.test(hint)) return false;

    const src = getImageUrl(img);
    if (!src) return false;

    return true;
  };

  const findKnownProductImage = () => {
    for (const selector of PRODUCT_IMAGE_SELECTORS) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLImageElement && isLikelyProductImage(element, { allowKnownSmall: true })) {
        return element;
      }
    }

    return null;
  };

  const placeButtonNearImage = (button, rect) => {
    const x = Math.min(window.innerWidth - 120, Math.max(8, rect.right - 95));
    const y = Math.min(window.innerHeight - 40, Math.max(8, rect.top + 8));
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
  };

  const findImageFromPath = (path) => {
    for (const node of path) {
      if (!(node instanceof Element)) continue;

      if (node instanceof HTMLImageElement && isLikelyProductImage(node, { allowKnownSmall: true })) {
        return node;
      }

      const nested = node.querySelector?.("img");
      if (nested instanceof HTMLImageElement && isLikelyProductImage(nested, { allowKnownSmall: true })) {
        return nested;
      }
    }

    return findKnownProductImage();
  };

  const guessMainProductImage = () => {
    const knownImage = findKnownProductImage();
    if (knownImage) {
      return getImageUrl(knownImage);
    }

    const images = Array.from(document.querySelectorAll("img"));

    const candidates = images
      .map((img) => {
        if (!isLikelyProductImage(img)) return null;

        const rect = img.getBoundingClientRect();
        const area = Math.max(0, rect.width) * Math.max(0, rect.height);
        const centerPenalty = Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2);
        const galleryBoost = /(gallery|swiper|thumb|image-view|sku|magnifier|pdp-main-image|preview)/i.test(
          `${img.className} ${img.closest('[class*="gallery"], [class*="image"], [class*="sku"], [class*="preview"]')?.className || ""}`
        )
          ? 50000
          : 0;

        const score = area - centerPenalty + galleryBoost;
        return { url: getImageUrl(img), score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.url || null;
  };

  const requestDownload = async (url) => {
    if (!url) return { ok: false, error: "Nenhuma foto do anúncio encontrada" };

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
  button.title = "Baixar foto do anúncio";
  button.style.display = "none";

  const showButtonForImage = (img) => {
    const mediaUrl = getImageUrl(img);
    if (!mediaUrl) return;

    activeMediaUrl = mediaUrl;
    placeButtonNearImage(button, img.getBoundingClientRect());
    button.style.display = "inline-flex";
  };

  const hideButton = () => {
    activeMediaUrl = null;
    button.style.display = "none";
  };

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!activeMediaUrl) {
      const fallback = guessMainProductImage();
      if (!fallback) return;
      activeMediaUrl = fallback;
    }

    const result = await requestDownload(activeMediaUrl);
    if (!result.ok) {
      console.error("Falha ao baixar foto:", result.error);
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "DOWNLOAD_FROM_POPUP") return;

    const preferred = activeMediaUrl || guessMainProductImage();
    requestDownload(preferred).then(sendResponse);
    return true;
  });

  document.documentElement.appendChild(button);

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.target === button) return;

      const path = event.composedPath?.() || [event.target];
      const image = findImageFromPath(path);

      if (!image) {
        hideButton();
        return;
      }

      showButtonForImage(image);
    },
    true
  );

  document.addEventListener(
    "scroll",
    () => {
      hideButton();
    },
    true
  );
})();
