/* Export > Video: graphty-element's captureAnimation, drawn inside the shared Export dialog frame
   (AB.exportDialogFrame, published by export-dialog.js) with Video lit in its list. Fields: View
   (the current camera, a standard view, a saved view, or Tour of saved views), Length, Size and
   Frame rate; an Advanced popover holds format, bitrate, transparency and easing. A tour's stops
   are the views checked In tour in the Views place, in its order, each a name and a Hold time.
   The element's estimate (estimateAnimationCapture) is the one callout; while recording, one
   progress bar in the footer; Done is one callout line and Close, Record again at 24 fps, Export.
   Plain ASCII. Styles injected below under the xv- prefix. */
(function () {
    "use strict";
    const CSS = `
.xv-set[inert] { opacity: .55; }
.xv-set[inert] [role=button], .xv-set[inert] .k-field { cursor: default; }
.xv-num { width: 56px; height: 24px; box-sizing: border-box; padding: 0 6px; border: 0; border-radius: 5px; font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); }
.xv-num:focus { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.xv-stops { display: grid; grid-template-columns: minmax(0, max-content) auto; gap: 4px 16px; align-items: center; }
.xv-stops .xv-hold { display: inline-flex; gap: 4px; align-items: center; color: var(--cm-text-secondary); }
.xv-sub { color: var(--cm-text-secondary); }
.xv-prev { margin: 0 0 0 16px; max-width: 360px; border-radius: 2px; box-shadow: 0 0 0 1px var(--cm-border); overflow: hidden; background: var(--cm-bg); }
.xv-prev img { width: 100%; height: auto; display: block; }
.xv-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 8px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xv-footl .k-progress { flex: 0 0 120px; }
.xv-footl { flex: 0 0 auto; }
`;
    if (!document.getElementById("xv-style")) document.head.append(h("style", { id: "xv-style" }, CSS));

    const STANDARD = ["Fit", "Front", "Side", "Top", "Isometric"]; // the element's camera catalog in 3D
    const TOUR = "Tour of saved views";
    const IN_TOUR = AB.SAVED_VIEWS.slice(0, 2); // the views checked In tour, in the Views place's order
    const TOUR_2D = "A tour needs 3D: graphty-element's tour stop is a 3D position and target, not a 2D view";
    const SIZES = ["Canvas size", "Canvas at 2x", "1080p, 1920 x 1080", "4K, 3840 x 2160"];
    const BITRATES = ["2.5 Mbps", "5 Mbps", "8 Mbps", "16 Mbps", "40 Mbps"];
    const EASINGS = ["Ease in and out", "Linear", "Ease in", "Ease out"];
    const ALIAS = { orbit: "still", "layout-settling": "still" }; // old state ids other files link to

    let s = null;       // this visit's choices
    let shown = null;   // the state they belong to
    let adv = false;    // the Advanced popover is open
    let again24 = false; // "Record again at 24 fps" was pressed
    let redraw = () => {};

    function fresh(state) {
        const tour = ["tour", "estimate-warning", "recording", "done", "failed"].includes(state);
        const heavy = ["estimate-warning", "recording", "done", "failed"].includes(state);
        return { view: tour ? TOUR : "Current camera", length: 12, holds: IN_TOUR.map(() => 4),
            size: heavy ? SIZES[3] : SIZES[2], fps: heavy ? 60 : 30,
            format: "Automatic", bitrate: "5 Mbps", transparent: false, easing: EASINGS[0] };
    }
    // Stand-in for the element's estimate: it predicts dropped frames for 4K above 24 fps.
    const drops = () => s.size === SIZES[3] && s.fps > 24;
    const ext = () => (s.format === "MP4" ? ".mp4" : ".webm");
    const isTour = () => s.view === TOUR;
    const secs = () => (isTour() ? s.holds.reduce((a, b) => a + b, 0) : s.length);
    const file = () => "les-miserables_" + (isTour() ? "tour" : "canvas") + ext();
    const change = (fn) => () => { fn(); redraw(); };

    function num(value, label, set, f) {
        return h("input", { class: "xv-num", type: "number", min: "1", max: "120", value: String(value), "aria-label": label, "data-f": f,
            on: { change: (e) => { set(Math.max(1, Math.min(120, Number(e.target.value) || 1))); redraw(); } } });
    }
    function pick(anchorEl, list, value, set, disabled) {
        AB.openMenu(anchorEl, list.map((x) => (typeof x !== "string" ? x : { label: x, check: x === value, disabled: disabled && disabled(x), onClick: () => { set(x); redraw(); } })));
    }
    function dropdown(value, label, f, onOpen) {
        const fl = AB.field(value, { caret: true, onClick: (e) => onOpen(e.currentTarget) });
        fl.setAttribute("aria-label", label + ": " + value);
        fl.setAttribute("tabindex", "0");
        fl.dataset.f = f;
        return fl;
    }

    // ---------- the body ----------
    function body(state) {
        const in2d = state === "tour-2d-disabled";
        const busy = state === "recording";
        const done = state === "done";

        const viewItems = [
            "Current camera", { sep: true }, { heading: "Standard views" }, ...STANDARD,
            { sep: true }, { heading: "Your views" }, ...AB.SAVED_VIEWS, { sep: true }, TOUR,
        ];
        const viewField = dropdown(s.view, "View", "view", (a) => pick(a, viewItems, s.view, (v) => { s.view = v; }, (x) => (x === TOUR && in2d ? TOUR_2D : false)));

        const stops = isTour() ? h("div", { class: "xv-stops", role: "group", "aria-label": "Tour stops" },
            IN_TOUR.map((v, i) => [
                AB.link("inspector-saved-view", null, v, { class: "k-ellipsis" }),
                h("span", { class: "xv-hold" }, "Hold", num(s.holds[i], "Hold at " + v + ", seconds", (x) => { s.holds[i] = x; }, "hold" + i), "s"),
            ])) : null;

        const set = h("div", { class: "ex-set xv-set", inert: busy || done ? "" : null, "aria-disabled": busy || done ? "true" : null, "aria-description": busy ? "Unavailable while recording" : done ? "The video is made; Record again to change it" : null },
            AB.fieldRow("View", h("span", { class: "ex-ctl" }, viewField,
                in2d ? AB.needsElement("graphty-element records 2D video, but its tour stop (CameraWaypoint) takes only a 3D position and target. It should take a camera state or a saved view name.") : null), { popover: true }),
            stops ? AB.fieldRow("Stops", h("span", { class: "ex-ctl", style: "flex-direction:column;align-items:flex-start" }, stops,
                h("span", { class: "xv-sub" }, "Which views and their order: ", AB.link("views-place", "at-rest", "Views"), " ",
                    AB.needsElement("graphty-element's tour stop is a position, a target and the time to reach it: it takes no saved view and has no hold time"))), { popover: true }) : null,
            !isTour() ? AB.fieldRow("Length", h("span", { class: "ex-ctl" }, num(s.length, "Length, seconds", (x) => { s.length = x; }, "length"), h("span", { class: "xv-sub" }, "seconds")), { popover: true }) : null,
            AB.fieldRow("Size", h("span", { class: "ex-ctl" }, dropdown(s.size, "Size", "size", (a) => pick(a, [...SIZES, { sep: true }, { label: "Custom...", onClick: () => AB.flash("Custom size (not available yet)") }], s.size, (v) => { s.size = v; }))), { popover: true }),
            AB.fieldRow("Frame rate", h("span", { class: "ex-ctl", "data-f": "fps" }, AB.seg([[24, "24"], [30, "30"], [60, "60"]], s.fps, (v) => { s.fps = v; redraw(); }, { label: "Frame rate, frames per second" }), h("span", { class: "xv-sub" }, "fps")), { popover: true }),
            AB.fieldRow("", h("span", { class: "ex-ctl" }, AB.button("Advanced", { kind: "secondary", icon: "sliders-horizontal", onClick: () => { adv = !adv; redraw(); } })), { popover: true }));
        const advBtn = set.querySelector(".k-btn");
        advBtn.dataset.f = "advanced";
        advBtn.setAttribute("aria-haspopup", "dialog");
        advBtn.setAttribute("aria-expanded", String(adv));

        // The one callout: the element's estimate before, the result after; nothing while recording.
        let call = null;
        if (state === "failed") {
            // graphty-element rejects captureAnimation with VIDEO_CAPTURE_FAILED and the recorder's message.
            const planned = secs() * s.fps;
            call = AB.problem({
                what: `Recording stopped at frame ${Math.round(planned * 0.43)} of ${planned}: the browser's video recorder reported an encoder error. Nothing was saved.`,
                todo: "Try again with the same settings, or choose a smaller Size first.",
                action: { label: "Try again", go: ["export-video", "recording"] },
            });
        } else if (done) {
            const planned = secs() * s.fps;
            call = AB.exportCallout("warning", h("span", null, `Recorded ${secs()} s; 3 of ${planned} frames dropped, so playback stutters in places.`));
        } else if (!busy && drops()) {
            call = AB.exportCallout("warning", h("span", null, `This computer is likely to drop frames at ${s.fps} fps in 4K. At 24 fps it expects to keep every frame.`),
                AB.button("Use 24 fps", { kind: "secondary", onClick: change(() => { s.fps = 24; }) }));
        }

        const summary = [`Full graph - ${secs()} s - ${AB.legendOn() ? "with the legend" : "no legend (the legend is off)"} `, AB.needsElement("graphty-element draws the legend card into each captured frame, at the video's scale.")];

        return h("div", { class: "ex-main" },
            AB.exportHead(["Video ", h("span", { class: "k-secondary", style: "font-weight:400" }, ext())], summary),
            set, call,
            h("div", { class: "ex-h" }, "Preview"),
            h("div", { class: "xv-prev" }, AB.canvasCopy("First frame: ") || AB.drawing("lesmis-groups-rest",
                "First frame: Les Miserables from " + (isTour() ? IN_TOUR[0] : s.view.toLowerCase()))));
    }

    // ---------- the Advanced popover (the shared popover; closes back to this dialog, not out of it) ----------
    function advanced(el, state) {
        const anchor = el.querySelector("[data-f=advanced]");
        const mp4 = s.format === "MP4";
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: mp4 ? "-1" : "0", "aria-checked": String(s.transparent), "aria-disabled": mp4 ? "true" : null,
            "aria-label": "Transparent background", "data-f": "transparent", style: mp4 ? "opacity:.5" : "cursor:pointer",
            on: { click: () => { if (!mp4) { s.transparent = !s.transparent; redraw(); } }, keydown: (e) => { if (e.key === " " && !mp4) { e.preventDefault(); s.transparent = !s.transparent; redraw(); } } } });
        if (mp4) AB.tip(box, "Transparent background", { second: "MP4 cannot hold transparency; choose WebM or Automatic" });
        const easing = isTour() && dropdown(s.easing, "Easing", "easing", (a) => pick(a, EASINGS, s.easing, (v) => { s.easing = v; }));
        const bodyEl = [
            AB.fieldRow("Format", h("span", { "data-f": "format" }, AB.seg([["Automatic", "Automatic"], ["WebM", "WebM"], ["MP4", "MP4"]], s.format, (v) => { s.format = v; if (v === "MP4") s.transparent = false; redraw(); }, { label: "Format" })), { popover: true }),
            AB.fieldRow("Bitrate", dropdown(s.bitrate, "Bitrate", "bitrate", (a) => pick(a, BITRATES, s.bitrate, (v) => { s.bitrate = v; })), { popover: true }),
            AB.fieldRow("Background", h("label", { class: "ex-chk" }, box, "Transparent"), { popover: true }),
            AB.fieldRow("Easing", isTour() ? easing : h("span", { class: "xv-sub", style: "line-height:24px" }, "Only a tour moves the camera"), { popover: true }),
        ];
        const p = AB.popover({ anchor, place: "right-start", title: "Advanced", body: bodyEl, width: 320 });
        p.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: closeAdv }));
        el.append(p);
    }
    let off = null;
    function closeAdv() {
        adv = false;
        redraw();
        const b = document.querySelector("#ab-overlay [data-f=advanced]");
        if (b) b.focus();
    }
    function watchAdv(el) {
        if (off) off();
        if (!adv) { off = null; return; }
        const key = (e) => { if (e.key === "Escape" && !document.querySelector("#ab-overlay .k-menu")) { e.preventDefault(); e.stopPropagation(); closeAdv(); } };
        const down = (e) => { const p = el.querySelector(".k-popover"); if (p && !p.contains(e.target) && !e.target.closest(".k-menu, [data-f=advanced]")) closeAdv(); };
        document.addEventListener("keydown", key, true);
        document.addEventListener("pointerdown", down, true);
        off = () => { document.removeEventListener("keydown", key, true); document.removeEventListener("pointerdown", down, true); };
    }
    window.addEventListener("hashchange", () => { adv = false; if (off) { off(); off = null; } });

    // ---------- the footer ----------
    function foot(state) {
        if (state === "recording") {
            const planned = secs() * s.fps;
            return [
                h("span", { class: "xv-footl", role: "status" },
                    h("span", { class: "k-progress", role: "progressbar", "aria-label": "Recording", "aria-valuemin": "0", "aria-valuemax": String(planned), "aria-valuenow": String(planned / 2) }, h("i", { style: "width:50%" })),
                    `Frame ${planned / 2} of ${planned}` + (isTour() ? `, ${IN_TOUR[0]}` : "")),
                AB.button("Cancel", { kind: "secondary", onClick: () => { AB.go("export-video", "estimate-warning"); setTimeout(() => AB.notice("Recording canceled; nothing was saved."), 50); } }),
            ];
        }
        if (state === "failed") return [AB.button("Close", { kind: "ghost", onClick: () => AB.close() })];
        if (state === "done") {
            return [
                AB.button("Close", { kind: "ghost", onClick: () => AB.close() }),
                AB.button("Record again at 24 fps", { kind: "secondary", onClick: () => { again24 = true; AB.go("export-video", "recording"); } }),
                AB.button("Export", { icon: "download", onClick: () => AB.exportDone(file()) }),
            ];
        }
        return [
            AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
            AB.button("Record", { icon: "circle-dot", go: ["export-video", "recording"] }),
        ];
    }

    function render(el, rawState) {
        const state = ALIAS[rawState] || rawState;
        if (shown !== state || !s) { shown = state; s = fresh(state); adv = false; if (again24) s.fps = 24; again24 = false; }
        if (state === "tour-2d-disabled" && isTour()) s.view = "Current camera";
        redraw = () => {
            const f = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-f]");
            const k = f && f.dataset.f;
            el.textContent = "";
            draw();
            const again = k && el.querySelector(`[data-f="${k}"]`);
            if (again) (again.matches("input, [tabindex], button") ? again : again.querySelector("[tabindex='0'], input, button") || again).focus();
        };
        const draw = () => {
            const b = body(state);
            const ft = foot(state);
            el.append(AB.exportDialogFrame("video", b, ft));
            if (adv) advanced(el, state);
            watchAdv(el);
        };
        el.textContent = "";
        draw();
    }

    registerSection({
        id: "export-video",
        title: "Export: video",
        region: "overlay",
        rail: "graph",
        frame: (state) => ({ left: "graph-place/at-rest", mode: state === "tour-2d-disabled" ? "2d" : "3d" }),
        closeTo: "graph-place",
        states: [
            { id: "still", label: "Still camera, before" },
            { id: "tour", label: "Tour, before" },
            { id: "estimate-warning", label: "Estimate warns" },
            { id: "recording", label: "Recording" },
            { id: "done", label: "Done" },
            { id: "failed", label: "Failed: recording stopped" },
            { id: "tour-2d-disabled", label: "2D: Tour off" },
        ],
        render,
    });
})();
