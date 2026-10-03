/* Inspector: a saved view (from the Views place). One body, no tab strip, no section heads:
   the thumbnail (the camera's numbers in its tooltip), Mode, Caption (the one editable property,
   edited in place) and "Keeps: Camera" with one needs-graphty-element mark. Tour membership lives
   in the Views row; the camera is changed with Update to current camera in "...". Plain ASCII. */
(function () {
    "use strict";
    // The inspector shows the view the Views list marks selected (Valjean's circle when opened
    // directly). Whole cast has a caption; Valjean's circle has none yet, so its Caption shows the
    // placeholder, and caption-editing opens on that empty field.
    const VIEWS = {
        "Whole cast": { art: "lesmis-groups-rest", caption: "Every character of Les Miserables, colored by group, from the front." },
        "Valjean's circle": { art: "lesmis-groups-valjean", caption: "" },
    };
    const shownView = () => {
        const n = document.querySelector("#ab-left .vp-row[aria-selected=true] [data-name]");
        return n && VIEWS[n.textContent] ? n.textContent : "Valjean's circle";
    };
    // inspector-saved-view/long-caption: a caption at the 300-character limit (the one Present
    // wraps in present-mode/long-caption); the value column wraps it in full, never truncated.
    let longCaption = "Every character of Les Miserables, colored by the community the clustering found: the convicts of Toulon, the Thenardiers and their inn, the students of the ABC cafe and the household on the Rue Plumet. Seen from the front, Valjean sits where the groups meet and the minor characters ring the edge.";
    const HINT = "Shown under the view in Present and the findings report";

    if (!document.getElementById("sv-css")) {
        document.head.append(h("style", { id: "sv-css" },
            ".sv-thumb,.sv-thumb img{cursor:default}" /* a picture with a tooltip, not a control */ +
            ".sv-thumb{display:block;margin:8px 16px;aspect-ratio:16/10;border-radius:5px;overflow:hidden;background:var(--k-canvas);box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sv-thumb img{width:100%;height:100%;object-fit:cover;display:block}" +
            ".sv-cap{flex:1;min-width:0;padding:3px 6px;margin:0 -6px;border-radius:4px;line-height:18px;color:var(--cm-text);cursor:text;white-space:pre-line}" +
            ".sv-cap.sv-empty{color:var(--cm-text-secondary)}" +
            ".sv-cap:hover{box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            "textarea.sv-cap{box-sizing:border-box;width:calc(100% + 12px);font:inherit;background:var(--cm-bg);resize:vertical;field-sizing:content;min-height:48px;border:0;outline:0;box-shadow:inset 0 0 0 1px var(--cm-border-selected)}" +
            ".sv-keeps{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px}.sv-keeps>.ab-design-note{margin:0}"));
    }

    // Enter (or leaving the box) keeps the typed caption for this page view; Esc drops it.
    function caption(state, view) {
        const isLong = state === "long-caption";
        if (state !== "caption-editing") {
            // The long caption edits in place (no route of its own), so its editor keeps the long text
            const face = h("span", Object.assign({ class: "sv-cap" }, isLong
                ? AB.act({ onClick: () => {
                    const ta = editor(longCaption, (saved) => {
                        if (saved) { longCaption = ta.value.trim(); face.textContent = longCaption || HINT; face.classList.toggle("sv-empty", !longCaption); AB.announce("Caption saved"); }
                        ta.replaceWith(face); face.focus();
                    });
                    face.replaceWith(ta);
                } })
                : AB.act({ go: ["inspector-saved-view", "caption-editing"] })), (isLong ? longCaption : view.caption) || HINT);
            if (!(isLong ? longCaption : view.caption)) face.classList.add("sv-empty");
            return AB.tip(face, "Edit caption");
        }
        const ta = editor(view.caption, (saved) => {
            if (saved) { view.caption = ta.value.trim(); AB.announce("Caption saved"); }
            AB.go("inspector-saved-view", "view");
        });
        return ta;
    }

    function editor(text, back) {
        const ta = h("textarea", { class: "sv-cap", rows: "4", maxlength: "300", placeholder: HINT, "aria-label": "Caption" });
        ta.value = text;
        // Removing a focused box fires blur while it is still connected, so the first of Esc,
        // Enter or blur decides and the others do nothing (else Esc would save through blur)
        let done = false;
        const end = (saved) => { if (!done) { done = true; back(saved); } };
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end(false); }
            else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); end(true); }
        });
        ta.addEventListener("blur", () => end(true));
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
        // No tooltip here: the shared tooltip shows on keyboard focus and would take the first Esc
        return ta;
    }

    registerSection({
        id: "inspector-saved-view",
        title: "Inspector: a saved view",
        region: "right",
        rail: "views",
        frame: (state) => ({ left: "views-place/one-selected", mode: state === "view-2d" ? "2d" : "3d" }),
        closeTo: "views-place",
        states: [
            { id: "view", label: "A saved view" },
            { id: "caption-editing", label: "Editing the caption" },
            { id: "view-2d", label: "A 2D view" },
            { id: "long-caption", label: "A 300-character caption, wrapped" },
        ],
        render(el, state) {
            const is2d = state === "view-2d";
            // The camera state graphty-element returns for the view's mode (getCameraState)
            const camera = is2d ? "Zoom 1.6, pan -120, 48, rotation 0 deg" : "Position 0, 0, 742, target 0, 0, 0";
            const name = shownView();
            const view = VIEWS[name];
            const thumb = h("div", { class: "sv-thumb", tabindex: "0" }, AB.drawing(view.art, "Thumbnail of the view " + name));
            AB.tip(thumb, "Camera: " + camera);
            el.append(AB.inspector({
                icon: "bookmark",
                title: name,
                kind: "Saved view",
                kindKey: "saved-view",
                menu: ["context-menus", "saved-view"],
                renameDisabled: "a name a saved camera preset can store",
                body: () => [
                    thumb,
                    AB.fieldRow("Mode", is2d ? "2D" : "3D"),
                    AB.fieldRow("Caption", caption(state, view)),
                    AB.fieldRow("Keeps", h("span", { class: "sv-keeps" }, "Camera", AB.needsElement("A view snapshot: graphty-element keeps only the camera today. A view should also keep the rows shown, filter steps, hidden elements, the legend on or off, the Look and positions. Outside a view the legend is remembered per project."))),
                ],
            }));
        },
    });
})();
