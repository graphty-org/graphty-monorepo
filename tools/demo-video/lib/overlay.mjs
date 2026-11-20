/**
 * What the recorder draws over the app, in the page so the screencast films it: a large cursor that
 * follows the real mouse (mouse, pointer and drag events, read in the capture phase at the window),
 * a ring on every press, a key badge for shortcuts and a file chip while a file is dragged in. It
 * lives in a shadow root on <html> with pointer-events none and aria-hidden, above everything, so
 * the app's hit testing and accessibility tree never see it. The same look in every clip.
 *
 * It also draws the operating system's file windows, which headless Chromium never shows: an Open
 * dialog (the app's real file chooser is answered behind it) and a folder window a file is dragged out
 * of. Those two take real pointer input (rows highlight under the hand and select on its press), so
 * they swallow the hand's clicks as a real dialog would; everything else lets input through.
 *
 * `installOverlay` runs this file's `overlay` function in the page on every load (an init script).
 * The badge, the file chip and the file windows are switched by the recorder (window.__demoOverlay);
 * the cursor and the rings answer real input only.
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
      .win { position: absolute; pointer-events: auto; background: #fff; color: #1f2937; border-radius: 14px;
        border: 1px solid #c7ccd4; box-shadow: 0 24px 70px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.12);
        font: 400 22px/1.2 Inter, "Inter Variable", system-ui, sans-serif; overflow: hidden; opacity: 0;
        transform: scale(0.97); transition: opacity 180ms ease-out, transform 180ms ease-out; }
      .win.on { opacity: 1; transform: none; }
      .win .bar { display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 20px;
        background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
      .win .bar i { font-style: normal; color: #6b7280; font-size: 26px; }
      .win .where { display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 20px;
        border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600; }
      .win .head, .win .row { display: grid; grid-template-columns: 1fr 210px; align-items: center; padding: 0 20px; }
      .win .head { height: 38px; font-size: 17px; color: #6b7280; border-bottom: 1px solid #f0f1f3; }
      .win .row { height: 54px; }
      .win.plain .row { grid-template-columns: 1fr; } /* a folder window has no Kind column */
      .win .row:hover { background: #eef2ff; }
      .win .row.sel { background: #4f46e5; color: #fff; }
      .win .row.sel .kind { color: #e0e7ff; }
      .win .row.gone { opacity: 0.4; }
      .win .name { display: flex; align-items: center; gap: 14px; white-space: nowrap; overflow: hidden; }
      .win .kind { color: #6b7280; font-size: 19px; }
      .win .doc { flex: none; width: 30px; height: 36px; }
      .win .foot { display: flex; align-items: center; gap: 14px; height: 78px; padding: 0 20px;
        border-top: 1px solid #e5e7eb; background: #f9fafb; }
      .win .fname { flex: 1; height: 44px; display: flex; align-items: center; padding: 0 14px; border-radius: 8px;
        border: 1px solid #d1d5db; background: #fff; color: #111827; }
      .win .btn { height: 46px; min-width: 112px; display: flex; align-items: center; justify-content: center;
        border-radius: 8px; border: 1px solid #d1d5db; background: #fff; font-weight: 600; }
      .win .btn.go { background: #4f46e5; border-color: #4f46e5; color: #fff; }
      .win .btn.go.off { background: #c7d2fe; border-color: #c7d2fe; }
    `;
    // what a file manager calls a file, by its extension
    const KINDS = {
        json: "JSON file",
        csv: "CSV spreadsheet",
        gexf: "Gephi file",
        graphml: "GraphML file",
        dot: "Graphviz file",
        cys: "Cytoscape session",
        txt: "Text file",
        graphty: "graphty project",
    };
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
    let win = null;
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
                // no combo: a label alone ("A colleague's browser")
                ((combo || null)
                    ?.split("+")
                    .map((k) => `<span class="key">${clean(k === "Control" ? "Ctrl" : k)}</span>`)
                    .join('<span class="plus">+</span>') ?? "") +
                (label ? `<span class="what">${clean(label)}</span>` : "");
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
        // an Open dialog (open: true, centered) or a folder window at (x, y) listing `files`; returns
        // the boxes the hand aims at: each row, and the dialog's Open button
        window({ folder, files, open = true, x, y, width }) {
            win?.remove();
            win = document.createElement("div");
            win.className = open ? "win" : "win plain";
            const w = width ?? (open ? 780 : 440);
            win.style.width = `${w}px`;
            const doc = (n) => {
                const ext = (n.split(".").at(-1) ?? "").slice(0, 4).toUpperCase();
                const tint = { JSON: "#d97706", CSV: "#059669", GEXF: "#2563eb", CYS: "#ea580c" }[ext] ?? "#6b7280";
                return `<svg class="doc" viewBox="0 0 30 36"><path d="M2 2h17l9 9v23H2z" fill="#fff" stroke="${tint}" stroke-width="2.4" stroke-linejoin="round"/><path d="M19 2v9h9" fill="none" stroke="${tint}" stroke-width="2.4" stroke-linejoin="round"/><rect x="0" y="20" width="30" height="11" rx="2" fill="${tint}"/><text x="15" y="29" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff" font-family="Inter, system-ui, sans-serif">${ext}</text></svg>`;
            };
            const clean = (t) => String(t).replaceAll(/[<>&]/g, "");
            const kind = (f) => {
                const ext = f.split(".").at(-1).toLowerCase();
                return open ? '<span class="kind">' + clean(KINDS[ext] ?? ext.toUpperCase() + " file") + "</span>" : "";
            };
            const rows = files
                .map((f) => `<div class="row"><span class="name">${doc(f)}${clean(f)}</span>${kind(f)}</div>`)
                .join("");
            const folderIcon = `<svg width="30" height="24" viewBox="0 0 30 24"><path d="M1 3h10l3 3h15v17H1z" fill="#fbbf24" stroke="#d97706" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
            win.innerHTML =
                `<div class="bar"><span>${open ? "Open" : clean(folder)}</span><i>\u00d7</i></div>` +
                (open
                    ? `<div class="where">${folderIcon}${clean(folder)}</div><div class="head"><span>Name</span><span>Kind</span></div>`
                    : "") +
                `<div class="list">${rows}</div>` +
                (open
                    ? `<div class="foot"><span class="fname"></span><span class="btn">Cancel</span><span class="btn go off">Open</span></div>`
                    : "");
            layer.append(win);
            const r = win.getBoundingClientRect();
            win.style.left = `${x ?? Math.round((innerWidth - r.width) / 2)}px`;
            win.style.top = `${y ?? Math.round((innerHeight - r.height) / 2)}px`;
            const rowEls = [...win.querySelectorAll(".row")];
            // a press on a row selects it and names it in the file name field, as a real dialog does
            for (const [i, el] of rowEls.entries())
                el.addEventListener("pointerdown", () => {
                    for (const o of rowEls) o.classList.toggle("sel", o === el);
                    const name = win.querySelector(".fname");
                    if (name) name.textContent = files[i];
                    win.querySelector(".go")?.classList.remove("off");
                });
            requestAnimationFrame(() => requestAnimationFrame(() => win.classList.add("on")));
            const box = (el) => {
                const b = el.getBoundingClientRect();
                return { x: b.x, y: b.y, width: b.width, height: b.height };
            };
            return {
                rows: rowEls.map((el) => box(el)),
                open: open ? box(win.querySelector(".go")) : null,
                frame: box(win),
            };
        },
        // a row's file is being dragged away (folder window)
        taken(i) {
            win?.querySelectorAll(".row")[i]?.classList.add("gone");
        },
        closeWindow() {
            const w = win;
            win = null;
            if (!w) return;
            w.classList.remove("on");
            setTimeout(() => w.remove(), 220);
        },
        // the hand presses (a ring and the pressed arrow) where no real mouse press is sent: the start of a file drag
        press(down0) {
            down = down0;
            draw();
            if (down0) ring({ button: 0, clientX: x, clientY: y });
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
