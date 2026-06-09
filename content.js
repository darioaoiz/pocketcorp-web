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

  function applyContent(content) {
    window.PC_CONTENT = content;

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
