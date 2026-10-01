/* Project-name menu: opened from the project name in the header (#ab-project), as in Figma.
   Items (spec section 10.2): Rename (F2), Save, Save as..., Export..., Apply recipe or style
   file..., Version history, Close project. This menu is "this project"; the main menu is "the app".
   "Show file location" is gone: a browser cannot show where a file lives.
   States: closed (the name at rest; a click opens the menu, a double-click or F2 renames -- the
   shell owns both gestures), open, rename (the name is a field in place), long-name (a
   60-character name, open: the header and the menu's name line take the end ellipsis, the full
   name in their tooltip). A rename lasts for this page visit only. Plain ASCII. */
(function () {
    "use strict";
    if (!document.getElementById("pm-style")) {
        document.head.append(h("style", { id: "pm-style" }, `#ab-project[aria-expanded="true"] { background: var(--cm-bg-hover); }
.pm-name.k-menu-label { display: block; max-width: 280px; line-height: 24px; }`));
    }

    let name = null; // the project's name for this visit; starts from the fixtures
    const names = {}; // per project on screen: renaming the door entries leaves Les Miserables as it was
    const ds = () => (AB.route && AB.route.frame.dataset) || "lesmis";

    const LONG = "Les Miserables co-occurrence network, every chapter, 1862 ed"; // 60 characters
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
            { id: "long-name", label: "Long name: 60 characters, end ellipsis and tooltip" },
        ],
        render(el, state) {
            name = names[ds()] || (names[ds()] = AB.fx.datasets[ds()].frame.project);
            const t = nameEl();
            if (state === "long-name") name = LONG; // this state only; a rename is not kept
            if (t) t.textContent = name;
            const p = document.getElementById("ab-project");
            if (p) {
                p.setAttribute("aria-expanded", String(state === "open" || state === "long-name"));
                p.setAttribute("aria-label", name + ", project menu");
                // The header shows about 30 characters; a name that does not fit keeps its full text in the tooltip
                if (state === "long-name") AB.tip(p, name, { label: false }); else delete p.dataset.tip;
            }

            // Closed and rename draw nothing in the overlay, so clicks reach the frame
            if (state === "closed") return;
            if (state === "rename") { setTimeout(renameName, 0); return; }

            el.append(AB.menu({
                anchor: "#ab-project",
                place: "below-start",
                label: "Project " + name,
                back: ["project-menu", "closed"],
                items: [
                    { heading: name },
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
            const head = el.querySelector(".k-menu-label");
            if (head) {
                head.classList.add("pm-name", "k-ellipsis");
                if (state === "long-name") AB.tip(head, name, { label: false });
            }
        },
    });
})();
