/* Views place: the project's saved views in user order (the report, presentation and tour order).
   Header: "+" (Save view), play (Present), "..." (Export tour video...). Rows: thumbnail, name, In tour.
   Built-in views are not listed here: they are the View flyout's Standard views. Thumbnails are
   stand-ins drawn from the kit's canvas art. Styles are injected once from this file. Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.vp-cols { display: flex; align-items: center; justify-content: flex-end; gap: 4px; height: 20px; padding: 0 12px 0 16px; flex: none; color: var(--cm-text-tertiary); }
.vp-list { list-style: none; margin: 0; padding: 0 0 4px; overflow: auto; flex: 1 1 auto; min-height: 0; }
.vp-row { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 4px 12px 4px 4px; border-radius: 5px; cursor: default; }
.vp-row:hover { background: var(--cm-bg-hover); }
.vp-row[aria-selected="true"] { background: var(--cm-bg-selected); }
.vp-row:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: -2px; }
.vp-thumb { position: relative; width: 48px; height: 36px; flex: none; border-radius: 4px; overflow: hidden; background: var(--cm-bg-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); }
.vp-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vp-text { flex: 1 1 auto; min-width: 0; display: grid; gap: 2px; }
.vp-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--cm-text); }
.vp-err { color: var(--cm-text-danger); white-space: normal; }
.vp-row .ab-rename[aria-invalid="true"] { border-color: var(--cm-text-danger); }
.vp-row[data-lifted] { margin: 2px 4px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); }
.vp-row[data-ghost] { color: var(--cm-text-secondary); font-style: italic; } /* the tree's dimmed italic, readable while dragging */
.vp-row[data-ghost] .vp-name { color: inherit; }
.vp-row[data-ghost] .vp-thumb { opacity: .5; }
.vp-drop { height: 2px; margin: -1px 8px -1px 28px; background: var(--cm-bg-brand); border-radius: 1px; position: relative; }
.vp-drop::before { content: ""; position: absolute; left: -4px; top: -3px; width: 6px; height: 6px; border-radius: 50%; border: 1.5px solid var(--cm-bg-brand); background: var(--cm-bg); }
`;
    if (!document.getElementById("vp-css")) document.head.append(h("style", { id: "vp-css" }, CSS));

    const RENAME_REASON = "graphty-element cannot rename a saved camera view yet";
    // The element records 2D video, but a tour stop takes a 3D position and target
    const TOUR_2D = "A tour moves the camera in 3D. Switch to 3D to export one";
    // Worded for anyone: a saved view keeps the name it was saved under (the element has no rename for it)
    const RENAME_OFF = "A saved view keeps the name it was saved with";
    // TEMPORARY WORKAROUND, for the study only: the app holds the order and the In tour marks because
    // graphty-element's exportCameraPresets returns an unordered record with no tour membership.
    const ORDER_NEEDS = "An ordered saved-view collection with tour membership: exportCameraPresets returns an unordered record, so the app holds the order and the In tour marks until the element has one";
    // Worded from the element's refusal (E_PROTECTED: a camera view already answers to the name)
    const STANDARD = ["Front", "Side", "Top", "Isometric"];
    const takenText = (n) => '"' + n + '" is a standard view. Choose another name.';

    const VIEWS = [
        { id: "whole", name: "Whole cast", art: "lesmis-groups-rest", tour: true },
        { id: "circle", name: "Valjean's circle", art: "lesmis-groups-valjean", tour: true },
        { id: "top", name: "From above", art: "lesmis-plain", tour: false },
    ];
    // Twenty views for the tour that fills the list (Les Miserables' own names); the list scrolls and Find shows past 15
    const ARTS = ["lesmis-groups-rest", "lesmis-groups-valjean", "lesmis-plain", "lesmis-neighbors", "lesmis-walk", "lesmis-step1", "lesmis-step2", "lesmis-step3"];
    const MANY = ["Whole cast", "Valjean's circle", "From above", "The bishop's household", "Fantine's friends", "Thenardier family", "Javert's pursuit",
        "Cosette and Marius", "Friends of the ABC", "The barricade", "Gavroche", "Eponine", "Champmathieu trial", "Petit-Gervais", "Montreuil-sur-Mer",
        "The convent", "Gorbeau house", "Patron-Minette", "Bridges to Valjean", "Closing shot"]
        .map((name, i) => ({ id: "m" + i, name, art: ARTS[i % ARTS.length], tour: i % 4 !== 2 }));
    // 60 characters: the name takes the end ellipsis, the full name in its tooltip
    const LONG = "Valjean, Javert and the students at the Rue de la Chanvrerie";
    // The views this page view keeps, in order: the fixture until the Views place first draws, empty
    // after "No views yet", and a view saved here stays in it. Present reads it as AB.savedViews.
    let kept = null;
    let lastState = null;
    const live = () => (kept || (kept = AB.savedViews = VIEWS.map((v) => Object.assign({}, v))));
    // the list's order and membership after a drag, a move or a delete
    const sync = (list) => {
        if (!kept || !list.closest("[data-vp-live]")) return;
        const byId = new Map(kept.map((v) => [v.id, v]));
        kept.splice(0, kept.length, ...[...list.querySelectorAll(".vp-row")].map((li) => byId.get(li.dataset.id)).filter(Boolean));
    };

    function header(state, n) {
        const save = AB.plus({ label: "Save view", items: ["Save view"], onAdd: () => AB.go("views-place", "saving") });
        const present = AB.iconButton("play", AB.COMMANDS.present.label, n ? { go: AB.COMMANDS.present.go } : { disabled: "Save a view first" });
        const more = AB.iconButton(AB.ICON.options, "More for views", { onClick: () => (document.querySelector(".k-menu") ? AB.closeMenu() : headMenu(more, n)) });
        return AB.placeHead("Views", [save, present, more]);
    }
    // Export tour video... opens Export > Video with View set to "Tour of saved views"
    function headMenu(anchor, n) {
        const in2d = AB.route.frame.mode === "2d";
        AB.openMenu(anchor, [
            { label: "Export tour video...", go: ["export-video", "tour"], disabled: in2d ? TOUR_2D : !n ? "Save a view first" : false },
        ]);
    }

    function rowMenu(li, v, list) {
        AB.openMenu(li, [
            // Disabled with its reason, not `needs`: a participant must see Rename and why it is off
            { label: "Rename", shortcut: "F2", disabled: RENAME_OFF },
            { label: "Update to current camera", onClick: () => AB.notice(v.name + " now keeps the current camera", { label: "Undo", onClick: () => AB.announce(v.name + " restored") }) },
            { sep: true },
            { label: "Delete", onClick: () => del(li, v, list) },
        ]);
    }
    // Delete is immediate (the element's removeCameraPreset, one undoable step) with the Undo notice
    function del(li, v, list) {
        const next = li.nextElementSibling;
        li.remove();
        sync(list);
        AB.deleted(v.name, () => { list.insertBefore(li, next && next.isConnected ? next : null); sync(list); });
    }

    function row(v, o, list) {
        // The tree's keyboard model: the row is the Tab stop and Space flips In tour (no second stop)
        // The row carries the state for assistive technology; the box is its picture and a pointer target
        const box = h("span", { class: "k-check", "aria-hidden": "true", "aria-checked": String(v.tour), "data-tip": "In tour", "data-key": "Space" });
        const said = () => v.name + (v.tour ? ", in tour" : ", not in tour");
        const flip = (e) => {
            e.stopPropagation();
            v.tour = !v.tour;
            box.setAttribute("aria-checked", String(v.tour));
            li.setAttribute("aria-label", said());
            AB.announce(v.name + (v.tour ? " is in the tour" : " is left out of the tour"));
        };
        box.addEventListener("click", flip);
        box.addEventListener("dblclick", (e) => e.stopPropagation());

        const name = h("span", { class: "vp-name", "data-name": "" }, v.name);
        if (!v.isNew) AB.tip(name, v.name, { label: false, second: "Rename needs graphty-element: " + RENAME_REASON });
        const li = h("li", { class: "vp-row", role: "option", tabindex: o.selected ? "0" : "-1", draggable: "true", "data-id": v.id, "data-row": v.id, "aria-selected": o.selected ? "true" : "false", "aria-label": said() },
            h("span", { class: "vp-thumb" }, AB.drawing(v.art, "")),
            h("span", { class: "vp-text" }, name),
            box);
        // Selecting a row marks it at once; the inspector shows the view's fixture state
        li.addEventListener("click", () => { list.querySelectorAll(".vp-row").forEach((x) => { x.setAttribute("aria-selected", String(x === li)); x.tabIndex = x === li ? 0 : -1; }); AB.go("inspector-saved-view", v.tour ? "view" : "tour-off"); });
        li.addEventListener("contextmenu", (e) => { e.preventDefault(); rowMenu(li, v, list); });
        li.addEventListener("dblclick", () => AB.flash("Rename needs graphty-element: " + RENAME_REASON));
        li.addEventListener("keydown", (e) => {
            if (e.target !== li) return;
            if (e.key === "Enter") AB.go("inspector-saved-view", v.tour ? "view" : "tour-off");
            else if (e.key === " ") flip(e);
            else if (e.key === "F2") AB.flash("Rename needs graphty-element: " + RENAME_REASON);
            else if (e.key === "F10" && e.shiftKey) rowMenu(li, v, list);
            else if (e.key === "Delete") del(li, v, list);
            else if ((e.ctrlKey || e.metaKey) && (e.key === "]" || e.key === "[")) {
                // Mod+] moves up, Mod+[ down, as in the Graph tree
                const sib = e.key === "[" ? li.nextElementSibling : li.previousElementSibling;
                if (sib && sib.classList.contains("vp-row")) { list.insertBefore(li, e.key === "[" ? sib.nextSibling : sib); sync(list); li.focus(); AB.announce(v.name + (e.key === "]" ? " moved up" : " moved down")); }
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                const sib = e.key === "ArrowDown" ? li.nextElementSibling : li.previousElementSibling;
                if (sib && sib.classList.contains("vp-row")) { list.querySelectorAll(".vp-row").forEach((x) => (x.tabIndex = x === sib ? 0 : -1)); sib.focus(); }
            } else return;
            e.preventDefault();
        });
        if (o.lifted) li.setAttribute("data-lifted", "");
        if (o.ghost) li.setAttribute("data-ghost", "");
        return li;
    }

    // Native drag and drop reorders in place; the drop line shows where the row lands
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
            if (dragged && line.parentNode) { list.insertBefore(dragged, line); sync(list); AB.announce(dragged.getAttribute("aria-label") + " moved"); }
        });
        list.addEventListener("dragend", () => { if (dragged) dragged.removeAttribute("data-ghost"); line.remove(); dragged = null; });
    }

    // The new row opens in rename, "View 4" selected. Enter saves; Esc keeps "View 4". A standard
    // view's name shows the element's refusal under the field and keeps the field open.
    function nameNew(li, v, typed) {
        const err = (n) => {
            const input = li.querySelector(".ab-rename");
            if (!input) return;
            input.value = n;
            input.setAttribute("aria-invalid", "true");
            input.setAttribute("aria-describedby", "vp-err");
            li.querySelector(".vp-text").append(h("span", { class: "vp-err k-secondary", id: "vp-err", role: "alert" }, takenText(n)));
        };
        const open = (n) => {
            const old = li.querySelector(".vp-err");
            if (old) old.remove();
            AB.createThenRename(li, {
                onSave: (name) => {
                    if (!STANDARD.some((s) => s.toLowerCase() === name.trim().toLowerCase())) { v.name = name; li.setAttribute("aria-label", v.name + (v.tour ? ", in tour" : ", not in tour")); return; }
                    li.querySelector(".vp-name").textContent = v.name;
                    setTimeout(() => { open(name); }, 0);
                },
            });
            if (n) err(n);
        };
        open(typed);
    }

    // Find by word starts (the shared matcher); no match shows the one empty line
    function findViews(list, q) {
        let shown = 0;
        list.querySelectorAll(".vp-row").forEach((li) => {
            const hit = !q.trim() || AB.wordMatch(li.querySelector(".vp-name").textContent, q);
            li.hidden = !hit;
            if (hit) shown++;
        });
        const old = list.parentNode.querySelector(".vp-nomatch");
        if (old) old.remove();
        if (!shown) list.after(Object.assign(AB.noMatch(q), { className: "ab-empty vp-nomatch" }));
        if (q.trim()) AB.announce(shown + (shown === 1 ? " match" : " matches"));
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
            { id: "in-tour-2d", label: "In 2D" },
            { id: "saving", label: "Save view: the new row, in rename" },
            { id: "save-name-taken", label: "Save view: a standard view's name" },
            { id: "row-menu", label: "A view's menu" },
            { id: "applied-missing", label: "Applied: a row it named is gone" },
            { id: "many", label: "Twenty views: the list scrolls, Find" },
            { id: "long-name", label: "A 60-character view name" },
        ],
        frame(state) {
            if (state === "in-tour-2d") return { mode: "2d" };
            if (state === "one-selected" || state === "row-menu" || state === "applied-missing") return { right: "inspector-saved-view/view" };
            return {};
        },
        render(el, state) {
            const again = lastState === state;
            lastState = state;
            const naming = state === "saving" || state === "save-name-taken";
            // at-rest and Save view draw the kept list; the other states draw their fixture
            const isLive = naming || state === "at-rest";
            if (state === "empty") kept = AB.savedViews = [];
            // Save view saves at once (the name can change in the row); a redraw of the same state
            // (an inspector opening beside it) shows the view already saved, not another one
            let fresh = null;
            if (naming && !again) {
                const n = live().length + 1;
                fresh = { id: "new" + n, name: "View " + n, art: "lesmis-neighbors", tour: true, isNew: true };
                kept.push(fresh);
            }
            const empty = state === "empty" || (isLive && !live().length);
            el.append(header(state, empty ? 0 : isLive ? live().length : VIEWS.length));
            if (empty) {
                el.append(AB.empty("No saved views.", { verb: "Save view", key: "+", go: ["views-place", "saving"] }));
                return;
            }
            if (isLive) el.dataset.vpLive = "";
            const base = state === "many" ? MANY : state === "long-name" ? VIEWS.map((v) => v.id === "circle" ? Object.assign({}, v, { name: LONG }) : v) : VIEWS;
            const newest = isLive && kept[kept.length - 1];
            const views = isLive ? kept : base.map((v) => Object.assign({}, v));
            // Past 15 views a find line leads the list (the field list's rule)
            if (views.length > 15) el.append(AB.treebar({ placeholder: "Find views", onInput: (input) => findViews(list, input.value) }));
            el.append(h("div", { class: "vp-cols k-secondary" }, AB.needsElement(ORDER_NEEDS), h("span", null, "In tour")));
            const list = h("ul", { class: "vp-list", role: "listbox", "aria-label": "Saved views, in tour order" });
            const drag = state === "reorder-drag";
            views.forEach((v, i) => {
                const selected = state === "applied-missing" ? v.id === "whole" : (state === "one-selected" || state === "row-menu") ? v.id === "circle" : naming && v === newest;
                // mid-drag: "From above" is lifted over the drop line under "Whole cast"; its old slot shows faint
                if (drag && i === 1) list.append(h("li", { class: "vp-drop", "aria-hidden": "true" }), row(Object.assign({}, views[2]), { lifted: true }, list));
                list.append(row(v, { selected, ghost: drag && v.id === "top" }, list));
            });
            // One Tab stop: the selected row, else the first
            if (!list.querySelector('.vp-row[tabindex="0"]')) { const f = list.querySelector(".vp-row"); if (f) f.tabIndex = 0; }
            reorderable(list);
            el.append(list);
            const at = (id) => list.querySelector('[data-id="' + id + '"]');
            if (fresh) requestAnimationFrame(() => nameNew(at(fresh.id), fresh, state === "save-name-taken" ? "Top" : null));
            // The view applies its camera; a row it named was deleted, so the notice names it and the view shows without it
            if (state === "applied-missing") requestAnimationFrame(() => AB.notice("Applied Whole cast without Group 1: that row was deleted", { label: "Update view", onClick: () => AB.announce("Whole cast updated") }));
            if (state === "in-tour-2d") requestAnimationFrame(() => headMenu(el.querySelector('[aria-label="More for views"]'), views.length));
            if (state === "row-menu") requestAnimationFrame(() => rowMenu(at("circle"), views[1], list));
        },
    });
})();
