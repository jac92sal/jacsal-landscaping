/* JacSal Services — booking widget embed.
 * Usage: <script src="https://jacsal-screening.pages.dev/embed.js" async></script>
 * Optional data attributes on the script tag:
 *   data-label="Book a Consultation"   button text
 *   data-target="some-element-id"      render the button inside that element (else floating)
 *   data-position="bottom-right|bottom-left"   floating position (default bottom-right)
 */
(function () {
  if (window.__jacsalBookingWidget) return;
  window.__jacsalBookingWidget = true;

  var script = document.currentScript ||
    document.querySelector('script[src*="embed.js"]');
  var origin = (function () {
    try { return new URL(script.src).origin; } catch (e) { return ""; }
  })();
  var cfg = (script && script.dataset) || {};
  var label = cfg.label || "Book a Consultation";
  var target = cfg.target || "";
  var position = cfg.position || "bottom-right";
  var portalUrl = origin + "/widget";

  var GRADIENT = "linear-gradient(90deg,#3b82f6,#2dd4bf)";

  function makeButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-label", label);
    btn.style.cssText = [
      "font-family:Inter,Segoe UI,Arial,sans-serif",
      "font-size:15px",
      "font-weight:600",
      "color:#06121f",
      "background:" + GRADIENT,
      "border:none",
      "border-radius:999px",
      "padding:12px 22px",
      "cursor:pointer",
      "box-shadow:0 8px 24px rgba(37,99,235,0.35)",
      "line-height:1",
      "display:inline-block",
    ].join(";");
    btn.addEventListener("mouseenter", function () { btn.style.filter = "brightness(1.05)"; });
    btn.addEventListener("mouseleave", function () { btn.style.filter = "none"; });
    btn.addEventListener("click", open);
    return btn;
  }

  var overlay = null;

  function open() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "jacsal-ov";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "jacsal-panel";

    var frame = document.createElement("iframe");
    frame.src = portalUrl;
    frame.title = "Book a Consultation";
    frame.className = "jacsal-frame";
    frame.setAttribute("allow", "clipboard-write");

    panel.appendChild(frame);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = "";
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  // The booking portal (/widget) posts this message when its close button is clicked.
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (d && d.source === "screening-widget" && d.type === "close") close();
  });

  function mount() {
    var style = document.createElement("style");
    style.textContent = [
      "@keyframes jacsalFade{from{opacity:0}to{opacity:1}}",
      // Overlay backdrop
      ".jacsal-ov{position:fixed;inset:0;background:rgba(3,7,18,0.72);" +
        "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);" +
        "display:flex;align-items:center;justify-content:center;padding:24px;" +
        "z-index:2147483000;animation:jacsalFade .18s ease-out}",
      // Desktop: large, roughly square panel so the flow fits without scrolling
      ".jacsal-panel{position:relative;width:min(960px,95vw);height:min(940px,94vh);" +
        "background:#0a0e1a;border-radius:16px;overflow:hidden;" +
        "box-shadow:0 24px 60px rgba(0,0,0,0.5)}",
      ".jacsal-frame{width:100%;height:100%;border:0;display:block}",
      // Mobile: full-screen, scrollable
      "@media (max-width:640px){.jacsal-ov{padding:0}" +
        ".jacsal-panel{width:100%;height:100%;border-radius:0}}",
    ].join("");
    document.head.appendChild(style);

    var btn = makeButton();
    var host = target ? document.getElementById(target) : null;
    if (host) {
      host.appendChild(btn);
    } else {
      btn.style.position = "fixed";
      btn.style.bottom = "24px";
      btn.style[position === "bottom-left" ? "left" : "right"] = "24px";
      btn.style.zIndex = "2147482000";
      document.body.appendChild(btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
