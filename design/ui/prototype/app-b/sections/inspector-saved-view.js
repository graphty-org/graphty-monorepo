/* Inspector: a saved view (from the Views place). One body, no tab strip, no section heads:
   the thumbnail (the camera's numbers in its tooltip), Mode, Caption (the one editable property,
   edited in place) and "Keeps: Camera" with one needs-graphty-element mark. Tour membership lives
   in the Views row; the camera is changed with Update to current camera in "...". Plain ASCII. */
(function () {
    "use strict";
    const VIEW = "Whole cast";
    const CAPTION = "Every character of Les Miserables, colored by group, from the front.";
    const HINT = "Shown under the view in Present and the findings report";

    if (!document.getElementById("sv-css")) {
        document.head.append(h("style", { id: "sv-css" },
            ".sv-thumb,.sv-thumb img{cursor:default}" /* a picture with a tooltip, not a control */ +
            ".sv-thumb{display:block;margin:8px 16px;aspect-ratio:16/10;border-radius:5px;overflow:hidden;background:var(--k-canvas);box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sv-thumb img{width:100%;height:100%;object-fit:cover;display:block}" +
            ".sv-cap{flex:1;min-width:0;padding:3px 6px;margin:0 -6px;border-radius:4px;line-height:18px;color:var(--cm-text);cursor:text;white-space:normal}" +
            ".sv-cap:hover{box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            "textarea.sv-cap{box-sizing:border-box;width:calc(100% + 12px);font:inherit;background:var(--cm-bg);resize:vertical;field-sizing:content;min-height:48px;border:0;outline:0;box-shadow:inset 0 0 0 1px var(--cm-border-selected)}" +
            ".sv-keeps{margin:-6px 0 8px;padding:0 16px}.sv-keeps>.ab-design-note{margin:0}"));
    }

    function caption(state) {
        if (state !== "caption-editing") {
            const face = h("span", Object.assign({ class: "sv-cap" }, AB.act({ go: ["inspector-saved-view", "caption-editing"] })), CAPTION);
            return AB.tip(face, "Edit caption");
        }
        const back = (saved) => { if (saved) AB.announce("Caption saved"); AB.go("inspector-saved-view", "view"); };
        const ta = h("textarea", { class: "sv-cap", rows: "4", placeholder: HINT, "aria-label": "Caption" });
        ta.value = CAPTION;
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); back(false); }
            else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); back(true); }
        });
        ta.addEventListener("blur", () => { if (location.hash.includes("caption-editing")) back(true); });
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
        ],
        render(el, state) {
            const is2d = state === "view-2d";
            // The camera state graphty-element returns for the view's mode (getCameraState)
            const camera = is2d ? "Zoom 1.6, pan -120, 48, rotation 0 deg" : "Position 0, 0, 742, target 0, 0, 0";
            const thumb = h("div", { class: "sv-thumb", tabindex: "0" }, AB.drawing("lesmis-groups", "Thumbnail of the view " + VIEW));
            AB.tip(thumb, "Camera: " + camera);
            el.append(AB.inspector({
                icon: "bookmark",
                title: VIEW,
                kind: "Saved view",
                kindKey: "saved-view",
                menu: ["context-menus", "saved-view"],
                renameDisabled: "a name a saved camera preset can store",
                body: () => [
                    thumb,
                    AB.fieldRow("Mode", is2d ? "2D" : "3D"),
                    AB.fieldRow("Caption", caption(state)),
                    AB.fieldRow("Keeps", "Camera"),
                    // The chip is wider than the value column, so it gets a line of its own under the row
                    h("div", { class: "sv-keeps ab-review-only k-secondary" }, "Rows, filters, hidden elements:", AB.needsElement("A view snapshot: graphty-element keeps only the camera today. A view should also keep the rows shown, filter steps, hidden elements, the legend on or off, the Look and positions. Outside a view the legend is remembered per project.")),
                ],
            }));
        },
    });
})();
