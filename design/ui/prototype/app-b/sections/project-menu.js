/* Project-name menu: opened from the project name in the header (#ab-project), as in Figma.
   Items (spec section 10.2): Rename (F2), Save, Save as..., Export..., Apply recipe or style
   file..., Version history, Close project. This menu is "this project"; the main menu is "the app".
   "Show file location" is gone: a browser cannot show where a file lives.
   States: closed (the name at rest; a click opens the menu, a double-click or F2 renames -- the
   shell owns both gestures), open, rename (the name is a field in place). A rename lasts for this
   page visit only. Plain ASCII. */
(function () {
    "use strict";
    if (!document.getElementById("pm-style")) {
        document.head.append(h("style", { id: "pm-style" }, `#ab-project[aria-expanded="true"] { background: var(--cm-bg-hover); }`));
    }

    let name = null; // the project's name for this visit; starts from the fixtures
    const names = {}; // per project on screen: renaming the door entries leaves Les Miserables as it was
    const ds = () => (AB.route && AB.route.frame.dataset) || "lesmis";

    const nameEl = () => document.querySelector("#ab-project .k-ellipsis");

    function renameName() {
        const t = nameEl();
        if (!t) return;
        AB.renameInPlace(t, {
            onSave: (n) => { name = names[ds()] = n; },
            focusAfter: { focus: () => { if (location.hash === AB.href("project-menu", "rename")) AB.go("project-menu", "closed"); } },
        });
    }

    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");

    registerSection({
        id: "project-menu",
        title: "Project-name menu",
        region: "overlay",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        closeTo: "project-menu/closed",
        states: [
            { id: "closed", label: "Closed: the project name at rest" },
            { id: "open", label: "Open" },
            { id: "rename", label: "Rename: the name is a field (double-click or F2)" },
        ],
        render(el, state) {
            name = names[ds()] || (names[ds()] = AB.fx.datasets[ds()].frame.project);
            const t = nameEl();
            if (t) t.textContent = name;
            const p = document.getElementById("ab-project");
            if (p) p.setAttribute("aria-expanded", String(state === "open"));

            // Closed and rename draw nothing in the overlay, so clicks reach the frame
            if (state === "closed") return;
            if (state === "rename") { setTimeout(renameName, 0); return; }

            el.append(AB.menu({
                anchor: "#ab-project",
                place: "below-start",
                label: "Project " + name,
                back: ["project-menu", "closed"],
                items: [
                    AB.cmd("rename", { go: ["project-menu", "rename"] }),
                    { sep: true },
                    { label: "Save", shortcut: "Ctrl+S", onClick: flash("Save") },
                    { label: "Save as...", shortcut: "Ctrl+Shift+S", onClick: flash("Save as") },
                    { sep: true },
                    AB.cmd("export"),
                    { label: "Apply recipe or style file...", desc: "Reuse another project's analysis or look on this data", go: ["recipe-apply", "binding"] },
                    AB.cmd("version-history"),
                    { sep: true },
                    { label: "Close project", desc: "Back to the start screen", go: ["start-screen", "returning"] },
                ],
            }));
        },
    });
})();
