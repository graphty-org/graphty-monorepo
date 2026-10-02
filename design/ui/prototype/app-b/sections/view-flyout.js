/* View flyout: replaces the Camera menu. A dark menu anchored above the toolbar's View button
   ([data-tool=View]), focus on its first item. Most frequent first (spec 2.3):
   Fit 0, Frame selection F (the selected nodes, or a selected row's members); Standard views and plugin views (3D) or Zoom in / Zoom out (2D, the element's = and -);
   Your views (the Views place's order) and Save view; Switch to 2D/3D 5, Enter VR, Enter AR.
   Labels and keys come from AB.COMMANDS. Plain ASCII. */
(function () {
    "use strict";
    if (!document.getElementById("vf-style")) {
        document.head.append(h("style", { id: "vf-style" },
            ".vf-tag{margin-inline-start:6px;padding:0 4px;border:1px solid #ffffff4d;border-radius:4px;font-size:10px;line-height:14px;color:#ffffffb2}"
            + ".k-menu.vf-many{max-width:280px}.vf-views{max-height:192px;overflow-y:auto;overscroll-behavior:contain}"
            + ".vf-views .k-menu-item>span:nth-child(2){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"));
    }

    // Which saved views hold a 3D camera. Studio decision: "From above" looks down on the 3D layout,
    // so in 2D it carries the "3D" tag and choosing it switches the mode; the fixtures carry no mode.
    const VIEW_IS_3D = { "From above": true };
    // Many views: the Views place's twenty (views-place "many"), one renamed to the 60-character name.
    // Past eight the Your views block scrolls inside the flyout; a long name takes the end ellipsis.
    const LONG = "Valjean, Javert and the students at the Rue de la Chanvrerie";
    const MANY = ["Whole cast", "Valjean's circle", "From above", "The bishop's household", "Fantine's friends", "Thenardier family", "Javert's pursuit",
        "Cosette and Marius", "Friends of the ABC", LONG, "Gavroche", "Eponine", "Champmathieu trial", "Petit-Gervais", "Montreuil-sur-Mer",
        "The convent", "Gorbeau house", "Patron-Minette", "Bridges to Valjean", "Closing shot"];
    // Studio decision: one registered plugin view stands for the element catalog's plugin entries
    // (camerasForMode lists built-ins first, then registered views), so the slot is visible.
    const PLUGIN_VIEWS = ["Turntable"];
    const XR_REASON = "graphty-element's isVRSupported() and isARSupported() return only true or false; the reason a device cannot enter is needed";

    // Choosing an item: the camera moves (not modeled), the flyout closes, then the notice shows (after
    // the new route draws, which clears the notice slot)
    const done = (text, route) => () => {
        if (route) AB.go(route[0], route[1]);
        else AB.close();
        setTimeout(() => AB.flash(text), 0);
    };

    // Opened over Les Miserables with something selected (a canvas node, a tree row), the flyout keeps
    // the panels that show it, so Frame selection has something to frame. The shell carries panels under
    // an overlay only for the loaded projects; this covers Les Miserables until the shell does too.
    // AB.route is still the route being left while the shell asks for this frame.
    function carrySelection() {
        const was = AB.route;
        if (!was || was.frame.overlay || !was.frame.right || (was.frame.dataset && was.frame.dataset !== "lesmis")) return {};
        if (String(was.frame.right).startsWith("inspector-nothing-selected")) return {};
        const out = {};
        ["left", "right", "canvas", "dock", "toolbar"].forEach((r) => { out[r] = was.frame[r]; });
        return out;
    }

    function items(state) {
        const is2d = state === "2d";
        const f = AB.route && AB.route.frame;
        // a node selected on the project on screen (the flyout opens over its panels)
        // or a row selected in the tree (Frame selection frames its members, spec 2.3)
        const head = document.querySelector("#ab-right .ab-insp-head .k-name");
        const rows = document.querySelectorAll("#ab-left .ab-trow[aria-selected=true]").length;
        const onCanvas = !!(f && String(f.toolbar || "").startsWith("selection-bar/") && head);
        const selected = state === "3d-selected" || onCanvas || rows > 0;
        const who = state === "3d-selected" ? "Valjean"
            : onCanvas ? head.textContent.trim()
            : rows > 1 ? "the members of " + rows + " rows"
            : rows ? "the members of " + (head ? head.textContent.trim() : "the row") : "the selection";
        const headset = state === "headset";
        // the saved views are Les Miserables'; a loaded project has none yet (its Views place is empty)
        const own = !f || !f.dataset || f.dataset === "lesmis";
        const views = state === "no-saved-views" || !own ? [] : state === "many-views" ? MANY : AB.SAVED_VIEWS;
        const list = [
            AB.cmd("fit", { onClick: done("Camera fits the whole graph"), go: undefined }),
            AB.cmd("frame-selection", selected
                ? { onClick: done("Camera frames " + who), go: undefined }
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
                // then the views plugins registered with the element's camera catalog, in its order
                ...PLUGIN_VIEWS.map((name) => ({ label: name, desc: "Added by a plugin", onClick: done("Camera moves to " + name) })),
            );
        }
        list.push({ sep: true }, { heading: "Your views" });
        views.forEach((name) => {
            const switches = is2d && VIEW_IS_3D[name];
            list.push({
                label: name,
                tag3d: switches,
                view: true,
                desc: switches ? "A 3D view: choosing it switches to 3D" : name.length > 32 ? name : null,
                onClick: done("Camera moves to " + name, switches ? ["toolbar", "at-rest"] : null),
            });
        });
        // Save view goes to the Views place with the new row in rename (create, then name). A plain item
        // set apart by a separator: "+" lives only in the header of the list it adds to.
        list.push({ sep: true }, AB.cmd("save-view"));
        list.push(
            { sep: true },
            AB.cmd("view-mode", { go: is2d ? ["toolbar", "at-rest"] : ["toolbar", "2d"] }),
            // Without a headset: drawn disabled with its reason (the command's own), in every build; the
            // element gap (a reason, not just true or false) is a design note on the row, added in render
            AB.cmd("enter-vr", headset ? { enabled: true, go: ["toolbar", "xr-hand-menu"] } : { xrNote: true }),
            AB.cmd("enter-ar", headset ? { enabled: true, go: ["toolbar", "xr-hand-menu"] } : { xrNote: true }),
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
            { id: "many-views", label: "Twenty saved views, one long name: the list scrolls" },
        ],
        closeTo: "graph-place",
        frame: (state) => Object.assign(
            { mode: state === "2d" ? "2d" : "3d" },
            carrySelection(),
            state === "3d-selected" ? { right: "inspector-node/why-this-look" } : {},
        ),
        render(el, state) {
            const list = items(state);
            const m = AB.menu({ anchor: "[data-tool=View]", place: "above-toolbar", label: "View", items: list });
            // menu() draws one element per item that is not a separator or heading, in order
            const els = [...m.querySelectorAll(".k-menu-item")];
            const viewRows = [];
            list.filter((it) => !it.sep && !it.heading).forEach((it, i) => {
                const row = els[i];
                if (!row) return;
                if (it.tag3d) row.children[1].append(h("span", { class: "vf-tag" }, "3D"));
                if (it.view) viewRows.push(row);
                if (it.xrNote) row.children[1].append(AB.needsElement(XR_REASON));
            });
            // Past eight views the Your views rows scroll in a block of their own; the rest stays put
            if (viewRows.length > 8) {
                m.classList.add("vf-many");
                const box = h("div", { class: "vf-views", role: "group", "aria-label": "Your views" });
                viewRows[0].before(box);
                box.append(...viewRows);
            }
            el.append(m);
        },
    });
})();
