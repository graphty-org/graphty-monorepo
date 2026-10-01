/* View flyout: replaces the Camera menu. A dark menu anchored above the toolbar's View button
   ([data-tool=View]), focus on its first item. Most frequent first (spec 2.3):
   Fit 0, Frame selection F; Standard views (3D) or Zoom in / Zoom out (2D, the element's = and -);
   Your views (the Views place's order) and Save view; Switch to 2D/3D 5, Enter VR, Enter AR.
   Labels and keys come from AB.COMMANDS. Plain ASCII. */
(function () {
    "use strict";
    if (!document.getElementById("vf-style")) {
        document.head.append(h("style", { id: "vf-style" },
            ".vf-tag{margin-inline-start:6px;padding:0 4px;border:1px solid #ffffff4d;border-radius:4px;font-size:10px;line-height:14px;color:#ffffffb2}"));
    }

    // Which saved views hold a 3D camera. Studio decision: "From above" looks down on the 3D layout,
    // so in 2D it carries the "3D" tag and choosing it switches the mode; the fixtures carry no mode.
    const VIEW_IS_3D = { "From above": true };
    const XR_REASON = "graphty-element's isVRSupported() and isARSupported() return only true or false; the reason a device cannot enter is needed";

    // Choosing an item: the camera moves (not modeled), the flyout closes.
    const done = (text, route) => () => {
        if (route) AB.go(route[0], route[1]);
        else AB.close();
        AB.flash(text);
    };

    function items(state) {
        const is2d = state === "2d";
        const selected = state === "3d-selected";
        const headset = state === "headset";
        const views = state === "no-saved-views" ? [] : AB.SAVED_VIEWS;
        const list = [
            AB.cmd("fit", { onClick: done("Camera fits the whole graph"), go: undefined }),
            AB.cmd("frame-selection", selected
                ? { onClick: done("Camera frames Valjean"), go: undefined }
                : { disabled: "Nothing is selected", go: undefined }),
            { sep: true },
        ];
        if (is2d) {
            // The element's own canvas keys: shown as hints, never bound by the app
            list.push(
                { label: "Zoom in", shortcut: "=", onClick: done("Zoomed in") },
                { label: "Zoom out", shortcut: "-", onClick: done("Zoomed out") },
            );
        } else {
            list.push(
                { heading: "Standard views" },
                { label: "Front", shortcut: "1", onClick: done("Camera moves to Front") },
                { label: "Side", shortcut: "3", onClick: done("Camera moves to Side") },
                { label: "Top", shortcut: "7", onClick: done("Camera moves to Top") },
                { label: "Isometric", onClick: done("Camera moves to Isometric") },
            );
        }
        list.push({ sep: true }, { heading: "Your views" });
        views.forEach((name) => {
            const switches = is2d && VIEW_IS_3D[name];
            list.push({
                label: name,
                tag3d: switches,
                desc: switches ? "A 3D view: choosing it switches to 3D" : null,
                onClick: done("Camera moves to " + name, switches ? ["toolbar", "at-rest"] : null),
            });
        });
        // Save view goes to the Views place with the new row in rename (create, then name). A plain item
        // set apart by a separator: "+" lives only in the header of the list it adds to.
        list.push({ sep: true }, AB.cmd("save-view"));
        list.push(
            { sep: true },
            AB.cmd("view-mode", { go: is2d ? ["toolbar", "at-rest"] : ["toolbar", "2d"] }),
            // Without a headset: one line with the needs mark (no second line); hidden in the user-test build
            AB.cmd("enter-vr", headset ? { enabled: true, go: ["toolbar", "xr-hand-menu"] } : { enabled: true, needs: XR_REASON }),
            AB.cmd("enter-ar", headset ? { enabled: true, go: ["toolbar", "xr-hand-menu"] } : { enabled: true, needs: XR_REASON }),
        );
        return list;
    }

    registerSection({
        id: "view-flyout",
        title: "View flyout",
        region: "overlay",
        rail: "graph",
        states: [
            { id: "3d", label: "3D" },
            { id: "2d", label: "2D" },
            { id: "3d-selected", label: "3D, a node selected (Frame selection on)" },
            { id: "no-saved-views", label: "No saved views" },
            { id: "headset", label: "Headset present (VR and AR on)" },
        ],
        closeTo: "graph-place",
        frame: (state) => Object.assign(
            { mode: state === "2d" ? "2d" : "3d" },
            state === "3d-selected" ? { toolbar: "selection-bar/one-node", right: "inspector-node/why-this-look" } : {},
        ),
        render(el, state) {
            const list = items(state);
            const m = AB.menu({ anchor: "[data-tool=View]", place: "above-toolbar", label: "View", items: list });
            // menu() draws one element per item that is not a separator or heading, in order
            const els = [...m.querySelectorAll(".k-menu-item")];
            list.filter((it) => !it.sep && !it.heading).forEach((it, i) => {
                const row = els[i];
                if (!row) return;
                if (it.tag3d) row.children[1].append(h("span", { class: "vf-tag" }, "3D"));
            });
            el.append(m);
        },
    });
})();
