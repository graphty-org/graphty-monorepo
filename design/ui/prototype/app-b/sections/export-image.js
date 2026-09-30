/* Export > Image: graphty-element's captureScreenshot, inside the one Export dialog with Image
   selected in its list. Presets, format, size (multiplier or pixels, with a print-width helper),
   background, smooth edges, which view, where it goes, the element's pre-check and memory
   estimate, and a canvas-only preview. States: defaults, a size the pre-check refuses, a clipboard
   the browser refuses, waiting for the layout to settle, the settle timeout, and opened from a
   saved view's menu.

   Numbers: the canvas size is measured from this page's canvas region (a stand-in for the
   element's canvas), and every derived figure uses the element's own rules from
   graphty-element/src/screenshot (dimensions.ts BROWSER_LIMITS, capability-check.ts memory
   formula, presets.ts, constants.ts settle timeout). Plain ASCII. Styles injected below. */
(function () {
    "use strict";
    const CSS = `
.xi-main { overflow: auto; padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.xi-main > * { flex: none; }
.xi-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.xi-from { color: var(--cm-text-secondary); font-size: 11px; font-weight: 400; margin-left: auto; }
.xi-set { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 8px 12px; align-items: center; }
.xi-set > .xi-k { color: var(--cm-text-secondary); align-self: start; line-height: 24px; }
.xi-set > div { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-width: 0; }
.xi-seg { flex-wrap: wrap; height: auto; min-height: 24px; }
.xi-seg > button { cursor: pointer; height: 24px; display: inline-flex; align-items: center; white-space: nowrap; }
.xi-seg > button[disabled] { cursor: default; color: var(--cm-text-disabled); }
.xi-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 4px; width: 100%; }
.xi-preset { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 5px 8px; border-radius: 5px; border: 0; font: inherit; text-align: left; cursor: pointer; color: var(--cm-text); background: var(--cm-bg-secondary); }
.xi-preset span { color: var(--cm-text-secondary); font-size: 11px; }
.xi-preset[aria-checked="true"] { background: var(--cm-bg); box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.xi-num { width: 72px; height: 24px; box-sizing: border-box; padding: 0 6px; border: 0; border-radius: 5px; font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); }
.xi-num:focus { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.xi-sub { color: var(--cm-text-secondary); font-size: 11px; }
.xi-line { display: flex; align-items: center; gap: 6px; }
.xi-warn { color: var(--cm-text-warning, var(--cm-text)); }
.xi-refuse { display: flex; gap: 8px; align-items: flex-start; padding: 6px 10px; border-radius: 6px; background: var(--cm-bg-secondary); width: 100%; box-sizing: border-box; }
.xi-refuse b { font-weight: 550; }
.xi-err { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--cm-border-danger-strong); }
.xi-err .k-icon, .xi-err svg { color: var(--cm-icon-danger, currentColor); flex: none; margin-top: 2px; }
.xi-h { font-weight: 550; margin: 4px 0 -4px; }
.xi-preview { position: relative; max-width: 560px; border-radius: 2px; box-shadow: 0 0 0 1px var(--cm-border); overflow: hidden; background: var(--cm-bg); }
.xi-preview img { width: 100%; height: auto; display: block; }
.xi-preview[data-transparent] { background-color: #fff; background-image: linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.xi-preview[data-waiting] img { opacity: .45; }
.xi-note { color: var(--cm-text-secondary); font-size: 11px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.xi-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 5px; font-size: 10px; font-weight: 600; color: var(--k-annot-ink); box-shadow: inset 0 0 0 1px var(--k-annot); white-space: nowrap; }
.xi-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 8px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xi-footl a { color: var(--cm-text-brand); }
.xi-wait { flex: 1 1 auto; min-width: 0; display: flex; gap: 10px; align-items: center; }
.xi-wait .k-progress { flex: 0 0 160px; }
.xi-wait .k-progress > i { width: 35%; animation: xi-slide 1.4s ease-in-out infinite; }
@keyframes xi-slide { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
@media (prefers-reduced-motion: reduce) { .xi-wait .k-progress > i { animation: none; width: 100%; opacity: .5; } }
.xi-fallback { width: min(1120px, calc(100vw - 48px)); height: min(760px, calc(100vh - 56px)); max-height: none; }
.xi-fallback .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: flex; }
`;
    if (!document.getElementById("xi-style")) document.head.append(h("style", { id: "xi-style" }, CSS));

    // ---------- the element's rules (graphty-element/src/screenshot) ----------
    const MAX_DIM = 16384;           // BROWSER_LIMITS.MAX_DIMENSION
    const MAX_PX = 33177600;         // BROWSER_LIMITS.MAX_PIXELS (8K)
    const WARN_PX = 8294400;         // BROWSER_LIMITS.WARN_PIXELS (4K)
    const SETTLE_S = 30;             // SCREENSHOT_CONSTANTS.LAYOUT_SETTLE_TIMEOUT_MS / 1000
    const n = (v) => Math.round(v).toLocaleString("en-US");
    const mp = (px) => (px / 1e6).toFixed(1);
    function check(w, hgt) {
        const px = w * hgt;
        const mem = (px * 4) / (1024 * 1024);
        if (w > MAX_DIM || hgt > MAX_DIM) return { ok: false, mem, reason: `${n(w)} x ${n(hgt)} is wider or taller than the browser's limit of ${n(MAX_DIM)} pixels.` };
        if (px > MAX_PX) return { ok: false, mem, reason: `${n(w)} x ${n(hgt)} is ${mp(px)} megapixels; the browser's limit is ${mp(MAX_PX)} megapixels (8K).` };
        const warn = [];
        if (px >= WARN_PX) warn.push(`Large image (${mp(px)} megapixels): it may fail on computers with less memory.`);
        if (mem > 100) warn.push(`High memory use (about ${n(mem)} MB): the app may slow down while it captures.`);
        return { ok: true, mem, warn };
    }
    function canvasSize() {
        const c = document.querySelector(".k-canvas");
        const r = c ? c.getBoundingClientRect() : null;
        // size-refused models a high-density screen (2 device pixels per point), where the
        // element's canvas is twice the page size and 8x passes the browser's 8K limit.
        const d = Math.max(window.devicePixelRatio || 1, shown === "size-refused" ? 2 : 1);
        return r && r.width > 0 ? { w: Math.round(r.width * d), h: Math.round(r.height * d) } : { w: 1280, h: 800 };
    }

    // ---------- the presets (presets.ts), labeled by what they produce ----------
    const PRESETS = [
        { id: "print", label: "For print", line: "PNG, 4x, smooth edges, download", set: { format: "PNG", mode: "x", mult: 4, smooth: true, transparent: false, dest: "download" } },
        { id: "web-share", label: "To share", line: "PNG, 2x, copy to clipboard", set: { format: "PNG", mode: "x", mult: 2, smooth: false, transparent: false, dest: "clipboard" } },
        { id: "thumbnail", label: "Thumbnail", line: "JPEG, 400 x 300, quality 85", set: { format: "JPEG", mode: "px", w: 400, h: 300, quality: 85, smooth: false, transparent: false } },
        { id: "documentation", label: "For documentation", line: "PNG, 2x, transparent, download", set: { format: "PNG", mode: "x", mult: 2, smooth: false, transparent: true, dest: "download" } },
    ];
    const BUILTIN = ["Fit", "Front", "Side", "Top", "Isometric"]; // the element's camera catalog in 3D
    const SAVED = AB.SAVED_VIEWS; // the Views place's saved views
    const EXT = { PNG: "png", JPEG: "jpg", WebP: "webp" };

    let s = null;       // this visit's choices
    let shown = null;   // the state they belong to

    function fresh(state) {
        const c = canvasSize();
        const o = { format: "PNG", quality: 92, mode: "x", mult: 1, w: c.w, h: c.h, lock: true, mm: 174, dpi: 300, transparent: false, smooth: false, view: "Current camera", dest: "download", preset: null };
        if (state === "size-refused") Object.assign(o, { mult: 4, preset: "print", smooth: true });
        if (state === "clipboard-refused") Object.assign(o, { mult: 2, preset: "web-share", dest: "download" }); // the preset asks for the clipboard; the browser refuses it
        if (state === "from-view") o.view = SAVED[1];
        return o;
    }
    function applyPreset(p) {
        const c = canvasSize();
        Object.assign(s, { w: c.w, h: c.h }, p.set, { preset: p.id });
        if (p.set.dest === "clipboard" && shown === "clipboard-refused") s.dest = "download";
    }
    function outSize() {
        const c = canvasSize();
        return s.mode === "x" ? { w: c.w * s.mult, h: c.h * s.mult } : { w: s.w, h: s.h };
    }

    // ---------- controls ----------
    const oq = (text) => h("span", { class: "xi-oq", title: text }, "Open question");
    const setRow = (label, ...kids) => [h("span", { class: "xi-k" }, label), h("div", null, kids)];
    function seg(label, items, value, pick) {
        return h("span", { class: "k-seg xi-seg", role: "radiogroup", "aria-label": label },
            items.map((it) => {
                const o = typeof it === "string" ? { id: it, label: it } : it;
                return h("button", { type: "button", role: "radio", "aria-checked": String(o.id === value), disabled: o.disabled ? "" : null, title: o.title || null,
                    on: { click: () => { if (!o.disabled) { pick(o.id); s.preset = null; redraw(); } } } }, o.label);
            }));
    }
    function sw(label, on, set, disabled) {
        return h("span", { class: "xi-line" },
            h("span", { class: "k-switch", role: "switch", tabindex: disabled ? null : "0", "aria-checked": String(on), "aria-disabled": disabled ? "true" : null, "aria-label": label,
                style: disabled ? "opacity:.5" : null,
                on: disabled ? {} : { click: () => { set(!on); s.preset = null; redraw(); }, keydown: (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(!on); s.preset = null; redraw(); } } } }),
            h("span", null, label));
    }
    function num(value, label, set) {
        return h("input", { class: "xi-num", type: "number", min: "1", value: String(value), "aria-label": label,
            on: { change: (e) => { const v = Math.max(1, Number(e.target.value) || 1); set(v); s.preset = null; redraw(); } } });
    }

    let redraw = () => {};
    let menuHost = document.body; // the overlay element this section renders into

    function body(state) {
        const c = canvasSize();
        const out = outSize();
        const chk = check(out.w, out.h);
        const busy = state === "waiting-to-settle";

        // Presets
        const presets = h("div", { class: "xi-presets", role: "radiogroup", "aria-label": "Presets" },
            PRESETS.map((p) => h("button", { type: "button", class: "xi-preset", role: "radio", "aria-checked": String(s.preset === p.id),
                on: { click: () => { applyPreset(p); redraw(); } } }, p.label, h("span", null, p.line))));

        // Format and quality
        const fmt = seg("Format", ["PNG", "JPEG", "WebP"], s.format, (f) => { s.format = f; if (f !== "PNG") s.transparent = false; });
        const quality = s.format === "PNG" ? null : h("span", { class: "xi-line" }, h("span", { class: "xi-sub" }, "Quality"), num(s.quality, "Quality, 1 to 100", (v) => { s.quality = Math.min(100, v); }));

        // Size
        const mults = [1, 2, 4, 8].map((m) => {
            const k = check(c.w * m, c.h * m);
            return { id: m, label: m + "x", disabled: !k.ok, title: k.ok ? `${n(c.w * m)} x ${n(c.h * m)} pixels` : k.reason };
        });
        const sizeMode = seg("Size by", [{ id: "x", label: "Multiplier" }, { id: "px", label: "Pixels" }], s.mode, (m) => { s.mode = m; if (m === "px") { s.w = out.w; s.h = out.h; } });
        let sizeCtl;
        if (s.mode === "x") {
            sizeCtl = [seg("Multiplier", mults, s.mult, (m) => { s.mult = m; }),
                h("span", { class: "xi-sub" }, `${n(out.w)} x ${n(out.h)} pixels, from the canvas at ${n(c.w)} x ${n(c.h)}${state === "size-refused" ? " on a high-density screen" : ""}`)];
        } else {
            const aspect = c.w / c.h;
            const px = Math.round((s.mm / 25.4) * s.dpi);
            sizeCtl = [
                h("span", { class: "xi-line" }, num(s.w, "Width in pixels", (v) => { s.w = v; if (s.lock) s.h = Math.round(v / aspect); }), "x",
                    num(s.h, "Height in pixels", (v) => { s.h = v; if (s.lock) s.w = Math.round(v * aspect); }),
                    AB.iconButton(s.lock ? "lock" : "lock-open", s.lock ? "Aspect locked to the canvas: unlock" : "Aspect unlocked: lock to the canvas", { pressed: s.lock, onClick: () => { s.lock = !s.lock; if (s.lock) s.h = Math.round(s.w / aspect); redraw(); } })),
                h("span", { class: "xi-line xi-sub", style: "width:100%" }, "Print width",
                    num(s.mm, "Print width in millimeters", (v) => { s.mm = v; }), "mm at",
                    num(s.dpi, "Dots per inch", (v) => { s.dpi = v; }), `dpi = ${n(px)} pixels wide.`,
                    h("a", { href: "#", on: { click: (e) => { e.preventDefault(); s.w = px; if (s.lock) s.h = Math.round(px / aspect); s.preset = null; redraw(); } } }, "Use this width")),
            ];
        }

        // Pre-check result: memory estimate, warnings, refusals
        const refused = mults.filter((m) => m.disabled);
        const precheck = [
            chk.ok
                ? h("span", { class: "xi-line xi-sub", style: "width:100%" }, icon("cpu", "sm"), `About ${n(chk.mem)} MB of memory while capturing (${n(out.w)} x ${n(out.h)}).`)
                : h("div", { class: "xi-refuse" }, icon("triangle-alert", "sm"), h("span", null, h("b", null, "This size cannot be captured. "), chk.reason, ` It would need about ${n(chk.mem)} MB.`)),
            chk.ok && chk.warn.length ? h("span", { class: "xi-line xi-sub xi-warn", style: "width:100%" }, icon("triangle-alert", "sm"), chk.warn.join(" ")) : null,
            state === "size-refused" && refused.length
                ? h("div", { class: "xi-refuse" }, icon("circle-x", "sm"), h("span", null,
                    h("b", null, refused.map((m) => m.label).join(" and ") + " not available. "),
                    refused[0].title, ` It would need about ${n(check(c.w * refused[0].id, c.h * refused[0].id).mem)} MB. Make the window smaller, or choose Pixels.`))
                : null,
        ];

        // Background and edges
        const transparentSw = sw("Transparent background", s.transparent, (v) => { s.transparent = v; if (v) s.format = "PNG"; });
        const bgNote = h("span", { class: "xi-sub" }, s.format === "PNG" ? "Otherwise the canvas background." : "PNG only: turning it on switches the format to PNG.");
        const smoothSw = sw("Smooth edges", s.smooth, (v) => { s.smooth = v; });

        // View
        const viewField = AB.field(s.view, { caret: true, onClick: (e) => {
            const pick = (v) => ({ label: v, check: s.view === v, onClick: () => { s.view = v; redraw(); } });
            const m = AB.menu({ anchor: e.currentTarget, place: "below-start", items: [pick("Current camera"), { sep: true }, { heading: "Built-in views" }, ...BUILTIN.map(pick), { sep: true }, { heading: "Saved views" }, ...SAVED.map(pick)] });
            menuHost.append(m);
            setTimeout(() => document.addEventListener("click", () => m.remove(), { capture: true, once: true }), 0);
        } });

        // Destination, with the clipboard refusal
        const noClip = state === "clipboard-refused";
        const clipReason = "Copy to clipboard needs a secure page (HTTPS); this page is not one.";
        const dest = seg("Destination", [
            { id: "download", label: "Download" },
            { id: "clipboard", label: "Copy to clipboard", disabled: noClip, title: noClip ? clipReason : null },
            { id: "both", label: "Both", disabled: noClip, title: noClip ? clipReason : null },
        ], s.dest, (d) => { s.dest = d; });

        const fromView = state === "from-view";
        const title = h("div", { class: "xi-title" }, icon("camera"), "Image", h("span", { class: "k-secondary", style: "font-weight:400" }, "." + EXT[s.format]),
            fromView ? h("span", { class: "xi-from" }, "Opened from ", AB.link("views-place", "", "the menu of the saved view " + SAVED[1])) : null);

        const failed = state === "failed"
            ? h("div", { class: "xi-err", role: "alert" }, icon("circle-x", "sm"), h("span", null,
                h("b", null, "No image was made. "), `The layout did not settle within ${SETTLE_S} seconds, and the capture waits for a settled layout. Capture the graph as it is now, or pause the layout and try again.`))
            : null;

        const set = h("div", { class: "xi-set" },
            setRow("Presets", presets),
            setRow("Format", fmt, quality),
            setRow("Size", sizeMode, sizeCtl, precheck),
            setRow("Background", transparentSw, bgNote),
            setRow("Edges", smoothSw, h("span", { class: "xi-sub" }, "Renders at a higher quality, then scales down.")),
            setRow("View", viewField, h("span", { class: "xi-sub" }, s.view === "Current camera" ? "What the canvas shows now." : "Captured from this view; your camera does not move.")),
            setRow("Destination", dest, noClip ? h("span", { class: "xi-line xi-sub", style: "width:100%" }, icon("info", "sm"), clipReason + " The image downloads instead.") : null),
            setRow("File name", h("span", null, `les-miserables_${s.view === "Current camera" ? "canvas" : s.view.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}.${EXT[s.format]}`), oq("Where the file name is edited, and whether it is remembered per project")));

        const preview = h("div", { class: "xi-preview", "data-transparent": s.transparent ? "" : null, "data-waiting": busy ? "" : null },
            AB.lesmisDrawing ? AB.lesmisDrawing("lesmis-groups-rest", "Preview: Les Miserables as the canvas draws it, " + s.view.toLowerCase()) : AB.drawing("lesmis-groups-rest", "Preview of the canvas"));
        const note = h("div", { class: "xi-note" }, icon("info", "sm"), "The legend is not drawn into images.",
            AB.needsElement("graphty-element captures the canvas only; drawing the legend into a captured image is filed for the element"),
            fromView ? h("span", null, "Rendered from the saved view's camera without moving yours (graphty-element's captureScreenshot takes a saved view as its camera).") : null);

        return h("div", { class: "xi-main" }, title, failed, set, h("div", { class: "xi-h" }, "Preview"), preview, note);
    }

    function foot(state) {
        const out = outSize();
        const chk = check(out.w, out.h);
        const where = s.dest === "download" ? "to Downloads" : s.dest === "clipboard" ? "to the clipboard" : "to Downloads and the clipboard";
        const file = `les-miserables.${EXT[s.format]}`;
        const done = () => { AB.go("data-place", "sent-and-saved"); setTimeout(() => AB.flash(`Image written ${where}. Listed in Sent and saved.`), 50); };

        if (state === "waiting-to-settle") {
            return [
                h("span", { class: "xi-wait", role: "status" }, h("span", { class: "k-progress", "aria-label": "Waiting for the layout to settle" }, h("i")),
                    h("span", { class: "k-secondary" }, `Waiting for the layout to settle before capturing. Gives up after ${SETTLE_S} seconds.`)),
                AB.button("Capture now", { kind: "ghost", onClick: done }),
                AB.button("Cancel", { kind: "secondary", onClick: () => AB.go("export-image", "image") }),
            ];
        }
        if (state === "failed") {
            return [
                h("span", { class: "xi-footl" }, icon("info", "sm"), "Nothing was written."),
                AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
                AB.button("Try again", { kind: "secondary", onClick: () => AB.go("export-image", "waiting-to-settle") }),
                AB.button("Capture as it is now", { icon: "camera", onClick: done }),
            ];
        }
        return [
            h("span", { class: "xi-footl" }, icon("info", "sm"), "Saved to this computer; nothing is uploaded. Listed in ",
                AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), "."),
            AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
            AB.button(s.dest === "clipboard" ? "Copy" : "Export", { icon: s.dest === "clipboard" ? "copy" : "download", disabled: !chk.ok,
                onClick: done }),
        ];
    }

    function render(el, state) {
        if (state === "this-view") state = "from-view";          // stub ids, kept as aliases
        if (state === "waiting") state = "waiting-to-settle";
        if (shown !== state || !s) { shown = state; s = fresh(state); }
        menuHost = el;
        redraw = () => { el.textContent = ""; draw(); };
        const draw = () => {
            const b = body(state);
            const f = foot(state);
            if (AB.exportDialogFrame) { el.append(AB.exportDialogFrame("image", b, f)); return; }
            // Until the dialog frame is published: the same modal, without the output list.
            const m = AB.modal({ title: "Export", body: b, foot: f });
            m.querySelector(".k-modal").classList.add("xi-fallback");
            el.append(m);
        };
        draw();
    }

    registerSection({
        id: "export-image",
        title: "Export: image",
        region: "overlay",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "image", label: "Image, the defaults" },
            { id: "size-refused", label: "A size the element refuses (high-density screen)" },
            { id: "clipboard-refused", label: "Clipboard refused: not a secure page" },
            { id: "waiting-to-settle", label: "Waiting for the layout to settle" },
            { id: "failed", label: "Failed: the layout did not settle" },
            { id: "from-view", label: "Opened from a saved view's menu" },
        ],
        render,
    });
})();
