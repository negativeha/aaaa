(() => {
  const processed = new WeakSet();

  const sanitizeFileName = (name) =>
    name
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "aliexpress-photo";

  const getHighResolutionUrl = (url) => {
    if (!url) return null;

    // Remove query string that sometimes contains thumbnail transformations.
    return url.split("?")[0];
  };

  const downloadImage = async (url, productName) => {
    try {
      const imageUrl = getHighResolutionUrl(url);
      if (!imageUrl) return;

      const extension = imageUrl.split(".").pop()?.split("#")[0] || "jpg";
      const filename = `${sanitizeFileName(productName)}-${Date.now()}.${extension}`;

      await chrome.runtime.sendMessage({
        type: "DOWNLOAD_IMAGE",
        payload: {
          url: imageUrl,
          filename,
        },
      });
    } catch (error) {
      console.error("Falha ao baixar imagem:", error);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const getProductName = () => {
    const heading =
      document.querySelector("h1") ||
      document.querySelector('[data-pl="product-title"]') ||
      document.querySelector('[class*="title"]');

    return heading?.textContent?.trim() || "aliexpress-photo";
  };

  const buildButton = (img) => {
    const wrapper = document.createElement("div");
    wrapper.className = "aepd-download-wrapper";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "aepd-download-button";
    button.textContent = "Baixar";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const src = img.currentSrc || img.src;
      downloadImage(src, getProductName());
    });

    wrapper.appendChild(button);
    return wrapper;
  };

  const injectButtons = () => {
    const selectors = [
      '[class*="image"] img',
      '[class*="gallery"] img',
      '[class*="sku"] img',
      'img[src*="alicdn.com"]',
    ];

    const images = document.querySelectorAll(selectors.join(","));

    images.forEach((img) => {
      if (processed.has(img)) return;
      if (!img.src || img.width < 80 || img.height < 80) return;

      const container = img.closest("li, div, figure") || img.parentElement;
      if (!container || container.querySelector(":scope > .aepd-download-wrapper")) {
        processed.add(img);
        return;
      }

      container.style.position = container.style.position || "relative";
      container.appendChild(buildButton(img));

      processed.add(img);
    });
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "AEPD_REFRESH") {
      injectButtons();
      sendResponse({ ok: true });
    }
  });

  const observer = new MutationObserver(() => injectButtons());
  observer.observe(document.body, { childList: true, subtree: true });

  injectButtons();
})();
