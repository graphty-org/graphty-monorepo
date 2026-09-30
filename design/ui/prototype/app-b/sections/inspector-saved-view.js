/* Inspector: a saved view (from the Views place). One body, no tab strip. Read-only except the
   caption, the view's one editable property. Today graphty-element's camera preset keeps the
   camera only, so "Keeps" lists Camera checked and every other part of a view snapshot disabled
   with the needs-graphty-element mark.
   Cross-region touch: this file relabels the Camera menu face (#ab-zoom) after the canvas draws,
   so the face names the view ("Whole cast", or "Whole cast, moved" in camera-moved). No shared
   file is edited. Plain ASCII. */
(function () {
    "use strict";
    const VIEW = "Whole cast";
    const CAPTION = "Every character of Les Miserables, colored by group, from the front.";
    const SNAPSHOT = "a view snapshot";
    const oq = (text) => h("span", { class: "k-badge sv-oq", title: text }, "Open question");

    if (!document.getElementById("sv-css")) {
        document.head.append(h("style", { id: "sv-css" },
            ".sv-thumb{margin:4px 16px 8px;aspect-ratio:16/10;border-radius:5px;overflow:hidden;background:var(--k-canvas);box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sv-thumb img{width:100%;height:100%;object-fit:cover;display:block}" +
            ".sv-cap{display:block;margin:4px 16px 8px;min-height:48px;padding:6px 8px;border-radius:5px;box-shadow:inset 0 0 0 1px var(--cm-border);color:var(--cm-text);cursor:text;white-space:normal}" +
            ".sv-cap:hover{box-shadow:inset 0 0 0 1px var(--cm-border-strong)}" +
            "textarea.sv-cap{width:calc(100% - 32px);box-sizing:border-box;font:inherit;background:var(--cm-bg);resize:vertical;box-shadow:inset 0 0 0 1px var(--cm-border-selected);border:0;outline:0}" +
            ".sv-keep{display:flex;align-items:center;gap:0 8px;min-height:24px;padding:0 16px}" +
            ".sv-keep[aria-disabled=true] .sv-keep-name{color:var(--cm-text-tertiary)}" +
            ".sv-keep .k-check{margin:0;width:14px;height:14px;border:0}" +
            ".sv-keep .sv-keep-name{flex:1;min-width:0}.sv-keep>.ab-needs{flex:none;margin-inline-start:auto}" +
            ".sv-oq{margin-left:6px;font-size:10px;color:var(--cm-text-secondary);white-space:nowrap}" +
            ".sv-mono{font-family:var(--cm-font-mono,monospace)}"));
    }

    // The Camera menu face follows the state; the canvas draws after or before us, so wait a frame.
    function relabelFace(moved, mode) {
        requestAnimationFrame(() => {
            const old = document.getElementById("ab-zoom");
            if (old) old.replaceWith(AB.cameraFace({ view: VIEW, moved, mode: mode || "3d", zoom: mode === "2d" ? "160%" : null }));
        });
    }

    function captionBlock(state) {
        if (state !== "caption-editing") {
            const face = h("span", Object.assign({ class: "sv-cap", role: "button", title: "Edit the caption", "aria-label": "Caption: " + CAPTION + ". Edit" }, AB.act({ go: ["inspector-saved-view", "caption-editing"] })), CAPTION);
            return [face, h("div", { class: "ab-cap k-secondary" }, "Shown under the view in Present and in the findings report.")];
        }
        const ta = h("textarea", { class: "sv-cap", rows: "3", "aria-label": "Caption" });
        ta.value = CAPTION;
        const done = () => { AB.announce("Caption saved"); AB.go("inspector-saved-view", "view"); };
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); AB.go("inspector-saved-view", "view"); }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); done(); }
        });
        ta.addEventListener("blur", () => { if (location.hash.includes("caption-editing")) done(); });
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
        return [ta, h("div", { class: "ab-cap k-secondary" }, "Enter saves, Shift+Enter starts a new line, Esc cancels.")];
    }

    function keepLine(name, kept) {
        return h("div", { class: "sv-keep", "aria-disabled": kept ? null : "true" },
            h("span", { class: "k-check", role: "checkbox", "aria-checked": String(kept), "aria-disabled": "true", "aria-label": name }),
            h("span", { class: "sv-keep-name k-ellipsis" }, name),
            kept ? h("span", { class: "k-secondary" }, "always") : null);
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
            { id: "camera-moved", label: "Camera moved since the jump" },
            { id: "tour-off", label: "Left out of the tour" },
            { id: "view-2d", label: "A 2D view (zoom, pan, rotation)" },
        ],
        render(el, state) {
            const is2d = state === "view-2d";
            relabelFace(state === "camera-moved", is2d ? "2d" : "3d");
            const inTour = state !== "tour-off";
            el.append(AB.inspector({
                icon: "bookmark",
                title: VIEW,
                kind: "Saved view",
                kindKey: "saved-view",
                menu: ["context-menus", "saved-view"],
                renameDisabled: "graphty-element cannot remove a camera preset yet, so a rename would leave the old name behind",
                body: () => [
                    AB.section("View",
                        AB.data("Mode", is2d ? "2D" : "3D"),
                        AB.data("In tour", inTour ? "Yes" : "No, left out", { go: ["views-place", "one-selected"] }),
                        h("div", { class: "sv-thumb", title: "Captured from this view's camera when it was saved" }, AB.drawing("lesmis-groups", "Thumbnail of the view " + VIEW))),
                    // The fields are the camera state graphty-element returns for the view's mode:
                    // position and target in 3D; zoom, pan and rotation in 2D. Read-only here: Update
                    // to current camera (in "...") overwrites it, since saving under the same name does.
                    Object.assign(AB.section({ title: "Camera", collapsible: true, summary: is2d ? "Zoom, pan and rotation, read-only" : "Position and target, read-only", key: "saved-view.camera" },
                        is2d ? [AB.data("Zoom", h("span", { class: "sv-mono" }, "1.6")), AB.data("Pan", h("span", { class: "sv-mono" }, "-120, 48")), AB.data("Rotation", h("span", { class: "sv-mono" }, "0 deg"))]
                            : [AB.data("Position", h("span", { class: "sv-mono" }, "0, 0, 742")), AB.data("Target", h("span", { class: "sv-mono" }, "0, 0, 0"))]),
                        { title: "Read from graphty-element. To change it, move the camera and choose Update to current camera in the ... menu." }),
                    AB.section("Caption", captionBlock(state)),
                    AB.section({ title: "Keeps", collapsible: true, summary: "Camera only, today", key: "saved-view.keeps" },
                        keepLine("Camera", true),
                        ["Layers shown", "Filter steps", "Hidden elements", "Look", "Positions", "Notes shown"].map((n) => keepLine(n, false)),
                        // One mark for the six unchecked parts, so each name keeps its full width
                        h("div", { class: "ab-cap", style: "padding:4px 16px 0" }, AB.needsElement(SNAPSHOT)),
                        h("div", { class: "ab-cap k-secondary", style: "padding-top:8px" }, "A view keeps what is checked. Jumping to it moves only the camera; the rest of the graph stays as it is.",
                            oq("When the element can keep more, is each part chosen per view (these become switches) or does a view always keep all of it?"))),
                    AB.notesSection(0, ["notes-place", "all"]),
                ],
            }));
        },
    });
})();
