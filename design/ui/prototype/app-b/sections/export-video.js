/* Export: video. The Export dialog's frame (the list of outputs on the left, the chosen output on
   the right) with Video selected. Backed by graphty-element's captureAnimation: a still camera
   (records what happens on screen, such as the layout settling) or a tour through the checked
   saved views in list order. Before recording, the element's estimate; while recording, progress
   and Cancel replace the buttons; after, the frames captured and dropped. Plain ASCII.
   Styles are injected below under the xv- prefix so this file does not depend on
   export-dialog.js loading first. */
(function () {
    "use strict";
    const CSS = `
.xv-modal { width: min(1120px, calc(100vw - 48px)); height: min(760px, calc(100vh - 56px)); max-height: none; }
.xv-modal .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: grid; grid-template-columns: 248px minmax(0, 1fr); }
.xv-list { overflow: auto; border-right: 1px solid var(--cm-border); padding: 6px 0; }
.xv-item { display: flex; align-items: flex-start; gap: 8px; padding: 5px 12px 5px 14px; cursor: pointer; }
.xv-item:hover { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
.xv-item[aria-selected="true"] { background: var(--cm-bg-selected, var(--cm-bg-secondary)); }
.xv-item .k-icon, .xv-item svg { margin-top: 2px; flex: none; }
.xv-item-t { display: flex; gap: 6px; align-items: baseline; font-weight: 550; }
.xv-item-t .xv-ext { font-weight: 400; color: var(--cm-text-secondary); }
.xv-item-d { color: var(--cm-text-secondary); font-size: 11px; line-height: 15px; }
.xv-main { overflow: auto; padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.xv-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.xv-from { color: var(--cm-text-secondary); font-size: 11px; font-weight: 400; margin-left: auto; }
.xv-from a { color: var(--cm-text-brand); }
.xv-facts, .xv-set { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 6px 12px; margin: 0; align-items: center; }
.xv-facts dt, .xv-set > span:nth-child(odd) { color: var(--cm-text-secondary); }
.xv-facts dd { margin: 0; }
.xv-set .k-field { max-width: 220px; }
.xv-set[aria-disabled="true"] { opacity: .55; pointer-events: none; }
.xv-seg { flex-wrap: wrap; height: auto; min-height: 24px; }
.xv-seg > button { cursor: pointer; height: 24px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.xv-seg > button[disabled] { cursor: default; color: var(--cm-text-disabled); }
.xv-h { font-weight: 550; margin: 4px 0 -4px; }
.xv-note { color: var(--cm-text-secondary); }
.xv-note a { color: var(--cm-text-brand); }
.xv-stops { display: grid; grid-template-columns: 24px 16px minmax(0, 1fr) 88px 120px; gap: 4px 8px; align-items: center; max-width: 620px; }
.xv-stops .xv-sh { color: var(--cm-text-secondary); font-size: 11px; }
.xv-stops .k-field { width: 100%; }
.xv-num { color: var(--cm-text-secondary); text-align: right; font-variant-numeric: tabular-nums; }
.xv-est { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 6px; background: var(--cm-bg-secondary); max-width: 620px; }
.xv-est .k-icon, .xv-est svg { flex: none; margin-top: 1px; }
.xv-est[data-kind="warn"] { box-shadow: inset 3px 0 0 var(--cm-text-warning, #b7791f); }
.xv-est[data-kind="done"] { box-shadow: inset 3px 0 0 var(--cm-bg-brand); }
.xv-prog { display: grid; gap: 6px; max-width: 620px; }
.xv-prog .k-progress { height: 6px; }
.xv-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 6px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xv-footl a { color: var(--cm-text-brand); }
.xv-footl .k-progress { width: 160px; flex: none; }
.xv-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 5px; font-size: 10px; font-weight: 600; color: var(--k-annot-ink); box-shadow: inset 0 0 0 1px var(--k-annot); white-space: nowrap; vertical-align: 1px; margin-left: 4px; }
.xv-later { display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 5px; font-size: 10px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); margin-left: 4px; }
`;
    if (!document.getElementById("xv-style")) document.head.append(h("style", { id: "xv-style" }, CSS));

    const oq = (text) => h("span", { class: "xv-oq", title: text }, "Open question");

    // The dialog's list of outputs, in the order the spec gives (section 12.1). Only Video is
    // drawn here; every other item opens its own section.
    const LIST = [
        { name: "Image", ext: ".png", icon: "camera", line: "A picture of the canvas", go: ["export-image", "image"] },
        { name: "Video", ext: ".webm", icon: "play", line: "The canvas as it moves, or a tour of views", video: true },
        { name: "Figure", ext: ".svg", icon: "network", line: "The drawing with its legend", later: "PDF later", go: ["export-dialog", "figure"] },
        { name: "Findings report", ext: ".html", icon: "book-open", line: "Views, notes and methods in one file", go: ["export-dialog", "findings-report"] },
        { name: "Methods text", ext: ".txt", icon: "file", line: "How every number was computed", go: ["export-dialog", "methods"] },
        { name: "Project", icon: "folder-open", line: "Everything, to reopen in graphty", go: ["export-dialog", "project"] },
        { name: "Recipe", icon: "flask-conical", line: "The analysis, without the data", go: ["export-dialog", "recipe"] },
        { name: "Style", icon: "palette", line: "Colors and sizes to reuse", go: ["export-dialog", "style"] },
        { name: "Data", icon: "database", line: "The graph for other tools", go: ["export-dialog", "data"] },
        { name: "Table as CSV", ext: ".csv", icon: "table", line: "One table's rows for a spreadsheet", go: ["export-dialog", "table"] },
    ];

    // The project's saved views, in the Views place's order (the Graph place fixture holds two).
    const VIEWS = AB.SAVED_VIEWS.slice(0, 2); // the views in the tour, in the Views place's order
    const EASINGS = ["Ease in and out", "Linear", "Ease in", "Ease out"];

    // Old state ids other files link to (lib.js "Record video..." goes to "orbit").
    const ALIAS = { orbit: "still", "layout-settling": "still" };

    // Reader choices for this page visit.
    let format = "Automatic";
    let transparent = false;
    const stopOn = VIEWS.map(() => true);
    const stopSecs = [4, 4];
    let redraw = () => {};

    function seg(label, options, value, onPick, disabled) {
        return h("span", { class: "k-seg xv-seg", role: "radiogroup", "aria-label": label },
            options.map((o) => {
                const off = disabled && disabled[o];
                return h("button", { type: "button", role: "radio", "aria-checked": String(o === value), disabled: off ? "" : null, title: off || null,
                    on: { click: () => { if (!off) onPick(o); } } }, o);
            }));
    }
    const setRow = (label, control) => [h("span", null, label), h("div", null, control)];
    const sw = (on, label, onClick, disabledReason) => h("span", { style: "display:inline-flex;gap:8px;align-items:center" },
        h("span", { class: "k-switch", role: "switch", tabindex: disabledReason ? null : "0", "aria-checked": String(on), "aria-label": label, "aria-disabled": disabledReason ? "true" : null,
            style: disabledReason ? "opacity:.5" : "cursor:pointer", on: { click: () => { if (!disabledReason) onClick(); } } }),
        disabledReason ? h("span", { class: "xv-note" }, disabledReason) : null);

    function render(el, rawState) {
        const state = ALIAS[rawState] || rawState;
        redraw = () => { el.textContent = ""; render(el, rawState); };
        const tour = state === "tour" || state === "estimate-warning" || state === "recording" || state === "done";
        const in2d = state === "tour-2d-disabled";
        const warn = state === "estimate-warning" || state === "recording" || state === "done";
        const busy = state === "recording";
        const done = state === "done";
        // The reader's settings; the warning states have chosen a heavy recording.
        const fps = warn ? 60 : 30;
        const size = warn ? "3840 x 2160" : "1920 x 1080";
        const bitrate = warn ? "40 Mbps" : "8 Mbps";
        const stops = VIEWS.map((v, i) => ({ v, i })).filter((s) => stopOn[s.i]);
        const secs = tour ? stops.reduce((a, s) => a + stopSecs[s.i], 0) : 12;
        const frames = secs * fps; // arithmetic on the reader's own settings
        const file = tour ? "les-miserables_tour.webm" : "les-miserables_canvas.webm";

        const list = h("div", { class: "xv-list", role: "listbox", "aria-label": "What to export" },
            LIST.map((it) => h("div", Object.assign({ class: "xv-item", role: "option", "aria-selected": String(!!it.video) },
                it.video ? AB.act({ onClick: () => {} }) : AB.act({ go: it.go })),
            icon(it.icon),
            h("div", null,
                h("div", { class: "xv-item-t" }, it.name, it.ext ? h("span", { class: "xv-ext" }, it.ext) : null, it.later ? h("span", { class: "xv-later" }, it.later) : null),
                h("div", { class: "xv-item-d" }, it.line)))));

        // Still camera | Tour
        const camera = seg("Camera", ["Still camera", "Tour"], tour ? "Tour" : "Still camera",
            (o) => AB.go("export-video", o === "Tour" ? "tour" : "still"),
            in2d ? { Tour: "A tour stop is a 3D position and target; a 2D view's zoom, pan and rotation cannot be a stop yet" } : null);
        const cameraRow = h("div", null, camera,
            in2d ? h("div", { class: "xv-note", style: "margin-top:4px" }, "Tour is off in 2D. ", AB.needsElement("graphty-element records 2D video and animates 2D zoom and pan, but its tour stop (CameraWaypoint) takes only a position and target, read as zoom in 2D. It should take a camera state or a saved view name; converting views to stops in the app would be a workaround."), " ",
                AB.link("export-video", "tour", "Switch to 3D and record a tour")) : null);

        const what = tour
            ? h("div", { class: "xv-note" }, "Flies through the saved views checked for the tour, in the Views place's order, then stops.")
            : h("div", { class: "xv-note" }, "Records the canvas from ", h("b", null, in2d ? "the current 2D camera" : "the current camera"),
                " as it is, including anything that moves: resume the layout with the layout chip beside the Camera menu first, to record it settling.");

        const stopsBlock = tour ? [
            h("div", { class: "xv-h" }, `Stops (${stops.length} of ${VIEWS.length} views)`),
            h("div", { class: "xv-stops", role: "group", "aria-label": "Tour stops" },
                h("span", { class: "xv-sh" }, "Tour"), h("span", { class: "xv-sh" }, "#"), h("span", { class: "xv-sh" }, "Saved view"), h("span", { class: "xv-sh" }, "Hold"), h("span", { class: "xv-sh" }, "Move in"),
                VIEWS.map((v, i) => [
                    h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(stopOn[i]), "aria-label": "In tour: " + v,
                        style: "cursor:pointer", on: { click: () => { if (busy) return; stopOn[i] = !stopOn[i]; redraw(); } } }),
                    h("span", { class: "xv-num" }, String(i + 1)),
                    AB.link("inspector-saved-view", null, v, { class: "k-ellipsis" }),
                    AB.field(stopSecs[i] + " s", { onClick: () => { if (busy) return; stopSecs[i] = stopSecs[i] >= 8 ? 2 : stopSecs[i] + 2; redraw(); } }),
                    AB.field(EASINGS[0], { caret: true, onClick: (e) => AB.menu({ anchor: e.currentTarget, place: "below-start", items: EASINGS.map((x, k) => ({ label: x, check: k === 0, onClick: () => AB.flash("Easing: " + x + " (not wired in the skeleton)") })) }) }),
                ])),
            h("div", { class: "xv-note" }, "The In tour checkboxes are the same ones as in the ", AB.link("views-place", "at-rest", "Views place"), "; clicking a hold time steps it by 2 s."),
        ] : null;

        const fmtOff = { MP4: null };
        const transReason = format === "MP4" ? "MP4 has no transparency; choose WebM or Automatic" : null;
        const settings = h("div", { class: "xv-set", "aria-disabled": busy || done ? "true" : null },
            !tour ? setRow("Length", AB.field("12 s", { onClick: () => AB.flash("Length in seconds (not wired in the skeleton)") })) : setRow("Length", h("span", null, `${secs} s, the sum of the holds`)),
            setRow("Format", h("span", null, seg("Format", ["Automatic", "WebM", "MP4"], format, (o) => { format = o; if (o === "MP4") transparent = false; redraw(); }, fmtOff),
                format === "Automatic" ? h("span", { class: "xv-note", style: "margin-left:8px" }, "WebM here; MP4 where the browser records only that") : null)),
            setRow("Frame rate", AB.field(fps + " fps", { caret: true, onClick: (e) => AB.menu({ anchor: e.currentTarget, place: "below-start", items: [24, 30, 60].map((f) => ({ label: f + " fps", check: f === fps, go: ["export-video", f === 60 ? "estimate-warning" : tour ? "tour" : "still"] })) }) })),
            setRow("Bitrate", AB.field(bitrate, { caret: true, onClick: () => AB.flash("Bitrate: 4, 8, 16 or 40 Mbps (not wired in the skeleton)") })),
            setRow("Size", AB.field(size, { caret: true, onClick: (e) => AB.menu({ anchor: e.currentTarget, place: "below-start", items: [
                { label: "1280 x 720", onClick: () => AB.flash("1280 x 720 (not wired in the skeleton)") },
                { label: "1920 x 1080", check: size === "1920 x 1080", go: ["export-video", tour ? "tour" : "still"] },
                { label: "3840 x 2160", check: size === "3840 x 2160", go: ["export-video", "estimate-warning"] },
                { sep: true }, { label: "The canvas size", onClick: () => AB.flash("The canvas size (not wired in the skeleton)") }] }) })),
            setRow("Background", sw(transparent, "Transparent background", () => { transparent = !transparent; if (transparent && format === "MP4") format = "WebM"; redraw(); }, transReason)),
        );

        // The element's estimate (estimateAnimationCapture): no numbers of its own are drawn,
        // only the verdict and the reader's arithmetic.
        let status;
        if (busy) {
            const at = Math.round(frames / 2);
            status = h("div", { class: "xv-prog", role: "status" },
                h("div", null, h("b", null, "Recording"), h("span", { class: "xv-note" }, ` -- frame ${at} of ${frames}, stop 1 of ${stops.length}: ${stops[0] ? stops[0].v : ""}`)),
                h("div", { class: "k-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(frames), "aria-valuenow": String(at) }, h("i", { style: "width:50%" })),
                h("div", { class: "xv-note" }, "Leave this tab open: the recording follows what the canvas draws. Cancel keeps nothing."));
        } else if (done) {
            status = [
                h("div", { class: "xv-est", "data-kind": "done", role: "status" }, icon("circle-check", "sm"),
                    h("div", null, h("b", null, "Recorded: " + file), h("div", { class: "xv-note" }, `${secs} s at ${fps} fps, ${size}. Some frames were dropped, so playback will stutter in places.`))),
                h("dl", { class: "xv-facts" },
                    h("dt", null, "Frames planned"), h("dd", null, `${frames} (${secs} s x ${fps} fps)`),
                    h("dt", null, "Captured"), h("dd", { class: "xv-note" }, "the count graphty-element reports", oq("Frame counts are the element's; the skeleton has none to show")),
                    h("dt", null, "Dropped"), h("dd", { class: "xv-note" }, "the count graphty-element reports")),
            ];
        } else if (warn) {
            status = h("div", { class: "xv-est", "data-kind": "warn", role: "status" }, icon("triangle-alert", "sm"),
                h("div", null, h("b", null, "This computer is likely to drop frames at these settings."),
                    h("div", { class: "xv-note" }, `graphty-element's estimate for ${fps} fps at ${size}. At 24 fps it expects every frame to be kept.`)));
        } else {
            status = h("div", { class: "xv-est", role: "status" }, icon("gauge", "sm"),
                h("div", null, h("b", null, "Expected to record smoothly."),
                    h("div", { class: "xv-note" }, `graphty-element's estimate for ${frames} frames (${secs} s x ${fps} fps) at ${size}.`)));
        }

        const from = tour && !busy && !done ? ["views-place", "at-rest", "Views > Record tour"] : !tour ? ["project-menu", "open", "Project menu > Export..."] : null;
        const main = h("div", { class: "xv-main" },
            h("div", { class: "xv-title" }, icon("play"), "Video", h("span", { class: "k-secondary", style: "font-weight:400" }, format === "MP4" ? ".mp4" : ".webm"),
                from ? h("span", { class: "xv-from" }, "Opened from ", AB.link(from[0], from[1], from[2])) : null),
            h("dl", { class: "xv-facts" },
                h("dt", null, "Camera"), h("dd", null, cameraRow),
                h("dt", null, "Contains"), h("dd", null, what),
                h("dt", null, "Masked"), h("dd", null, "Nothing is left out: the video shows the canvas exactly as drawn, with no legend. ", AB.needsElement("graphty-element draws no legend into a captured frame"))),
            stopsBlock,
            h("div", { class: "xv-h" }, "Settings"),
            settings,
            status);

        let foot;
        if (busy) {
            foot = [
                h("span", { class: "xv-footl" }, h("span", { class: "k-progress" }, h("i", { style: "width:50%" })), "Recording, 50%"),
                AB.button("Cancel", { kind: "secondary", onClick: () => { AB.go("export-video", "estimate-warning"); setTimeout(() => AB.flash("Recording canceled. Nothing was saved."), 50); } }),
            ];
        } else if (done) {
            foot = [
                h("span", { class: "xv-footl" }, icon("info", "sm"), "Downloading lists it in ", AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), "."),
                AB.button("Record again at the recommended settings", { kind: "secondary", icon: "refresh-cw", go: ["export-video", "recording"] }),
                AB.button("Download", { icon: "download", onClick: () => { AB.go("data-place", "sent-and-saved"); setTimeout(() => AB.flash(`Written: ${file}, to Downloads. Listed in Sent and saved.`), 50); } }),
            ];
        } else if (warn) {
            foot = [
                h("span", { class: "xv-footl" }, icon("info", "sm"), AB.link("export-video", "recording", `Record with my settings (${fps} fps)`, { title: "Keeps your settings; frames may drop" })),
                AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
                AB.button("Record at 24 fps (recommended)", { icon: "circle-dot", go: ["export-video", "recording"] }),
            ];
        } else {
            foot = [
                h("span", { class: "xv-footl" }, icon("info", "sm"), "Saved to this computer; nothing is uploaded. Each export is listed in ", AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), "."),
                AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
                AB.button("Record", { icon: "circle-dot", go: ["export-video", "recording"] }),
            ];
        }

        const m = AB.modal({ title: "Export", body: [list, main], foot });
        m.querySelector(".k-modal").classList.add("xv-modal");
        el.append(m);
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
            { id: "tour-2d-disabled", label: "2D: Tour off" },
        ],
        render,
    });
})();
