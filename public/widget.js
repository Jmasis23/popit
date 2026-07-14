(function () {
  "use strict";

  var CURRENT_SCRIPT =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var siteId = CURRENT_SCRIPT.getAttribute("data-site");
  if (!siteId) {
    console.warn("[Popit] Missing data-site attribute on widget script tag.");
    return;
  }

  var origin = (function () {
    try {
      return new URL(CURRENT_SCRIPT.src).origin;
    } catch {
      return "";
    }
  })();

  var STYLE_ID = "popit-widget-style";
  var CONTAINER_ID = "popit-widget-container";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + CONTAINER_ID + "{position:fixed;z-index:2147483000;max-width:340px;" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
      ".popit-toast{background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.16);" +
      "padding:14px 16px;display:flex;gap:12px;align-items:flex-start;" +
      "opacity:0;transform:translateY(16px);transition:opacity .35s ease,transform .35s ease;" +
      "cursor:pointer;border:1px solid rgba(0,0,0,.06);}" +
      ".popit-toast.popit-visible{opacity:1;transform:translateY(0);}" +
      ".popit-avatar{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:#4f46e5;" +
      "color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;" +
      "font-size:15px;object-fit:cover;}" +
      ".popit-body{min-width:0;}" +
      ".popit-header{display:flex;align-items:center;gap:6px;margin-bottom:2px;}" +
      ".popit-name{font-weight:600;font-size:13.5px;color:#111827;white-space:nowrap;" +
      "overflow:hidden;text-overflow:ellipsis;max-width:150px;}" +
      ".popit-stars{color:#f5a623;font-size:12px;letter-spacing:1px;white-space:nowrap;}" +
      ".popit-text{font-size:13px;line-height:1.35;color:#4b5563;" +
      "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}" +
      ".popit-badge{font-size:10.5px;color:#9ca3af;margin-top:6px;display:flex;align-items:center;gap:4px;}" +
      ".popit-close{position:absolute;top:6px;right:8px;border:none;background:transparent;" +
      "color:#9ca3af;font-size:14px;cursor:pointer;line-height:1;padding:2px;}" +
      ".popit-toast{position:relative;}" +
      "@media(max-width:480px){#" + CONTAINER_ID + "{max-width:calc(100vw - 24px);}}";
    document.head.appendChild(style);
  }

  function positionStyles(position) {
    var styles = { position: "fixed" };
    if (position === "bottom-right") {
      styles.bottom = "20px";
      styles.right = "20px";
    } else if (position === "top-left") {
      styles.top = "20px";
      styles.left = "20px";
    } else if (position === "top-right") {
      styles.top = "20px";
      styles.right = "20px";
    } else {
      styles.bottom = "20px";
      styles.left = "20px";
    }
    return styles;
  }

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function starString(rating) {
    var full = Math.round(rating);
    return "★★★★★".slice(0, full) +
      "☆☆☆☆☆".slice(0, 5 - full);
  }

  function buildToast(review, businessName) {
    var toast = document.createElement("div");
    toast.className = "popit-toast";

    var avatar;
    if (review.authorPhotoUrl) {
      avatar = document.createElement("img");
      avatar.className = "popit-avatar";
      avatar.src = review.authorPhotoUrl;
      avatar.referrerPolicy = "no-referrer";
      avatar.alt = review.authorName;
    } else {
      avatar = document.createElement("div");
      avatar.className = "popit-avatar";
      avatar.textContent = initials(review.authorName);
    }

    var body = document.createElement("div");
    body.className = "popit-body";

    var header = document.createElement("div");
    header.className = "popit-header";
    var name = document.createElement("span");
    name.className = "popit-name";
    name.textContent = review.authorName;
    var stars = document.createElement("span");
    stars.className = "popit-stars";
    stars.textContent = starString(review.rating);
    header.appendChild(name);
    header.appendChild(stars);

    var text = document.createElement("div");
    text.className = "popit-text";
    text.textContent = review.text || "";

    var badge = document.createElement("div");
    badge.className = "popit-badge";
    var platformLabel = review.platformLabel || "Google";
    badge.textContent =
      "✓ Verified " + platformLabel + " review" +
      (businessName ? " · " + businessName : "");

    var close = document.createElement("button");
    close.className = "popit-close";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    close.addEventListener("click", function (e) {
      e.stopPropagation();
      hideToast(toast);
    });

    body.appendChild(header);
    body.appendChild(text);
    body.appendChild(badge);
    toast.appendChild(avatar);
    toast.appendChild(body);
    toast.appendChild(close);

    return toast;
  }

  function hideToast(toast) {
    toast.classList.remove("popit-visible");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  function fetchConfig() {
    return fetch(origin + "/api/widget/reviews/" + encodeURIComponent(siteId))
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load reviews");
        return res.json();
      });
  }

  function start(config) {
    if (!config.reviews || config.reviews.length === 0) return;

    injectStyles();

    var container = document.createElement("div");
    container.id = CONTAINER_ID;
    var pos = positionStyles(config.position);
    for (var key in pos) container.style[key] = pos[key];
    document.body.appendChild(container);

    var index = 0;
    var intervalMs = Math.max(4, config.intervalSeconds || 8) * 1000;
    var visibleMs = intervalMs - 1200;

    function showNext() {
      container.innerHTML = "";
      var review = config.reviews[index % config.reviews.length];
      index++;

      var toast = buildToast(review, config.businessName);
      container.appendChild(toast);
      requestAnimationFrame(function () {
        toast.classList.add("popit-visible");
      });

      setTimeout(function () {
        hideToast(toast);
      }, visibleMs);
    }

    setTimeout(showNext, 1500);
    setInterval(showNext, intervalMs);
  }

  fetchConfig().then(start).catch(function (err) {
    console.warn("[Popit] widget failed to load:", err.message);
  });
})();
