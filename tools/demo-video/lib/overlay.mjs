/**
 * What the recorder draws over the app, in the page so the screencast films it: a large cursor that
 * follows the real mouse (mouse, pointer and drag events, read in the capture phase at the window),
 * a ring on every press, a key badge for shortcuts and a file chip while a file is dragged in. It
 * lives in a shadow root on <html> with pointer-events none and aria-hidden, above everything, so
 * the app's hit testing and accessibility tree never see it. The same look in every clip.
 *
 * `installOverlay` runs this file's `overlay` function in the page on every load (an init script).
 * Only the badge and the file chip are switched by the recorder (window.__demoOverlay); the cursor
 * and the rings answer real input only.
 */

/* eslint-disable no-undef -- runs in the page */
function overlay() {
    if (globalThis.__demoOverlay) return;
    const css = `
      :host { all: initial; }
      .layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; overflow: hidden; }
      .cursor { position: absolute; left: 0; top: 0; width: 34px; height: 46px; transform: translate(-200px, -200px);
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); transform-origin: 3px 3px; }
      .ring { position: absolute; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
        border: 5px solid #f5b400; box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 10px rgba(0,0,0,0.25);
        animation: ring 520ms cubic-bezier(.2,.7,.3,1) forwards; }
      .ring.right { border-color: #3b82f6; }
      @keyframes ring { from { transform: scale(0.6); opacity: 1; } to { transform: scale(3.6); opacity: 0; } }
      .badge { position: absolute; display: flex; gap: 10px; align-items: center; padding: 14px 18px;
        background: rgba(17,21,28,0.92); border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        font: 700 34px/1 Inter, "Inter Variable", system-ui, sans-serif; color: #fff; opacity: 0;
        transition: opacity 160ms ease-out, translate 160ms ease-out; translate: 0 8px; }
      .badge.on { opacity: 1; translate: 0 0; }
      .key { display: inline-block; min-width: 30px; padding: 8px 14px; text-align: center; border-radius: 10px;
        background: #2a313d; border: 2px solid #4b5563; border-bottom-width: 5px; }
      .plus { color: #a3d91b; font-weight: 800; }
      .what { margin-left: 4px; font-weight: 600; color: #e5e7eb; }
      .file { position: absolute; display: none; align-items: center; gap: 10px; padding: 10px 16px 10px 12px;
        background: #fff; border: 2px solid #d1d5db; border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,0.25);
        font: 600 24px/1 Inter, "Inter Variable", system-ui, sans-serif; color: #111827; }
      .file.on { display: flex; }
      .file svg { width: 30px; height: 36px; }
    `;
    const host = document.createElement("demo-video-overlay");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${css}</style><div class="layer">
      <div class="file"><svg viewBox="0 0 30 36"><path d="M2 2h17l9 9v23H2z" fill="#eef2ff" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round"/><path d="M19 2v9h9" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round"/></svg><span></span></div>
      <svg class="cursor" viewBox="0 0 34 46"><path d="M3 3 L3 37 L11.5 29 L17 42 L23 39.5 L17.5 27 L29 27 Z" fill="#111" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>
    </div>`;
    const layer = root.querySelector(".layer");
    const cursor = root.querySelector(".cursor");
    const file = root.querySelector(".file");
    let x = -200;
    let y = -200;
    let down = false;
    // pressed, the arrow shrinks a little about its tip (scale composed after the move, so it stays put)
    const draw = () => (cursor.style.transform = `translate(${x - 3}px, ${y - 3}px)${down ? " scale(0.86)" : ""}`);
    const place = (e) => {
        x = e.clientX;
        y = e.clientY;
        draw();
        file.style.transform = `translate(${x + 26}px, ${y + 30}px)`;
    };
    const ring = (e) => {
        const r = document.createElement("div");
        r.className = e.button === 2 ? "ring right" : "ring";
        r.style.left = `${e.clientX}px`;
        r.style.top = `${e.clientY}px`;
        layer.append(r);
        r.addEventListener("animationend", () => r.remove());
    };
    const opts = { capture: true, passive: true };
    for (const t of ["mousemove", "pointermove", "pointerdown", "pointerup", "dragover", "dragenter"])
        addEventListener(t, place, opts);
    addEventListener(
        "pointerdown",
        (e) => {
            ring(e);
            down = true;
            draw();
        },
        opts,
    );
    addEventListener(
        "pointerup",
        () => {
            down = false;
            draw();
        },
        opts,
    );
    addEventListener(
        "drop",
        (e) => {
            place(e);
            ring(e);
        },
        opts,
    );
    const mount = () => document.documentElement.append(host);
    if (document.documentElement) mount();
    else addEventListener("DOMContentLoaded", mount);
    globalThis.__demoOverlay = {
        // a shortcut badge: "Shift+T" as keycaps, near (bx, by) or below-right of the cursor
        badge(combo, ms, bx, by, label = "") {
            const b = document.createElement("div");
            b.className = "badge";
            const clean = (t) => t.replaceAll(/[<>&]/g, "");
            b.innerHTML =
                combo
                    .split("+")
                    .map((k) => `<span class="key">${clean(k === "Control" ? "Ctrl" : k)}</span>`)
                    .join('<span class="plus">+</span>') + (label ? `<span class="what">${clean(label)}</span>` : "");
            b.style.left = `${bx ?? x + 30}px`;
            b.style.top = `${by ?? y + 40}px`;
            layer.append(b);
            const r = b.getBoundingClientRect();
            b.style.left = `${Math.max(16, Math.min(r.left, innerWidth - r.width - 16))}px`;
            b.style.top = `${Math.max(16, Math.min(r.top, innerHeight - r.height - 16))}px`;
            requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("on")));
            setTimeout(() => {
                b.classList.remove("on");
                setTimeout(() => b.remove(), 300);
            }, ms);
        },
        // the hand is off screen (before a file is dragged in from the edge)
        hide() {
            cursor.style.transform = "translate(-200px, -200px)";
        },
        file(name) {
            file.querySelector("span").textContent = name ?? "";
            file.classList.toggle("on", Boolean(name));
        },
    };
}
/* eslint-enable no-undef -- runs in the page */

/**
 * Install the overlay in a page now and on every later load.
 * @param page - the Playwright page
 */
export async function installOverlay(page) {
    await page.addInitScript(overlay);
    await page.evaluate(overlay);
}
