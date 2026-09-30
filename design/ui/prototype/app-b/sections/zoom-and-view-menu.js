/* Zoom-and-view menu: opened from the zoom level at the top right of the canvas (#ab-zoom).
   Zoom commands, the 3D camera presets (3D only), the saved views and Save view..., and the
   reader's display toggles. States: 2d, 3d, save-view (the naming field). Plain ASCII.
   The few styles it needs are injected below. Views saved here are added for this page visit only. */
(function () {
    "use strict";
    const CSS = `
.zv-menu { width: 272px; max-height: calc(100vh - 116px); overflow-y: auto; }
.zv-head { display: flex; align-items: center; gap: 8px; }
.zv-head .zv-lnk { margin-inline-start: auto; font-size: 11px; color: var(--k-menu-ink2); text-decoration: underline; cursor: pointer; }
.zv-head .zv-lnk:hover, .zv-head .zv-lnk:focus-visible { color: #fff; }
.zv-empty { padding: 0 16px 0 40px; height: 24px; display: flex; align-items: center; color: var(--k-menu-ink3); }
.zv-save { padding: 4px 16px 4px 40px; display: flex; flex-direction: column; gap: 6px; }
.zv-save label { font-size: 11px; line-height: 16px; color: var(--k-menu-ink2); }
.zv-save input { height: 24px; font: inherit; color: #fff; background: #ffffff1a; border: 1px solid var(--cm-bg-brand); border-radius: 4px; padding: 0 6px; }
.zv-save .zv-btns { display: flex; gap: 8px; justify-content: flex-end; }
.zv-save .zv-keeps { font-size: 11px; line-height: 16px; color: var(--k-menu-ink2); }
.zv-oq { align-self: flex-start; padding: 0 4px; border: 1px dashed var(--k-menu-ink3); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--k-menu-ink2); }
.zv-foot { padding: 4px 16px 4px 40px; font-size: 11px; line-height: 16px; color: var(--k-menu-ink2); }
.zv-foot a { color: #fff; }
`;
    if (!document.getElementById("zv-style")) document.head.append(h("style", { id: "zv-style" }, CSS));

    // Page-lifetime state: the zoom level, the display toggles, the views saved in this visit.
    const L = () => AB.fx.datasets.lesmis;
    let zoom = 100;
    let dim = "2d";
    // The two saved views the Graph place lists for Les Miserables (graph-place.js, Views).
    const views = ["Communities, whole graph", "Valjean's paths"];
    const display = { Labels: true, Legend: true, Minimap: false, "Note markers": true };
    const STEPS = [25, 50, 75, 100, 150, 200, 400];

    function showZoom() {
        const z = document.getElementById("ab-zoom");
        if (z && z.firstChild && z.firstChild.nodeType === 3) z.firstChild.nodeValue = zoom + "%";
    }
    function stepZoom(dir) {
        const i = STEPS.indexOf(zoom);
        zoom = STEPS[Math.max(0, Math.min(STEPS.length - 1, i + dir))];
        showZoom();
    }

    // One dark-menu row. o: { label, shortcut, desc, check, disabled, onClick, go }
    function item(o) {
        const target = o.go ? { go: o.go } : { onClick: o.onClick || (() => AB.flash(o.label + " (not wired in the skeleton)")) };
        return h("div", Object.assign({ class: "k-menu-item", role: o.check === undefined ? "menuitem" : "menuitemcheckbox", "aria-checked": o.check === undefined ? null : String(!!o.check), "aria-disabled": o.disabled ? "true" : null, "data-described": o.desc ? "" : null }, o.disabled ? {} : AB.act(target)),
            h("span", { class: "k-check-col" }, o.check ? icon("check", "sm") : null),
            o.desc ? h("span", null, o.label, h("span", { class: "k-menu-desc" }, o.desc)) : h("span", null, o.label),
            o.shortcut ? h("span", { class: "k-shortcut" }, o.shortcut) : null);
    }
    const sep = () => h("div", { class: "k-menu-sep", role: "separator" });
    const heading = (text, extra) => h("div", { class: "k-menu-label zv-head" }, text, extra || null);

    registerSection({
        id: "zoom-and-view-menu",
        title: "Zoom and view menu",
        region: "overlay",
        closeTo: "graph-place/at-rest",
        states: [
            { id: "2d", label: "2D (no camera presets)" },
            { id: "3d", label: "3D (camera presets shown)" },
            { id: "save-view", label: "Save view... naming field" },
        ],
        render(el, state) {
            if (state === "2d" || state === "3d") dim = state;
            showZoom();
            const m = h("div", { class: "k-menu ab-menu zv-menu", role: "menu", "aria-label": "Zoom and view" });
            const hasLegend = () => document.querySelector(".ab-legend");

            const draw = () => {
                const displayItem = (label, shortcut, desc) => item({
                    label, shortcut, desc, check: display[label],
                    onClick: () => {
                        display[label] = !display[label];
                        if (label === "Legend" && hasLegend()) hasLegend().style.display = display.Legend ? "" : "none";
                        draw();
                    },
                });
                let saveBlock;
                if (state === "save-view") {
                    const input = h("input", { type: "text", value: "View " + (views.length + 1), "aria-label": "View name" });
                    const save = () => { views.push(input.value.trim() || "View " + (views.length + 1)); AB.go("zoom-and-view-menu", dim); };
                    const cancel = () => AB.go("zoom-and-view-menu", dim);
                    input.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") { e.preventDefault(); save(); }
                        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
                    });
                    saveBlock = h("div", { class: "zv-save", on: { click: (e) => e.stopPropagation() } },
                        h("label", null, "Name this view"),
                        input,
                        h("div", { class: "zv-keeps" }, "Keeps node positions, the camera, which rows are shown, and the display settings below."),
                        h("span", { class: "zv-oq", title: "The spec says a view keeps the display toggles it names, but not how a reader chooses them." }, "Open question: which display settings a view keeps"),
                        h("div", { class: "zv-btns" }, AB.button("Cancel", { kind: "ghost", onClick: cancel }), AB.button("Save view", { onClick: save })));
                    setTimeout(() => { input.focus(); input.select(); }, 0);
                } else {
                    saveBlock = item({ label: "Save view...", go: ["zoom-and-view-menu", "save-view"] });
                }

                m.replaceChildren(...[
                    item({ label: "Zoom in", shortcut: "=", onClick: () => stepZoom(1) }),
                    item({ label: "Zoom out", shortcut: "-", onClick: () => stepZoom(-1) }),
                    item({ label: "Zoom to fit", shortcut: "0", onClick: () => { zoom = 100; AB.go("canvas-and-states", "drawn"); } }),
                    item({ label: "Zoom to selection", shortcut: "F", disabled: true, desc: "Nothing is selected" }),
                    item({ label: "Reset view", shortcut: "Shift+0", onClick: () => { zoom = 100; showZoom(); AB.flash("View reset (not wired in the skeleton)"); } }),
                    dim === "3d" ? [
                        sep(),
                        heading("Camera"),
                        item({ label: "Front", shortcut: "1" }),
                        item({ label: "Side", shortcut: "3" }),
                        item({ label: "Top", shortcut: "7" }),
                    ] : null,
                    sep(),
                    heading("Views", h("span", Object.assign({ class: "zv-lnk", role: "link" }, AB.act({ go: ["graph-place", "at-rest"] })), "In the Graph place")),
                    views.length ? views.map((v) => item({ label: v, onClick: () => { zoom = 100; showZoom(); AB.flash("Jumped to " + v + " (not wired in the skeleton)"); } })) : h("div", { class: "zv-empty" }, "No saved views yet"),
                    saveBlock,
                    sep(),
                    heading("Display"),
                    displayItem("Labels", null, "Up to " + L().frame.labelBudget + " names in view"),
                    item({ label: "Arrows", check: false, disabled: true, desc: L().title + " has no edge direction" }),
                    displayItem("Legend", "L"),
                    displayItem("Minimap", "M"),
                    displayItem("Note markers", "Shift+N"),
                    sep(),
                    h("div", { class: "zv-foot" }, dim === "3d" ? "3D" : "2D", " now. Switch to ", dim === "3d" ? "2D" : "3D", ", or enter VR or AR, from ", link("toolbar", "view-mode", "View mode"), " on the toolbar (5)."),
                ].flat().filter(Boolean));
            };
            draw();
            el.append(AB.position(m, "#ab-zoom", "below-end"));
        },
    });
})();
