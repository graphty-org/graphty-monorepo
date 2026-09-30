/* Views place: the project's saved views in user order (the report, presentation and tour order),
   with Save view, Present and Record tour... in the header. Built-in views are not listed here:
   their one home is the Camera menu. Thumbnails are stand-ins drawn from the kit's canvas art.
   Styles are injected once from this file (the shell's CSS is not ours to edit). Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.ab-left:has(.vp-toastwrap), .ab-left:has(.vp-menu) { position: relative; }
.vp-list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; flex: 1 1 auto; min-height: 0; }
.vp-row { position: relative; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 4px 8px 4px 4px; cursor: default; }
.vp-row:hover { background: var(--cm-bg-hover); }
.vp-row[aria-current="true"] { background: var(--cm-bg-selected); }
.vp-row:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: -2px; }
.vp-grip { display: inline-grid; place-items: center; width: 16px; color: var(--cm-icon-secondary); cursor: grab; flex: none; visibility: hidden; }
.vp-row:hover .vp-grip, .vp-row:focus-within .vp-grip, .vp-row[aria-current="true"] .vp-grip, .vp-row[data-lifted] .vp-grip { visibility: visible; }
.vp-thumb { position: relative; width: 48px; height: 36px; flex: none; border-radius: 4px; overflow: hidden; background: var(--cm-bg-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); }
.vp-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vp-text { flex: 1 1 auto; min-width: 0; display: grid; gap: 2px; }
.vp-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--cm-text); }
.vp-tour { display: inline-flex; align-items: center; gap: 6px; justify-self: start; color: var(--cm-text-secondary); padding: 2px 0 0 6px; }
.vp-tour .k-check { cursor: pointer; }
.vp-row[data-lifted] { margin: 2px 4px; background: var(--cm-bg); box-shadow: var(--cm-elevation-toast, 0 4px 12px rgba(0,0,0,.2)); z-index: 2; border-radius: 5px; }
.vp-row[data-ghost] { opacity: .35; }
.vp-drop { height: 2px; margin: -1px 8px -1px 28px; background: var(--cm-bg-brand); border-radius: 1px; position: relative; }
.vp-drop::before { content: ""; position: absolute; left: -4px; top: -3px; width: 6px; height: 6px; border-radius: 50%; border: 1.5px solid var(--cm-bg-brand); background: var(--cm-bg); }
.vp-row[data-new] .vp-thumb { box-shadow: inset 0 0 0 2px var(--cm-border-selected); }
.vp-foot { flex: none; padding: 8px 16px; border-top: 1px solid var(--cm-border); color: var(--cm-text-tertiary); }
.vp-why { flex: none; padding: 6px 16px 8px; border-bottom: 1px solid var(--cm-border); color: var(--cm-text-secondary); display: grid; gap: 4px; }
.vp-empty { display: grid; gap: 8px; padding: 16px; color: var(--cm-text-secondary); }
.vp-toastwrap { position: absolute; left: 8px; right: 8px; bottom: 44px; z-index: 5; display: flex; justify-content: center; }
.vp-toastwrap .k-toast { max-width: 100%; white-space: normal; }
.vp-menu { position: absolute; left: 8px; right: 8px; z-index: 6; min-width: 0; }
.vp-head { gap: 2px; padding-inline-end: 4px; }
.vp-head .k-btn { padding: 0 6px; }
.vp-acts { display: flex; gap: 8px; padding: 0 16px 8px; flex: none; }
.vp-acts .k-btn { flex: 1 1 auto; justify-content: center; }
`;
    if (!document.getElementById("vp-css")) document.head.append(h("style", { id: "vp-css" }, CSS));

    // graphty-element can save and overwrite a camera preset but not remove one, so a rename (save
    // under the new name) would leave the old name behind
    const RENAME_REASON = "graphty-element cannot remove a saved camera view yet, so a rename would leave the old name behind";
    const DELETE_REASON = "graphty-element cannot remove a saved camera view yet";
    // The element records 2D video, but a tour stop takes a 3D position and target, not a 2D view's
    // zoom, pan and rotation; converting views to stops in the app would be a workaround
    const TOUR_2D = "Tours need 3D until graphty-element's captureAnimation takes a camera state or a saved view as a tour stop";
    const openQ = (why) => h("span", { class: "k-annot-tag", title: why }, "Open question");

    // The saved views, in the user's order. Names only: the fixtures carry no counts for views.
    const VIEWS = [
        { id: "whole", name: "Whole cast", art: "lesmis-groups-rest", tour: true },
        { id: "circle", name: "Valjean's circle", art: "lesmis-groups-valjean", tour: true },
        // Not "Top": graphty-element's saveCameraPreset refuses a built-in view's name (E_PROTECTED)
        { id: "top", name: "From above", art: "lesmis-plain", tour: false },
    ];
    const NEW_VIEW = { id: "neighbors", name: "Valjean's neighbors", art: "lesmis-neighbors", tour: true, isNew: true };

    // Header: two labeled buttons (Present is the owner's named ask) and "..." holding Record tour...
    function header(is2d, el) {
        const more = AB.iconButton("ellipsis", "More view actions", { onClick: (e) => {
            const open = el.querySelector(".vp-head-menu");
            if (open) return open.remove();
            const tour = h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-disabled": is2d ? "true" : null, title: is2d ? TOUR_2D : null },
                is2d ? AB.act({ onClick: () => AB.flash(TOUR_2D) }) : AB.act({ go: ["export-video", "tour"] })), h("span", { class: "k-check-col" }), h("span", null, AB.COMMANDS["record-tour"].label));
            const door = (id, sc) => h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-keyshortcuts": sc || null }, AB.act({ go: AB.COMMANDS[id].go })), h("span", { class: "k-check-col" }), h("span", null, AB.COMMANDS[id].label), sc ? h("span", { class: "k-shortcut", "aria-hidden": "true" }, sc) : null);
            const m = h("div", { class: "k-menu vp-menu vp-head-menu", role: "menu", "aria-label": "More view actions", style: "top: 40px" }, tour,
                h("div", { class: "k-menu-sep", role: "separator" }), door("export-image", AB.COMMANDS.export.shortcut), door("export-video"));
            el.append(m);
            tour.focus();
        } });
        // The two labeled commands sit on their own row under the title: the panel is too narrow for
        // "Views", both labels and "..." on one line. One command, one label on every door.
        const head = AB.placeHead("Views", more);
        head.classList.add("vp-head");
        const acts = h("div", { class: "vp-acts", role: "group", "aria-label": "View actions" },
            AB.button(AB.COMMANDS["save-view"].label, { kind: "secondary", icon: "bookmark-plus", go: ["camera-menu", "save-view"] }),
            AB.button(AB.COMMANDS.present.label, { kind: "secondary", icon: "play", go: ["present-mode", "presenting"] }));
        return [head, acts];
    }

    function row(v, o) {
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(v.tour), "aria-label": "In tour: " + v.name });
        const flip = (e) => {
            e.stopPropagation();
            v.tour = !v.tour;
            box.setAttribute("aria-checked", String(v.tour));
            AB.announce(v.name + (v.tour ? " is in the tour" : " is left out of the tour"));
        };
        box.addEventListener("click", flip);
        box.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(e); } });
        box.addEventListener("dblclick", (e) => e.stopPropagation());

        // The name is the row's one button; the In tour box is a sibling control, not nested in it
        const target = ["inspector-saved-view", v.tour ? "view" : "tour-off"];
        const name = h("span", { class: "vp-name", role: "button", tabindex: "0", "aria-current": o.selected ? "true" : null, title: "Rename needs graphty-element: " + RENAME_REASON }, v.name);
        name.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); AB.go(target[0], target[1]); } });
        const li = h("li", { class: "vp-row", role: "listitem", draggable: "true", "data-id": v.id, "aria-current": o.selected ? "true" : null, "data-nav": AB.href(target[0], target[1]) },
            h("span", { class: "vp-grip", "aria-hidden": "true", title: "Drag to reorder" }, icon("grip-vertical", "sm")),
            h("span", { class: "vp-thumb" }, AB.drawing(v.art, "")),
            h("span", { class: "vp-text" }, name,
                h("label", { class: "vp-tour k-secondary", on: { click: (e) => { e.stopPropagation(); box.click(); } } }, box, "In tour")));
        li.addEventListener("click", () => AB.go(target[0], target[1]));
        if (o.lifted) li.setAttribute("data-lifted", "");
        if (o.ghost) li.setAttribute("data-ghost", "");
        if (v.isNew) li.setAttribute("data-new", "");
        li.addEventListener("contextmenu", (e) => { e.preventDefault(); AB.go("context-menus", "saved-view"); });
        const rename = () => AB.flash("Rename: " + RENAME_REASON);
        name.addEventListener("dblclick", (e) => { e.stopPropagation(); rename(); });
        name.addEventListener("keydown", (e) => { if (e.key === "F2") { e.preventDefault(); rename(); } });
        return li;
    }

    // Drag to reorder, in place (native drag and drop). TEMPORARY WORKAROUND, for the study only: the
    // app holds the order and the In tour marks because graphty-element has no ordered camera-preset
    // collection with tour membership (spec section 19, to be filed). Delete once the element has one.
    function reorderable(list) {
        let dragged = null;
        const line = h("li", { class: "vp-drop", "aria-hidden": "true" });
        list.addEventListener("dragstart", (e) => {
            dragged = e.target.closest(".vp-row");
            if (!dragged) return;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dragged.dataset.id);
            requestAnimationFrame(() => dragged && dragged.setAttribute("data-ghost", ""));
        });
        list.addEventListener("dragover", (e) => {
            if (!dragged) return;
            e.preventDefault();
            const over = e.target.closest(".vp-row");
            if (!over || over === dragged) return;
            const r = over.getBoundingClientRect();
            list.insertBefore(line, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
        });
        list.addEventListener("drop", (e) => {
            e.preventDefault();
            if (dragged && line.parentNode) { list.insertBefore(dragged, line); AB.announce(dragged.getAttribute("aria-label").split(",")[0] + " moved"); }
        });
        list.addEventListener("dragend", () => { if (dragged) dragged.removeAttribute("data-ghost"); line.remove(); dragged = null; });
    }

    // The order and "In tour" are held by the app until graphty-element keeps an ordered preset collection
    const foot = () => h("div", { class: "vp-foot k-secondary" }, "This order is the report, presentation and tour order. ",
        AB.needsElement("An ordered camera-preset collection with tour membership: exportCameraPresets returns an unordered record. Until the element has one, the app holds the order and the In tour marks as a labeled temporary workaround."));
    function rowMenu() {
        const it = (label, o) => h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-disabled": o.disabled ? "true" : null, title: o.disabled ? o.reason : null }, o.disabled ? AB.act({ onClick: () => AB.flash(label + ": " + o.reason) }) : AB.act(o)),
            h("span", { class: "k-check-col" }), o.disabled ? h("span", null, label, h("span", { class: "k-menu-desc" }, AB.needsElement(o.reason))) : h("span", null, label), o.shortcut ? h("span", { class: "k-shortcut" }, o.shortcut) : null);
        return h("div", { class: "k-menu vp-menu", role: "menu", "aria-label": "Valjean's circle", style: "top: 178px" },
            it("Update to current camera", { onClick: () => AB.flash("Valjean's circle now keeps the current camera") }),
            it("Export image of this view...", { go: ["export-image", "from-view"] }),
            it("Record video from this view...", { go: ["export-video", "still"] }),
            h("div", { class: "k-menu-sep", role: "separator" }),
            it("Rename", { disabled: true, reason: RENAME_REASON, shortcut: "F2" }),
            it("Delete", { disabled: true, reason: DELETE_REASON }));
    }

    registerSection({
        id: "views-place",
        title: "Views place: saved views, Present, tours",
        region: "left",
        rail: "views",
        states: [
            { id: "at-rest", label: "Saved views" },
            { id: "empty", label: "No views yet" },
            { id: "one-selected", label: "One view selected" },
            { id: "reorder-drag", label: "Dragging a view to a new place" },
            { id: "in-tour-2d", label: "2D: Record tour unavailable" },
            { id: "saved-toast", label: "A view just saved" },
            { id: "saving", label: "Save view (lands as a new view)" },
            { id: "row-menu", label: "A view's menu" },
        ],
        frame(state) {
            if (state === "in-tour-2d") return { mode: "2d" };
            if (state === "one-selected" || state === "row-menu") return { right: "inspector-saved-view/view" };
            if (state === "saved-toast" || state === "saving") return { right: "inspector-saved-view/view" };
            return {};
        },
        render(el, state) {
            const is2d = state === "in-tour-2d";
            el.append(...header(is2d, el));
            if (is2d) {
                el.append(h("div", { class: "vp-why" }, h("span", null, "Record tour... is off in 2D. ", AB.needsElement(TOUR_2D)),
                    h("span", { class: "k-tertiary" }, "Present and " + AB.COMMANDS["save-view"].label + " work in 2D.")));
            }
            if (state === "empty") {
                el.append(h("div", { class: "vp-empty" },
                    h("div", null, "No saved views yet. Save the current camera with Save camera view..., here or in the Camera menu.")));
                el.append(foot());
                return;
            }
            const toast = state === "saved-toast" || state === "saving";
            const views = VIEWS.map((v) => Object.assign({}, v)).concat(toast ? [Object.assign({}, NEW_VIEW)] : []);
            const list = h("ul", { class: "vp-list", role: "list", "aria-label": "Saved views, in tour order" });
            const drag = state === "reorder-drag";
            views.forEach((v, i) => {
                const selected = (state === "one-selected" || state === "row-menu") ? v.id === "circle" : toast ? !!v.isNew : false;
                // mid-drag: "From above" is lifted over the drop line under "Whole cast"; its old slot shows faint
                if (drag && i === 1) list.append(h("li", { class: "vp-drop", "aria-hidden": "true" }), row(Object.assign({}, views[2]), { lifted: true }));
                list.append(row(v, { selected, ghost: drag && v.id === "top" }));
            });
            reorderable(list);
            el.append(list);
            el.append(foot());
            if (state === "row-menu") el.append(rowMenu());
            if (toast) {
                el.append(h("div", { class: "vp-toastwrap", role: "status" },
                    AB.notice("Saved view: " + NEW_VIEW.name, { label: "Open", go: ["inspector-saved-view", "view"] })));
                list.lastChild.after(h("li", { class: "vp-row k-tertiary", style: "min-height: 24px; padding-left: 28px" },
                    openQ("What name a new view gets before the user names it: the spec does not say, and the element cannot rename a saved view afterwards.")));
            }
        },
    });
})();
