/* ============================================================
   PocketCorp — Cargador de contenido editable
   Lee content.json (lo que ven los visitantes) + un borrador
   local (lo que estás probando), y lo aplica al sitio.
   También arma los links de WhatsApp y de redes sociales.
   ============================================================ */
(function () {
  // Base de rutas: la landing usa ".", las páginas de directores usan ".."
  var thisScript = document.currentScript;
  var BASE = (thisScript && thisScript.getAttribute("data-base")) || ".";

  // Valores por defecto (si content.json no carga, el sitio igual funciona)
  var DEFAULTS = {
    global: {
      waNumber: "59169542275",
      waMsg: "Hola PocketCorp 👋 Quiero automatizar mi negocio con mi equipo de IA. ¿Cómo empiezo?"
    },
    analytics: { metaPixelId: "", ga4Id: "", gtmId: "" },
    social: { instagram: "", facebook: "", tiktok: "" }
  };

  var DRAFT_KEY = "pocketcorp_content_draft";

  function deepMerge(base, over) {
    if (!over || typeof over !== "object") return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) {
        out[k] = deepMerge(base && base[k] ? base[k] : {}, over[k]);
      } else {
        out[k] = over[k];
      }
    });
    return out;
  }

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o && o[k] != null ? o[k] : undefined;
    }, obj);
  }

  // *texto* -> <span class="pill-word">texto</span>  (solo para campos "rich")
  function richText(str) {
    var safe = String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return safe.replace(/\*([^*]+)\*/g, '<span class="pill-word">$1</span>');
  }

  // ── Analítica / seguimiento ──────────────────────────────
  // Inyecta los píxeles SOLO si hay un ID configurado en el Panel de
  // Admin (content.json → analytics). Sin IDs, no se carga nada y el
  // sitio funciona igual. pcTrack() manda los eventos a lo que esté
  // presente (Meta Pixel, GA4, Google Tag Manager) sin romper si falta.
  function injectMetaPixel(id) {
    if (!id || window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }
  function injectGA4(id) {
    if (!id || window.__pcGA) return;
    window.__pcGA = true;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
  function injectGTM(id) {
    if (!id || window.__pcGTM) return;
    window.__pcGTM = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  function setupAnalytics(a) {
    a = a || {};
    try { injectMetaPixel(String(a.metaPixelId || '').trim()); } catch (e) {}
    try { injectGA4(String(a.ga4Id || '').trim()); } catch (e) {}
    try { injectGTM(String(a.gtmId || '').trim()); } catch (e) {}
  }
  // Manda un evento a todas las analíticas presentes. Seguro si no hay ninguna.
  window.pcTrack = function (eventName, params) {
    params = params || {};
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: eventName }, params));
    } catch (e) {}
    try { if (typeof window.gtag === 'function') window.gtag('event', eventName, params); } catch (e) {}
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'WhatsAppClick', params);
        window.fbq('track', 'Contact', params); // evento estándar de conversión
      }
    } catch (e) {}
  };

  function applyContent(content) {
    window.PC_CONTENT = content;

    // 0) Analítica: cargar píxeles configurados (si los hay)
    setupAnalytics(content.analytics);

    // 1) Aplicar textos a [data-key]
    document.querySelectorAll("[data-key]").forEach(function (el) {
      var val = get(content, el.getAttribute("data-key"));
      if (val == null) return;
      if (el.hasAttribute("data-rich")) el.innerHTML = richText(val);
      else el.textContent = val;
    });

    // 2) Redes sociales (footer) — siempre visibles; sin link real quedan inertes
    var social = content.social || {};
    document.querySelectorAll("[data-social]").forEach(function (el) {
      var net = el.getAttribute("data-social");
      var url = (social[net] || "").trim();
      el.style.display = "";
      if (url && url !== "#") {
        el.setAttribute("href", url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
        el.onclick = null;
      } else {
        el.setAttribute("href", "#");
        el.removeAttribute("target");
        el.onclick = function (e) { e.preventDefault(); };
      }
    });

    // 3) WhatsApp: arma cada CTA con número + mensaje
    //    Excepción: si el elemento trae [data-wa-url], usamos esa URL completa.
    var num = (content.global && content.global.waNumber) || DEFAULTS.global.waNumber;
    var msg = (content.global && content.global.waMsg) || DEFAULTS.global.waMsg;
    num = String(num).replace(/[^0-9]/g, "");
    document.querySelectorAll("[data-wa], [data-wa-url]").forEach(function (el) {
      var fullUrl = el.getAttribute("data-wa-url");
      if (fullUrl && fullUrl.length > 1) {
        el.setAttribute("href", fullUrl);
      } else {
        var custom = el.getAttribute("data-wa");
        var text = custom && custom.length > 1 ? custom : msg;
        el.setAttribute("href", "https://wa.me/" + num + "?text=" + encodeURIComponent(text));
      }
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");

      // Seguimiento de clic (una sola vez por elemento)
      if (!el.__pcWaTracked) {
        el.__pcWaTracked = true;
        el.addEventListener("click", function () {
          window.pcTrack("whatsapp_click", {
            cta_location: el.getAttribute("data-wa-loc") || "desconocido",
            page_path: location.pathname,
            page_title: document.title
          });
        });
      }
    });

    document.dispatchEvent(new CustomEvent("pc-content-ready", { detail: content }));
  }

  function boot() {
    fetch(BASE + "/content.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (published) {
        var content = deepMerge(DEFAULTS, published);
        // Borrador local (lo que estás probando antes de publicar)
        try {
          var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
          if (draft) content = deepMerge(content, draft);
        } catch (e) {}
        applyContent(content);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
