/* Export > Image: graphty-element's captureScreenshot, inside the one Export dialog with Image
   selected in its list (AB.exportDialogFrame, published by export-dialog.js).

   Body: title with the extension, the summary line, five dropdown fields (Preset, Size, Format,
   View, Background) and an Advanced field that opens a light popover (quality for JPEG and WebP,
   sharper rendering, custom pixels with the aspect lock, print width). One callout above the
   preview (info, warning or error). Footer: the one footer note, Cancel, Copy, Export. After a
   copy or an export the dialog closes and one notice names the file.

   Numbers follow the element's own rules in graphty-element/src/screenshot: dimensions.ts
   BROWSER_LIMITS, the capability-check.ts memory formula, presets.ts, constants.ts settle timeout,
   clipboard.ts (needs a secure page) and ScreenshotCapture.ts (transparency needs PNG or WebP).
   Plain ASCII. Styles injected below. */
(function () {
    "use strict";
    const CSS = `
.xi-main { overflow: auto; padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.xi-main > * { flex: none; }
.xi-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.xi-sum { color: var(--cm-text-secondary); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: -6px; }
.xi-fields { max-width: 420px; }
.xi-fields .ab-frow { padding: 0; }
.xi-fields .k-field { width: 100%; box-sizing: border-box; }
.xi-busy { opacity: .5; pointer-events: none; }
.xi-busy [role=button], .xi-busy .k-field { cursor: default; }
.xi-call { display: flex; gap: 8px; align-items: flex-start; padding: 6px 10px; border-radius: 6px; background: var(--cm-bg-secondary); line-height: 18px; }
.xi-call > svg, .xi-call > .k-icon { flex: none; margin-top: 3px; }
.xi-call b { font-weight: 550; }
.xi-call[data-tone="warning"] > svg { color: var(--cm-icon-warning, var(--cm-text)); }
.xi-call[data-tone="error"] { background: transparent; box-shadow: inset 0 0 0 1px var(--cm-border-danger-strong, var(--cm-border-strong)); }
.xi-call[data-tone="error"] > svg { color: var(--cm-icon-danger, currentColor); }
.xi-h { font-weight: 550; }
.xi-preview { position: relative; max-width: 100%; width: 480px; aspect-ratio: 16 / 10; border-radius: 2px; box-shadow: 0 0 0 1px var(--cm-border); overflow: hidden; background: var(--cm-bg); }
.xi-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
.xi-preview[data-bg="white"] { background: #fff; }
.xi-preview[data-bg="transparent"] { background-color: #fff; background-image: linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
/* A white or transparent image is previewed on paper, so draw the light-theme drawing */
:root .xi-preview[data-bg="white"] .k-dark-only, :root .xi-preview[data-bg="transparent"] .k-dark-only { display: none !important; }
:root .xi-preview[data-bg="white"] .k-light-only, :root .xi-preview[data-bg="transparent"] .k-light-only { display: block !important; }
.xi-preview[data-waiting] img { opacity: .45; }
.xi-bar { flex: 0 0 120px; }
.xi-bar > i { width: 35%; animation: xi-slide 1.4s ease-in-out infinite; }
@keyframes xi-slide { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
@media (prefers-reduced-motion: reduce) { .xi-bar > i { animation: none; width: 100%; opacity: .5; } }
.xi-in { width: 56px; height: 24px; box-sizing: border-box; padding: 0 6px; border: 0; border-radius: 5px; font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); }
.xi-in:focus { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.xi-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-height: 24px; }
.xi-sub { color: var(--cm-text-secondary); font-size: 11px; line-height: 15px; }
.xi-fallback { width: min(760px, calc(100vw - 48px)); height: min(560px, calc(100vh - 56px)); max-height: none; }
.xi-fallback .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: flex; }
`;
    if (!document.getElementById("xi-style")) document.head.append(h("style", { id: "xi-style" }, CSS));

    // ---------- the element's rules (graphty-element/src/screenshot) ----------
    const MAX_DIM = 16384;           // BROWSER_LIMITS.MAX_DIMENSION
    const MAX_PX = 33177600;         // BROWSER_LIMITS.MAX_PIXELS (8K)
    const WARN_PX = 8294400;         // BROWSER_LIMITS.WARN_PIXELS (4K)
    const SETTLE_S = 30;             // LAYOUT_SETTLE_TIMEOUT_MS / 1000
    const n = (v) => Math.round(v).toLocaleString("en-US");
    const mp = (px) => (px / 1e6).toFixed(1);
    function check(w, hgt) {
        const px = w * hgt;
        const mem = (px * 4) / (1024 * 1024);
        if (w > MAX_DIM || hgt > MAX_DIM) return { ok: false, mem, reason: `${n(w)} x ${n(hgt)} is wider or taller than this browser can capture (${n(MAX_DIM)} pixels).` };
        if (px > MAX_PX) return { ok: false, mem, reason: `${n(w)} x ${n(hgt)} is ${mp(px)} megapixels; this browser can capture up to ${mp(MAX_PX)}.` };
        return { ok: true, mem, near: px >= WARN_PX || mem > 100, px };
    }
    function canvasSize() {
        // size-refused models a high-density laptop screen, where the canvas is 3,024 x 1,712
        // device pixels and 4x passes the browser's limit
        if (shown === "size-refused") return { w: 3024, h: 1712 };
        const c = document.querySelector(".k-canvas");
        const r = c ? c.getBoundingClientRect() : null;
        const d = window.devicePixelRatio || 1;
        return r && r.width > 0 ? { w: Math.round(r.width * d), h: Math.round(r.height * d) } : { w: 1280, h: 800 };
    }

    // ---------- choices ----------
    const PRESETS = [
        { id: "print", label: "For print -- PNG, 4x, sharper", name: "For print", set: { format: "PNG", mode: "x", mult: 4, sharp: true, bg: "canvas" } },
        { id: "web-share", label: "To share -- PNG, 2x", name: "To share", set: { format: "PNG", mode: "x", mult: 2, sharp: false, bg: "canvas" } },
        { id: "thumbnail", label: "Thumbnail -- JPEG, 400 x 300", name: "Thumbnail", set: { format: "JPEG", mode: "px", w: 400, h: 300, quality: 85, sharp: false, bg: "canvas" } },
        { id: "documentation", label: "For documentation -- PNG, 2x, transparent", name: "For documentation", set: { format: "PNG", mode: "x", mult: 2, sharp: false, bg: "transparent" } },
    ];
    const MULTS = [1, 2, 4];
    const STANDARD = ["Fit", "Front", "Side", "Top", "Isometric"];   // the View flyout's standard views (3D)
    const BG = { canvas: "Canvas color", white: "White", transparent: "Transparent" };
    const EXT = { PNG: "png", JPEG: "jpg", WebP: "webp", SVG: "svg" };
    const LOSSY = (f) => f === "JPEG" || f === "WebP";   // only these take a Quality
    const NO_ALPHA = "JPEG cannot hold a transparent background.";
    const CLIP_INSECURE = "Copy needs a secure page (HTTPS), and this page is not one.";
    const CLIP_PNG = "The clipboard takes PNG images only.";

    let s = null;       // this visit's choices
    let shown = null;   // the state they belong to

    function fresh(state) {
        s = { format: "PNG", quality: 92, mode: "x", mult: 2, w: 0, h: 0, lock: true, mm: 174, dpi: 300, bg: "canvas", sharp: false, view: "Current camera", preset: "web-share", fell: null };
        if (state === "size-refused") applyPreset(PRESETS[0]);
        return s;
    }
    function applyPreset(p) {
        const c = canvasSize();
        Object.assign(s, { w: c.w, h: c.h }, p.set, { preset: p.id, fell: null });
        if (s.mode === "x" && !check(c.w * s.mult, c.h * s.mult).ok) {
            const ok = MULTS.filter((m) => check(c.w * m, c.h * m).ok).pop() || 1;
            s.fell = { preset: p.name, from: s.mult, to: ok };
            s.mult = ok;
        }
    }
    const edited = () => { s.preset = null; s.fell = null; };
    function outSize() {
        const c = canvasSize();
        return s.mode === "x" ? { w: c.w * s.mult, h: c.h * s.mult } : { w: s.w, h: s.h };
    }
    const viewSlug = () => (s.view === "Current camera" ? "" : "_" + s.view.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""));
    const fileName = () => `les-miserables${viewSlug()}.${EXT[s.format]}`;

    let redraw = () => {};
    let host = null;            // this section's overlay element
    let adv = null;             // the open Advanced popover: { el, anchor, off }

    // A dropdown field: one look for every choice in this body
    function drop(label, value, items) {
        const f = AB.field(value, { caret: true, onClick: (e) => AB.openMenu(e.currentTarget, items) });
        f.setAttribute("aria-haspopup", "menu");
        f.setAttribute("aria-label", label + ": " + (typeof value === "string" ? value : ""));
        return f;
    }

    // ---------- the Advanced popover ----------
    function closeAdv(refocus) {
        if (!adv) return;
        document.removeEventListener("pointerdown", adv.off, true);
        adv.el.remove();
        const a = adv.anchor;
        adv = null;
        if (refocus) { const f = host && host.querySelector("[data-adv]"); (f || a).focus(); }
    }
    function advBody() {
        const c = canvasSize();
        const aspect = c.w / c.h;
        const out = outSize();
        const num = (value, label, set, o) => h("input", Object.assign({ class: "xi-in", type: "number", min: "1", value: String(value), "aria-label": label,
            on: { change: (e) => { set(Math.max(1, Number(e.target.value) || 1)); edited(); refresh(label); } } }, o || {}));
        const px = Math.round((s.mm / 25.4) * s.dpi);
        const sharp = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(s.sharp), "aria-label": "Sharper rendering" });
        const flip = () => { s.sharp = !s.sharp; edited(); refresh("Sharper rendering"); };
        sharp.addEventListener("click", flip);
        sharp.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
        const toPx = () => { s.mode = "px"; s.w = out.w; s.h = out.h; };
        return [
            !LOSSY(s.format) ? null : AB.fieldRow("Quality", h("span", { class: "xi-line" }, num(s.quality, "Quality, 1 to 100", (v) => { s.quality = Math.min(100, v); }, { max: "100" }), h("span", { class: "xi-sub" }, "of 100")), { popover: true }),
            AB.fieldRow("Rendering", h("span", null, h("span", { class: "xi-line" }, sharp, "Sharper"), h("div", { class: "xi-sub" }, "Renders larger, then scales down; slower.")), { popover: true }),
            AB.fieldRow("Pixels", h("span", { class: "xi-line" },
                num(out.w, "Width in pixels", (v) => { toPx(); s.w = v; if (s.lock) s.h = Math.round(v / aspect); }), "x",
                num(out.h, "Height in pixels", (v) => { toPx(); s.h = v; if (s.lock) s.w = Math.round(v * aspect); }),
                AB.iconButton(s.lock ? "lock" : "lock-open", s.lock ? "Keep the canvas shape: on" : "Keep the canvas shape: off", { pressed: s.lock, onClick: () => { s.lock = !s.lock; if (s.lock && s.mode === "px") s.h = Math.round(s.w / aspect); refresh("lock"); } })), { popover: true }),
            AB.fieldRow("Print width", h("span", null, h("span", { class: "xi-line" },
                num(s.mm, "Print width in millimeters", (v) => { s.mm = v; s.mode = "px"; s.w = Math.round((v / 25.4) * s.dpi); s.h = s.lock ? Math.round(s.w / aspect) : out.h; }), "mm at",
                num(s.dpi, "Dots per inch", (v) => { s.dpi = v; s.mode = "px"; s.w = Math.round((s.mm / 25.4) * v); s.h = s.lock ? Math.round(s.w / aspect) : out.h; }), "dpi"),
                h("div", { class: "xi-sub" }, `${n(px)} pixels wide; changing it fills in Pixels.`)), { popover: true }),
        ];
    }
    function openAdv(anchor) {
        closeAdv();
        const el = AB.popover({ anchor, title: "Advanced", body: advBody(), width: 340, place: "below-start" });
        // This popover lives inside the dialog: X, Esc and an outside click close only the popover
        const x = el.querySelector(".k-popover-head .k-icon-btn");
        if (x) { const x2 = x.cloneNode(true); x2.addEventListener("click", () => closeAdv(true)); x.replaceWith(x2); }
        el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeAdv(true); } });
        el.addEventListener("click", (e) => e.stopPropagation());
        const off = (e) => { if (!el.contains(e.target) && !(adv && adv.anchor.contains(e.target)) && !e.target.closest(".k-menu")) closeAdv(); };
        adv = { el, anchor, off };
        host.append(el);
        document.addEventListener("pointerdown", off, true);
        requestAnimationFrame(() => { const f = el.querySelector("[data-autofocus]") || el.querySelector(".k-popover-body input, .k-popover-body [tabindex='0']"); if (f && !el.contains(document.activeElement)) f.focus(); });
    }
    // After a change inside the popover the body redraws; put the popover back, focus where it was
    function refresh(lab) {
        const was = !!adv;
        redraw();
        const a = host.querySelector("[data-adv]");
        if (!was || !a) return;
        openAdv(a);
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = adv && (lab === "lock" ? adv.el.querySelector(".k-icon-btn[aria-pressed]") : adv.el.querySelector(`[aria-label="${lab}"]`)); if (f) f.focus(); }));
    }

    // ---------- the body ----------
    function callout(state, chk) {
        const c = canvasSize();
        const call = (tone, ico, ...kids) => h("div", { class: "xi-call", "data-tone": tone, role: tone === "error" ? "alert" : "status" }, icon(ico, "sm"), h("span", null, kids));
        if (state === "failed") return call("error", "circle-x", h("b", null, "No image was made. "), `The layout did not settle within ${SETTLE_S} seconds. Capture the graph as it is now, or try again.`);
        if (!chk.ok) return call("error", "circle-x", h("b", null, "This size cannot be captured. "), chk.reason, " Choose a smaller size.");
        const mem = chk.near ? `At ${mp(chk.px)} megapixels, capturing needs about ${n(chk.mem)} MB of memory and may fail on computers with less.` : null;
        if (state === "waiting-to-settle") return call("info", "info", h("span", { class: "xi-line" }, `Waiting for the layout to settle (up to ${SETTLE_S} seconds) before capturing.`, h("span", { class: "k-progress xi-bar", role: "progressbar", "aria-label": "Waiting for the layout to settle" }, h("i"))));
        if (s.fell) return call("warning", "triangle-alert", `${s.fell.preset} asks for ${s.fell.from}x, more than this browser can capture from a ${n(c.w)} x ${n(c.h)} canvas, so the size is ${s.fell.to}x. `, mem);
        if (mem) return call("warning", "triangle-alert", "Large image. ", mem);
        if (state === "clipboard-refused") return call("info", "info", CLIP_INSECURE, " Export still saves the file.");
        return null;
    }

    function body(state) {
        const c = canvasSize();
        const out = outSize();
        const chk = check(out.w, out.h);
        const busy = state === "waiting-to-settle";
        const P = PRESETS.find((p) => p.id === s.preset);

        const preset = drop("Preset", P ? P.label : "Custom", PRESETS.map((p) => ({ label: p.label, check: s.preset === p.id, onClick: () => { applyPreset(p); redraw(); } })));

        const sizeItems = MULTS.map((m) => {
            const k = check(c.w * m, c.h * m);
            return { label: `${m}x -- ${n(c.w * m)} x ${n(c.h * m)}`, check: s.mode === "x" && s.mult === m, disabled: k.ok ? false : k.reason, onClick: () => { s.mode = "x"; s.mult = m; edited(); redraw(); } };
        });
        sizeItems.push({ sep: true }, { label: "Custom...", check: s.mode === "px", onClick: () => { const a = host.querySelector("[data-adv]"); if (a) openAdv(a); } });
        const size = drop("Size", s.mode === "x" ? `${s.mult}x -- ${n(out.w)} x ${n(out.h)}` : `Custom -- ${n(out.w)} x ${n(out.h)}`, sizeItems);

        const fmtItem = (f) => ({ label: f, check: s.format === f, disabled: f === "JPEG" && s.bg === "transparent" ? NO_ALPHA + " Change Background first." : false, onClick: () => { s.format = f; edited(); redraw(); } });
        const format = drop("Format", s.format, [fmtItem("PNG"), fmtItem("JPEG"), fmtItem("WebP"),
            // SVG needs graphty-element (it captures the canvas as pixels only; a vector export is filed).
            // Spec 12.1 draws it disabled with its reason in every view, so `disabled`, not `needs` (which user tests hide).
            { label: "SVG", desc: "A vector figure: stays sharp at any size, for papers and slides",
                disabled: "Not available yet" }]);

        const pickView = (v) => ({ label: v, check: s.view === v, onClick: () => { s.view = v; edited(); redraw(); } });
        const view = drop("View", s.view, [pickView("Current camera"), { sep: true }, { heading: "Standard views" }, ...STANDARD.map(pickView), { sep: true }, { heading: "Your views" }, ...AB.SAVED_VIEWS.map(pickView)]);

        const bgItem = (id) => ({ label: BG[id], check: s.bg === id,
            disabled: id === "transparent" && s.format === "JPEG" ? NO_ALPHA + " Choose PNG or WebP." : false,
            onClick: () => { s.bg = id; edited(); redraw(); } });
        const bg = drop("Background", BG[s.bg], ["canvas", "white", "transparent"].map(bgItem));

        const advSum = [!LOSSY(s.format) ? null : "Quality " + s.quality, s.sharp ? "Sharper rendering" : "Standard rendering"].filter(Boolean).join(", ");
        const advField = AB.field(advSum, { icon: "sliders-horizontal", onClick: (e) => (adv ? closeAdv(true) : openAdv(e.currentTarget)) });
        advField.setAttribute("data-adv", "");
        advField.setAttribute("aria-haspopup", "dialog");
        advField.setAttribute("aria-label", "Advanced: " + advSum);

        const fields = h("div", { class: "xi-fields" + (busy ? " xi-busy" : ""), "aria-disabled": busy ? "true" : null, "aria-description": busy ? "Unavailable while waiting for the layout to settle" : null, inert: busy ? "" : null },
            AB.fieldRow("Preset", preset, { popover: true }),
            AB.fieldRow("Size", size, { popover: true }),
            AB.fieldRow("Format", format, { popover: true }),
            AB.fieldRow("View", view, { popover: true }),
            AB.fieldRow("Background", bg, { popover: true }),
            AB.fieldRow("Advanced", advField, { popover: true }));

        const title = h("div", { class: "xi-title" }, icon("camera"), "Image", h("span", { class: "k-secondary", style: "font-weight:400" }, "." + EXT[s.format]));
        const summary = h("div", { class: "xi-sum" }, "Full graph - legend not drawn",
            AB.needsElement("graphty-element captures the canvas only; drawing the legend into an image is filed for the element."));

        const draw = (AB.lesmisDrawing || AB.drawing)("lesmis-groups-rest", "Preview: Les Miserables as the canvas draws it" + (s.view === "Current camera" ? "" : ", from " + s.view));
        const preview = h("div", { class: "xi-preview", "data-bg": s.bg, "data-waiting": busy ? "" : null }, draw);

        return h("div", { class: "xi-main" }, title, summary, fields, callout(state, chk), h("div", { class: "xi-h" }, "Preview"), preview);
    }

    // ---------- the footer ----------
    function finish(how) {
        const out = outSize();
        const text = how === "copy" ? `Copied a ${n(out.w)} x ${n(out.h)} image of les-miserables to the clipboard` : `Exported ${fileName()} to Downloads`;
        closeAdv();
        AB.close();
        setTimeout(() => AB.notice(text), 50);
    }
    function start(how) {
        if (AB.layoutState === "running") { pending = how; AB.go("export-image", "waiting-to-settle"); }
        else finish(how);
    }
    let pending = "export";

    function foot(state) {
        const out = outSize();
        const chk = check(out.w, out.h);
        const cancel = AB.button("Cancel", { kind: "ghost", onClick: () => { closeAdv(); AB.close(); } });
        const now = AB.button("Capture now", { icon: "camera", onClick: () => finish(pending) });
        if (state === "waiting-to-settle") {
            return [
                cancel,
                AB.button("Stop waiting", { kind: "secondary", onClick: () => AB.go("export-image", "image") }),
                now,
            ];
        }
        if (state === "failed") {
            return [
                cancel,
                AB.button("Try again", { kind: "secondary", onClick: () => AB.go("export-image", "waiting-to-settle") }),
                now,
            ];
        }
        const sizeNo = chk.ok ? null : chk.reason;
        const copyNo = sizeNo || (state === "clipboard-refused" ? CLIP_INSECURE : s.format !== "PNG" ? CLIP_PNG : null);
        return [
            cancel,
            AB.button("Copy", { kind: "secondary", icon: "copy", disabled: copyNo || false, onClick: () => start("copy") }),
            AB.button("Export", { icon: "download", disabled: sizeNo || false, onClick: () => start("export") }),
        ];
    }

    function render(el, state) {
        if (state === "waiting") state = "waiting-to-settle";   // old stub id, kept as an alias
        if (shown !== state || !s) {
            const keep = s && (state === "waiting-to-settle" || state === "failed") && (shown === "image" || shown === "waiting-to-settle" || shown === "failed");
            shown = state;
            if (!keep) fresh(state);
        }
        host = el;
        adv = null;
        const draw = () => {
            const b = body(state);
            const f = foot(state);
            if (AB.exportDialogFrame) { el.append(AB.exportDialogFrame("image", b, f)); return; }
            const m = AB.modal({ title: "Export", body: b, foot: f });
            m.querySelector(".k-modal").classList.add("xi-fallback");
            el.append(m);
        };
        redraw = () => { closeAdv(); el.textContent = ""; draw(); };
        draw();
        if (state === "advanced") requestAnimationFrame(() => { const a = el.querySelector("[data-adv]"); if (a) openAdv(a); });
    }

    registerSection({
        id: "export-image",
        title: "Export: image",
        region: "overlay",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "image", label: "Image, the last choices" },
            { id: "size-refused", label: "For print on a high-density screen: 4x refused, 2x used" },
            { id: "clipboard-refused", label: "Copy refused: not a secure page" },
            { id: "waiting-to-settle", label: "Waiting for the layout to settle" },
            { id: "failed", label: "Failed: the layout did not settle" },
            { id: "advanced", label: "The Advanced popover open" },
        ],
        render,
    });
})();
