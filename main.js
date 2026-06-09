/* ============================================================
   PocketCorp Landing — interactivity
   NOTA: El número de WhatsApp y los textos del sitio se editan
   desde el Panel de Administración (content.json). Aquí solo
   vive el comportamiento (FAQ, animaciones, etc.).
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // FAQ — single open (collapse others)
  const items = Array.from(document.querySelectorAll(".faq-item"));
  items.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
    });
  });

  // WhatsApp chat — staggered reveal when in view
  const body = document.querySelector(".wa-body");
  if (body) {
    const kids = Array.from(body.children);
    kids.forEach((k) => { k.style.animationPlayState = "paused"; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          kids.forEach((k, i) => {
            k.style.animationDelay = (i * 0.55) + "s";
            k.style.animationPlayState = "running";
          });
          io.disconnect();
        }
      });
    }, { threshold: 0.3 });
    io.observe(body);
  }

  // Reveal-on-scroll for cards/panels (subtle)
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "none"; ro.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach((r) => {
      r.style.opacity = "0";
      r.style.transform = "translateY(16px)";
      r.style.transition = "opacity .5s var(--ease-out), transform .5s var(--ease-out)";
      ro.observe(r);
    });
  }

  // ── Acceso secreto al panel de administración ──
  // El puntito del footer lleva directo al panel; el panel pide la contraseña UNA vez.
  const dot = document.getElementById("admin-dot");
  if (dot) {
    dot.style.cursor = "default";
    dot.addEventListener("click", () => { window.location.href = "admin.html"; });
  }
});
