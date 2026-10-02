/* Export > Image: graphty-element's captureScreenshot, inside the one Export dialog with Image
   selected in its list (AB.exportDialogFrame, published by export-dialog.js).

   Body: the dialog's head (title with the extension, the summary line), one callout (the dialog's
   callout, or the problem block when no image can be made), the
   preview (above the fold, exactly what the file gets, legend included), the line naming the labels
   hidden to avoid overlap (its list selects a node), then five dropdown fields (Preset, Size,
   Format, View, Background), the Legend line and an Advanced field that opens a light popover
   (quality for JPEG and WebP, sharper rendering, custom pixels with the aspect lock, print width).

   Legend: there is one legend state (AB.legendOn), shared by the canvas, Present and this image;
   its only doors are the toolbar's Legend button and L. This body has no legend switch: the Legend
   line says what the image carries. The image's legend adds a footer with the weight and the
   scaling the colors used. SVG (the owner's figure format) is listed disabled with the
   needs-graphty-element chip, since the element's capture is pixels only today; PDF comes later
   and is not listed. Footer: the one footer note, Cancel, Copy, Export; while waiting
   for the layout to settle, the progress takes the note's place. After a copy or an export the
   dialog closes and one notice names the file.

   Numbers follow the element's own rules in graphty-element/src/screenshot: dimensions.ts
   BROWSER_LIMITS, the capability-check.ts memory formula, presets.ts, constants.ts settle timeout,
   clipboard.ts (needs a secure page) and ScreenshotCapture.ts (transparency needs PNG or WebP).
   Plain ASCII. Styles injected below. */
(function () {
    "use strict";
    const CSS = `
.xi-main > .ab-problem, .xi-preview, .xi-fields { margin-left: 16px; }
.xi-fields { max-width: 400px; }
.xi-fields .ab-frow { padding: 0; }
.xi-fields .k-field { width: 100%; box-sizing: border-box; }
.xi-busy { opacity: .5; pointer-events: none; }
.xi-busy [role=button], .xi-busy .k-field { cursor: default; }
.xi-preview { position: relative; max-width: calc(100% - 16px); box-sizing: border-box; width: 400px; aspect-ratio: 16 / 10; border-radius: 2px; box-shadow: 0 0 0 1px var(--cm-border); overflow: hidden; background: var(--cm-bg); }
.xi-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
.xi-preview[data-bg="white"] { background: #fff; }
.xi-preview[data-bg="transparent"] { background-color: #fff; background-image: linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
/* A white or transparent image is previewed on paper, so draw the light-theme drawing */
:root .xi-preview[data-bg="white"] .k-dark-only, :root .xi-preview[data-bg="transparent"] .k-dark-only { display: none !important; }
:root .xi-preview[data-bg="white"] .k-light-only, :root .xi-preview[data-bg="transparent"] .k-light-only { display: block !important; }
.xi-preview[data-waiting] > * { opacity: .45; }
/* The canvas's own legend card, scaled with the drawing (its shadow and theme follow the image's background) */
.xi-preview .k-legend-card { top: 0; left: 0; bottom: auto; transform-origin: 0 0; pointer-events: none; }
.xi-bar { flex: 0 0 120px; }
.xi-bar > i { width: 35%; animation: xi-slide 1.4s ease-in-out infinite; }
@keyframes xi-slide { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
@media (prefers-reduced-motion: reduce) { .xi-bar > i { animation: none; width: 100%; opacity: .5; } }
.xi-in { width: 56px; height: 24px; box-sizing: border-box; padding: 0 6px; border: 0; border-radius: 5px; font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); }
.xi-in:focus { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.xi-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-height: 24px; }
.xi-sub { color: var(--cm-text-secondary); font-size: 11px; line-height: 15px; }
.xi-hid { margin-left: 16px; }
.xi-fields .xi-line { width: 100%; flex-wrap: nowrap; }
.xi-fields .xi-line > .k-field { flex: 1 1 auto; min-width: 0; }
.xi-hid-list { margin: 4px 0 0; max-width: 400px; max-height: 168px; overflow: auto; box-shadow: 0 0 0 1px var(--cm-border); border-radius: 2px; }
.xi-preview .k-legend-card .xi-lg-foot { border-top: 1px solid var(--cm-border); margin-top: 4px; padding-top: 4px; line-height: 15px; color: var(--cm-text-secondary); }
`;
    if (!document.getElementById("xi-style")) document.head.append(h("style", { id: "xi-style" }, CSS));

    // ---------- the element's rules (graphty-element/src/screenshot) ----------
    const MAX_DIM = 16384;           // BROWSER_LIMITS.MAX_DIMENSION
    const MAX_PX = 33177600;         // BROWSER_LIMITS.MAX_PIXELS (8K)
    const WARN_PX = 8294400;         // BROWSER_LIMITS.WARN_PIXELS (4K)
    const SETTLE_S = 30;             // LAYOUT_SETTLE_TIMEOUT_MS / 1000
    const n = (v) => AB.num(Math.round(v));
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
    const EXT = { PNG: "png", JPEG: "jpg", WebP: "webp" };
    const LOSSY = (f) => f === "JPEG" || f === "WebP";   // only these take a Quality
    const NO_ALPHA = "JPEG cannot hold a transparent background.";
    const CLIP_INSECURE = "Copy needs a secure page (HTTPS), and this page is not one.";
    const CLIP_PNG = "The clipboard takes PNG images only.";

    let s = null;       // this visit's choices
    let shown = null;   // the state they belong to
    let hidOpen = false; // the hidden-labels list is open

    function fresh(state) {
        hidOpen = false;
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

    // A checkbox: one look for every yes or no in this body
    function check2(label, on, flip) {
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-label": label });
        box.addEventListener("click", flip);
        box.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
        return box;
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
        const sharp = check2("Sharper rendering", s.sharp, () => { s.sharp = !s.sharp; edited(); refresh("Sharper rendering"); });
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
        anchor.scrollIntoView({ block: "nearest" });
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
        const call = (tone, ico, ...kids) => AB.exportCallout(tone, h("span", null, kids));
        if (state === "failed") return AB.problem({ what: `No image was made: the layout did not settle within ${SETTLE_S} seconds.`, todo: "Capture the graph as it is now, or try again." });
        if (!chk.ok) return AB.problem({ what: "This size cannot be captured. " + chk.reason, todo: "Choose a smaller size." });
        const mem = chk.near ? `At ${mp(chk.px)} megapixels, capturing needs about ${n(chk.mem)} MB of memory and may fail on computers with less.` : null;
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
            // SVG: listed, disabled with the chip until graphty-element writes SVG figures
            { label: "SVG", desc: "A vector figure: stays sharp at any size, for papers and slides", needs: "graphty-element writes the graph as an SVG figure (it captures pixels only today)." }]);

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
            AB.fieldRow("Legend", h("span", { class: "xi-line" }, AB.legendOn() ? "As on the canvas, shown in the preview" : "None: the canvas shows no legend",
                AB.needsElement("graphty-element draws the legend card into the captured image, at the image's scale, with its footer.")), { popover: true }),
            AB.fieldRow("Advanced", advField, { popover: true }));

        const head = AB.exportHead(["Image ", h("span", { class: "k-secondary", style: "font-weight:400" }, "." + EXT[s.format])],
            AB.legendOn() ? "Full graph, with the legend" : "Full graph, no legend");

        const draw = previewArt() || (AB.lesmisDrawing || AB.drawing)("lesmis-groups-rest", "Preview: Les Miserables as the canvas draws it" + (s.view === "Current camera" ? "" : ", from " + s.view));
        const preview = h("div", { class: "xi-preview", "data-bg": s.bg, "data-waiting": busy ? "" : null }, draw, previewLegend());

        return h("div", { class: "ex-main xi-main" }, head, callout(state, chk), preview, hiddenLabels(), fields);
    }

    // The canvas drawing, copied. On a direct load the canvas's image may not have its picture yet
    // (it is painted after a fetch), and a copy taken then stays empty: it takes the picture when
    // the canvas's own image gets it. ponytail: AB.canvasCopy could do this for every caller
    function previewArt() {
        const copy = AB.canvasCopy("Preview: ");
        if (!copy) return null;
        const art = [...document.querySelectorAll("#ab-canvas .k-stage > img, #ab-canvas .k-stage > svg")];
        copy.forEach((c, i) => {
            const o = art[i];
            if (c.tagName !== "IMG" || c.getAttribute("src") || !o) return;
            c.hidden = true; // no broken-image icon while the picture is on its way
            o.addEventListener("load", () => { c.src = o.src; c.hidden = false; }, { once: true });
        });
        return copy;
    }

    // The labels the image leaves out to avoid overlap: the kit's drawing names these 13 nodes and
    // graphty-element hides every other label where they would overlap.
    // ponytail: the drawing's fixed label set; label lines a row adds are not counted
    const LABELED = ["Valjean", "Gavroche", "Marius", "Javert", "Fantine", "Enjolras", "Courfeyrac", "Bossuet", "Bahorel", "Mme.Thenardier", "Cosette", "Eponine", "Myriel"];
    function hiddenLabels() {
        const rows = AB.fx.datasets.lesmis.rows;
        const hid = rows.map((r, i) => ({ r, i })).filter(({ r }) => !LABELED.includes(r.label)).sort((a, b) => b.r.degree - a.r.degree);
        if (!hid.length) return null;
        const toggle = h("span", Object.assign({ class: "ab-link", role: "button", "aria-expanded": String(hidOpen) }, AB.act({ onClick: () => { hidOpen = !hidOpen; redraw(); requestAnimationFrame(() => { const t = host && host.querySelector(".xi-hid [aria-expanded]"); if (t) t.focus(); }); } })), hidOpen ? "hide list" : "show list");
        return h("div", { class: "xi-hid" },
            h("div", { class: "xi-line" }, AB.count(hid.length, "label") + " hidden to avoid overlap:", toggle,
                AB.needsElement("graphty-element reports which labels it hid to avoid overlap.")),
            hidOpen ? h("div", { class: "xi-hid-list", role: "list", "aria-label": "Labels hidden to avoid overlap" },
                hid.map(({ r, i }) => { const x = AB.row({ label: r.label, trail: "degree " + r.degree, onClick: () => { closeAdv(); AB.selectNode("lesmis", i); } }); x.setAttribute("role", "listitem"); return x; })) : null);
    }

    // The canvas's legend card, cloned and scaled to the preview, so the preview shows the legend the
    // image will carry. Nothing while the legend is off.
    function previewLegend() {
        const card = AB.legendOn() && document.querySelector("#ab-canvas .k-legend-card");
        const c = document.querySelector(".k-canvas");
        if (!card || !c || !c.getBoundingClientRect().width) return null;
        const k = Math.min(1, 400 / c.getBoundingClientRect().width);
        const copy = card.cloneNode(true);
        copy.removeAttribute("id");
        copy.setAttribute("aria-label", "In the image: " + (card.getAttribute("aria-label") || "Legend"));
        copy.style.transform = `translate(${12 * k}px, ${12 * k}px) scale(${k})`;
        // The image's legend says how its numbers were made (the measure inspector's PageRank: the
        // loaded weight value, damping 0.85; the ramp runs from the lowest value to the highest)
        if (/PageRank/.test(card.textContent)) copy.append(h("div", { class: "xi-lg-foot" }, "Weighted by value, the loaded weight. PageRank damping 0.85; colors scaled from the lowest to the highest value."));
        return copy;
    }

    // ---------- the footer ----------
    function finish(how) {
        const out = outSize();
        closeAdv();
        if (how !== "copy") { AB.exportDone(fileName()); return; }
        AB.close();
        setTimeout(() => AB.notice(`Copied a ${n(out.w)} x ${n(out.h)} image of les-miserables to the clipboard`), 50);
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
            const m = AB.exportDialogFrame("image", b, f);
            // While waiting, the footer's left side is the progress, in place of the footer note
            const note = state === "waiting-to-settle" && m.querySelector(".ex-footl");
            if (note) note.replaceWith(h("span", { class: "ex-footl", role: "status" },
                h("span", { class: "k-progress xi-bar", role: "progressbar", "aria-label": "Waiting for the layout to settle" }, h("i")),
                `Waiting for the layout to settle (up to ${SETTLE_S} seconds)...`));
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
