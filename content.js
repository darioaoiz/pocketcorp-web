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
      waNumber: "59162390080",
      waMsg: "Hola PocketCorp 👋 Quiero automatizar mi negocio con mi equipo de IA. ¿Cómo empiezo?"
    },
    floatingWa: {
      number: "59169542275",
      msg: "Hola Dario 👋 Estaba viendo PocketCorp y tengo una duda antes de empezar.",
      tooltip: "¿Tenés dudas? Escríbeme y te respondo en minutos. 👋",
      delaySec: "15"
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

    // 4) Botón flotante de WhatsApp: número propio + tooltip de rescate
    initFloatingWa(content);

    // 5) Modal-preview de directores (solo existe en la home)
    initDirModal();

    document.dispatchEvent(new CustomEvent("pc-content-ready", { detail: content }));
  }

  // ── Botón flotante de WhatsApp + tooltip de rescate ──────
  // El botón usa su PROPIO número (distinto del global). El tooltip aparece
  // tras unos segundos o al pasar el 60% de scroll, lo que ocurra primero,
  // para captar a quien leyó pero aún no hizo clic en ningún CTA.
  function initFloatingWa(content) {
    if (window.__pcFloatWaInit) return;
    var btn = document.querySelector(".wa-float");
    if (!btn) return;
    window.__pcFloatWaInit = true;

    var fw = (content && content.floatingWa) || DEFAULTS.floatingWa;
    var num = String(fw.number || DEFAULTS.floatingWa.number).replace(/[^0-9]/g, "");
    var msg = fw.msg || DEFAULTS.floatingWa.msg;
    var tipText = (fw.tooltip || "").trim();
    var delay = Math.max(0, parseInt(fw.delaySec, 10) || 15) * 1000;
    var href = "https://wa.me/" + num + "?text=" + encodeURIComponent(msg);

    btn.setAttribute("href", href);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener noreferrer");
    if (!btn.__pcWaTracked) {
      btn.__pcWaTracked = true;
      btn.addEventListener("click", function () {
        window.pcTrack("whatsapp_click", {
          cta_location: btn.getAttribute("data-wa-loc") || "boton_flotante",
          page_path: location.pathname,
          page_title: document.title
        });
      });
    }

    // Sin texto de tooltip → solo botón, nada más que hacer.
    if (!tipText) return;
    // Si el usuario ya lo cerró en esta sesión, no reaparece.
    try { if (sessionStorage.getItem("pc_watip_closed") === "1") return; } catch (e) {}

    var tip = document.createElement("a");
    tip.className = "wa-tip";
    tip.setAttribute("href", href);
    tip.setAttribute("target", "_blank");
    tip.setAttribute("rel", "noopener noreferrer");
    tip.setAttribute("data-wa-loc", "tooltip_flotante");
    var span = document.createElement("span");
    span.className = "wa-tip__text";
    span.textContent = tipText;
    var close = document.createElement("button");
    close.className = "wa-tip__close";
    close.setAttribute("type", "button");
    close.setAttribute("aria-label", "Cerrar");
    close.innerHTML = "&times;";
    tip.appendChild(span);
    tip.appendChild(close);
    document.body.appendChild(tip);

    var shown = false, dismissed = false;
    function showTip() {
      if (shown || dismissed) return;
      shown = true;
      requestAnimationFrame(function () { tip.classList.add("show"); });
      window.pcTrack("watip_shown", { page_path: location.pathname });
    }
    function hideTip(remember) {
      dismissed = true;
      tip.classList.remove("show");
      setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 300);
      if (remember) { try { sessionStorage.setItem("pc_watip_closed", "1"); } catch (e) {} }
    }
    close.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      hideTip(true);
    });
    tip.addEventListener("click", function () {
      window.pcTrack("whatsapp_click", { cta_location: "tooltip_flotante", page_path: location.pathname, page_title: document.title });
      hideTip(true);
    });

    var timer = setTimeout(showTip, delay);
    function onScroll() {
      var h = document.documentElement;
      var pct = (h.scrollTop || document.body.scrollTop) / ((h.scrollHeight - h.clientHeight) || 1);
      if (pct >= 0.6) { clearTimeout(timer); showTip(); window.removeEventListener("scroll", onScroll); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ── Modal-preview de directores ──────────────────────────
  // Al hacer clic en una tarjeta, abre una ventana con foto, rol, resumen
  // y dos CTAs (perfil completo + activar por WhatsApp). El contenido se
  // lee de la propia tarjeta, así no hay nada que mantener por duplicado.
  function initDirModal() {
    if (window.__pcDirModalInit) return;
    var modal = document.getElementById("dir-modal");
    var cards = document.querySelectorAll(".dir-card");
    if (!modal || !cards.length) return;
    window.__pcDirModalInit = true;

    var imgEl = document.getElementById("dir-modal-img");
    var roleEl = document.getElementById("dir-modal-role");
    var nameEl = document.getElementById("dir-modal-name");
    var descEl = document.getElementById("dir-modal-desc");
    var waEl = document.getElementById("dir-modal-wa");
    var fullEl = document.getElementById("dir-modal-full");
    var delivEl = document.getElementById("dir-modal-deliv");
    var delivBlock = document.getElementById("dir-modal-deliv-block");
    var msgsEl = document.getElementById("dir-modal-msgs");
    var msgsBlock = document.getElementById("dir-modal-msgs-block");
    var lastFocused = null;

    function waNumber() {
      var n = (window.PC_CONTENT && window.PC_CONTENT.global && window.PC_CONTENT.global.waNumber) || DEFAULTS.global.waNumber;
      return String(n).replace(/[^0-9]/g, "");
    }
    function txt(el) { return el ? el.textContent.trim() : ""; }

    function fillList(listEl, blockEl, items) {
      if (!listEl) return;
      var vals = items.filter(function (x) { return x && String(x).trim(); });
      listEl.innerHTML = "";
      vals.forEach(function (t) {
        var li = document.createElement("li");
        li.textContent = String(t).trim();
        listEl.appendChild(li);
      });
      if (blockEl) blockEl.hidden = vals.length === 0;
    }
    function fillMsgs(wrapEl, blockEl, items) {
      if (!wrapEl) return;
      var vals = items.filter(function (x) { return x && String(x).trim(); });
      wrapEl.innerHTML = "";
      vals.forEach(function (t) {
        var b = document.createElement("div");
        b.className = "dir-modal__msg";
        b.textContent = String(t).trim();
        wrapEl.appendChild(b);
      });
      if (blockEl) blockEl.hidden = vals.length === 0;
    }

    function openModal(card) {
      var img = card.querySelector(".dir-card__top img");
      var role = card.querySelector(".dir-card__role");
      var nm = txt(card.querySelector(".dir-card__name"));
      var rl = txt(role);

      if (img) { imgEl.setAttribute("src", img.getAttribute("src") || ""); imgEl.setAttribute("alt", img.getAttribute("alt") || nm); }
      roleEl.textContent = rl;
      roleEl.setAttribute("style", (role && role.getAttribute("style")) || "");
      nameEl.textContent = nm;
      descEl.textContent = txt(card.querySelector(".dir-card__fw"));
      var href = card.getAttribute("href") || "#";
      fullEl.setAttribute("href", href);

      // Mini-resumen de la landing: entregables + ejemplos de mensajes.
      // El director se identifica por el archivo (directores/max.html -> max).
      var key = href.split("/").pop().replace(".html", "");
      var d = (window.PC_CONTENT && window.PC_CONTENT.directores && window.PC_CONTENT.directores[key]) || {};
      fillList(delivEl, delivBlock, [d.deliv1Title, d.deliv2Title, d.deliv3Title]);
      fillMsgs(msgsEl, msgsBlock, [d.ex1, d.ex2, d.ex3]);

      var msg = "Hola PocketCorp 👋 Quiero activar a " + nm + (rl ? " (" + rl + ")" : "") +
        " en mi Consejo Directivo de IA. ¿Cómo arranco? 🚀";
      waEl.setAttribute("href", "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(msg));
      waEl.setAttribute("target", "_blank");
      waEl.setAttribute("rel", "noopener noreferrer");
      waEl.setAttribute("data-wa-loc", "modal_" + (nm.toLowerCase() || "director"));

      lastFocused = document.activeElement;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("dir-modal-open");
      var x = modal.querySelector(".dir-modal__x"); if (x) x.focus();
      window.pcTrack("director_modal_open", { director: nm, page_path: location.pathname });
    }
    function closeModal() {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("dir-modal-open");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) { e.preventDefault(); openModal(card); });
    });
    modal.querySelectorAll("[data-dir-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
    waEl.addEventListener("click", function () {
      window.pcTrack("whatsapp_click", {
        cta_location: waEl.getAttribute("data-wa-loc") || "modal_director",
        page_path: location.pathname, page_title: document.title
      });
    });
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
