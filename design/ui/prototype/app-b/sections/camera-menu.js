/* Camera menu: opened from the face at the top right of the canvas (#ab-zoom). The one home of
   camera moves and built-in views; saved views appear as a jump list (names only, a door to the
   Views place). No display toggles. The face itself is drawn by canvas-and-states; this section
   redraws it for its own states so the face matches the menu (view name, "moved", 2D zoom).
   States: 3d, 3d-moved, 3d-selected, 2d, save-view, saved, no-saved-views. Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.cm-menu { width: 272px; }
.cm-menu .k-menu-desc { white-space: normal; }
.cm-menu .cm-empty { padding: 2px 16px 4px 40px; color: var(--k-menu-ink3); font-size: 11px; line-height: 16px; }
.cm-save { display: flex; gap: 6px; align-items: center; padding: 2px 16px 4px 40px; }
.cm-save input { flex: 1; min-width: 0; height: 24px; padding: 0 6px; font: inherit; color: #fff; background: #2c2c2c; border: 1px solid var(--cm-bg-brand); border-radius: 5px; }
.cm-save .k-btn { height: 24px; }
.cm-pop .k-popover-body { padding: 8px 16px 12px; }
.cm-pop .cm-save { padding: 0; }
.cm-pop .cm-save input { color: var(--cm-text); background: var(--cm-bg); border-color: var(--cm-border-selected); }
.cm-pop .cm-err { padding: 4px 0 0; color: var(--cm-text-danger); font-size: 11px; line-height: 16px; }
.cm-save input[aria-invalid="true"] { border-color: var(--cm-border-danger-strong, #d32f2f); }
.cm-oq { margin: 2px 16px 0 40px; }
.cm-oq .k-annot-tag { white-space: normal; }
.cm-toast { position: absolute; left: 50%; bottom: 88px; transform: translateX(-50%); pointer-events: auto; }
`;
    if (!document.getElementById("cm-camera-style")) document.head.append(h("style", { id: "cm-camera-style" }, CSS));

    // The Views place's saved views, in its order (one list, read by every door)
    const SAVED = AB.SAVED_VIEWS;
    // Studio decision: a saved view keeps its view mode, so jumping to a 3D view from 2D switches to 3D
    const SAVED_MODE = { "Whole cast": "3d", "Valjean's circle": "3d", "From above": "3d" };
    const NEW_NAME = "Valjean and Javert"; // what the save-view state types

    const FACE = {
        "3d": { view: "Front" },
        "3d-moved": { view: "Front", moved: true },
        "3d-selected": { view: "Front" },
        "2d": { zoom: "100%" },
        "save-view": { view: "Front", moved: true },
        "save-view-taken": { view: "Front", moved: true },
        saved: { view: NEW_NAME },
        "no-saved-views": { view: "Front" },
    };

    // Replace whatever face the canvas drew with this state's face
    function drawFace(o, mode) {
        const old = document.getElementById("ab-zoom");
        if (!old) return null;
        const face = AB.cameraFace(Object.assign({ mode }, o));
        face.setAttribute("aria-expanded", "true");
        old.replaceWith(face);
        return face;
    }

    // A jump: the menu closes and the face names the new view
    function jump(name, mode) {
        return () => {
            AB.close();
            setTimeout(() => { const f = drawFace({ view: name, zoom: mode === "2d" ? "100%" : null }, mode); if (f) f.removeAttribute("aria-expanded"); }, 60);
            AB.announce("Camera: " + name);
        };
    }

    function item(o) {
        const target = o.go ? { go: o.go } : { onClick: o.onClick };
        return h("div", Object.assign({ class: "k-menu-item" + (o.cls ? " " + o.cls : ""), role: "menuitem", "aria-disabled": o.disabled ? "true" : null, "data-described": o.desc ? "" : null, "aria-keyshortcuts": o.shortcut || null }, o.disabled ? { tabindex: "-1" } : AB.act(target)),
            h("span", { class: "k-check-col" }, o.check ? icon("check", "sm") : null),
            o.desc ? h("span", null, o.label, h("span", { class: "k-menu-desc" }, o.desc)) : h("span", null, o.label),
            o.shortcut ? h("span", { class: "k-shortcut", "aria-hidden": "true" }, o.shortcut) : null);
    }
    const sep = () => h("div", { class: "k-menu-sep", role: "separator" });
    const heading = (t) => h("div", { class: "k-menu-label" }, t);

    // taken: the name of a built-in view, which graphty-element's saveCameraPreset refuses (E_PROTECTED)
    function saveField(taken) {
        const input = h("input", { value: taken ? "Top" : NEW_NAME, "aria-label": "Name of the new view", "aria-invalid": taken ? "true" : null, "aria-describedby": taken ? "cm-save-err" : null });
        const save = () => { const v = input.value.trim(); if (!v) return; AB.go("camera-menu", ["Front", "Side", "Top", "Isometric"].includes(v) ? "save-view-taken" : "saved"); };
        input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") save(); if (e.key === "Escape") AB.go("camera-menu", "3d-moved"); });
        input.addEventListener("click", (e) => e.stopPropagation());
        setTimeout(() => { input.focus(); input.select(); if (taken) AB.announce("\"Top\" is a built-in view. Choose another name."); }, 30);
        return [h("div", { class: "cm-save" }, input, AB.button("Save", { onClick: save })),
            taken ? h("div", { id: "cm-save-err", class: "cm-empty cm-err" }, "\"Top\" is a built-in view. Choose another name.") : null];
    }

    registerSection({
        id: "camera-menu",
        title: "Camera menu",
        region: "overlay",
        closeTo: "graph-place",
        frame: (state) => state === "2d" ? { mode: "2d" }
            : state === "3d-selected" ? { mode: "3d", right: "inspector-node" }
            : { mode: "3d" },
        states: [
            { id: "3d", label: "3D, at a view" },
            { id: "3d-moved", label: "3D, moved from Front" },
            { id: "3d-selected", label: "3D, a node selected" },
            { id: "2d", label: "2D: zoom percent and zoom items" },
            { id: "save-view", label: "Save view: the name field" },
            { id: "save-view-taken", label: "Save view: a built-in view's name" },
            { id: "saved", label: "Saved: the toast" },
            { id: "no-saved-views", label: "No saved views yet" },
        ],
        render(el, state) {
            const mode = state === "2d" ? "2d" : "3d";
            const f = FACE[state] || FACE["3d"];
            let zoom = 100;
            const face = drawFace(f, mode);

            if (state === "saved") {
                if (face) face.removeAttribute("aria-expanded");
                el.append(h("div", { class: "cm-toast", role: "status" }, AB.notice("Saved to Views: " + NEW_NAME, { label: "Open Views", go: ["views-place", "at-rest"] })));
                AB.announce("Saved to Views: " + NEW_NAME);
                return;
            }

            // Save camera view... leaves the menu for a small naming popover on the same face: a text
            // field and its button cannot live inside a menu (only menu items can)
            if (state === "save-view" || state === "save-view-taken") {
                const pop = AB.popover({ anchor: "#ab-zoom", place: "below-end", width: 272, title: AB.COMMANDS["save-view"].label.replace(/\.+$/, ""), body: saveField(state === "save-view-taken").filter(Boolean) });
                pop.classList.add("cm-pop");
                pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); AB.go("camera-menu", "3d-moved"); } });
                el.append(pop);
                return;
            }
            const selected = state === "3d-selected";
            const current = f.moved ? null : f.view;
            const m = h("div", { class: "k-menu ab-menu cm-menu", role: "menu", "aria-label": "Camera" });

            // Camera moves
            m.append(
                item(Object.assign(AB.cmd("fit"), { go: null, onClick: jump("Unsaved view", mode) })),
                item(Object.assign(AB.cmd("frame-selection"), { go: null, onClick: jump("Selection", mode), disabled: !selected, desc: selected ? null : "Nothing is selected" })),
                item(Object.assign(AB.cmd("reset-camera"), { go: null, onClick: jump("Unsaved view", mode) })));

            // 2D zoom: the keys are graphty-element's own canvas keys; the app binds neither
            if (mode === "2d") {
                const step = (d) => () => { zoom = Math.max(25, zoom + d); const z = document.querySelector("#ab-zoom .k-num"); if (z) z.textContent = " " + zoom + "%"; AB.announce("Zoom " + zoom + "%"); };
                m.append(sep(),
                    item({ label: "Zoom in", shortcut: "=", desc: "Canvas key", onClick: step(25) }),
                    item({ label: "Zoom out", shortcut: "-", desc: "Canvas key", onClick: step(-25) }));
            }

            // Built-in views: read from graphty-element's camera catalog for this mode. Studio
            // decision: 2D looks straight down on the plane, so it lists none (Fit and zoom cover it).
            if (mode === "3d") m.append(sep(), heading("Built-in views"),
                item({ label: "Front", shortcut: "1", check: current === "Front", onClick: jump("Front", mode) }),
                item({ label: "Side", shortcut: "3", check: current === "Side", onClick: jump("Side", mode) }),
                item({ label: "Top", shortcut: "7", check: current === "Top", onClick: jump("Top", mode) }),
                item({ label: "Isometric", check: current === "Isometric", onClick: jump("Isometric", mode) }),
                h("div", { class: "cm-oq" }, h("span", { class: "k-annot-tag", title: "graphty-element's camera catalog also lists views a plugin registers; they join this list" }, "Design note: plugin views join this list")));

            // Save view...: an inline name field; the view lands in the Views place
            m.append(sep());
            m.append(item({ label: AB.COMMANDS["save-view"].label, desc: "Saves this camera to Views", go: ["camera-menu", "save-view"] }));

            // Saved views: names only, in the Views place's order (a door, not a second home)
            m.append(sep(), heading("Saved views"));
            if (state === "no-saved-views") m.append(h("div", { class: "cm-empty" }, "No saved views yet. Save camera view... adds one."));
            else SAVED.forEach((n) => m.append(item({ label: n, desc: mode === "2d" && SAVED_MODE[n] === "3d" ? "Switches to 3D" : null, onClick: jump(n, SAVED_MODE[n] || mode) })));

            // Output from this camera: doors to the Export dialog (its one home), with its key
            m.append(sep(),
                item({ label: AB.COMMANDS["export-image"].label, shortcut: AB.COMMANDS.export.shortcut, desc: "From this camera, in the Export dialog", go: AB.COMMANDS["export-image"].go }),
                item({ label: AB.COMMANDS["export-video"].label, desc: "Still camera or a tour of your saved views", go: AB.COMMANDS["export-video"].go }));

            el.append(AB.position(m, "#ab-zoom", "below-end"));
        },
    });
})();
