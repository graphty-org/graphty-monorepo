/* Project-name menu: opened from the project name in the header (#ab-project), as in Figma.
   Items (spec section 10.2): Rename (F2) | the File list (AB.fileList(), the same five commands and
   words as the main menu) | Save as..., Close project. This menu is "this project"; the main menu is
   "the app". The dialog it opens itself (Save as) is titled with the project's name.
   "Show file location" is gone: a browser cannot show where a file lives.
   The menu opens under the name, so it carries no heading that repeats it (Figma does the same).
   States: closed (the name at rest; a click opens the menu, a double-click or F2 renames -- the
   shell owns both gestures), open, rename (the name is a field in place), long-name (a
   60-character name, open: the header takes the end ellipsis, the full name in its tooltip),
   save-as (the Save as dialog, titled with the name; the new name is a field). A rename lasts for
   this page visit only. Plain ASCII. */
(function () {
    "use strict";
    if (!document.getElementById("pm-style")) {
        document.head.append(h("style", { id: "pm-style" }, `#ab-project[aria-expanded="true"] { background: var(--cm-bg-hover); }`));
    }

    let name = null; // the project's name for this visit; starts from the fixtures
    const names = AB.projectNames; // per project on screen (the shell's, so the header reads it): renaming the door entries leaves Les Miserables as it was
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
            { id: "save-as", label: "Save as: the dialog, titled with the project's name" },
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
                if (state === "long-name") AB.tip(p, name, { label: false }); else AB.tip(p, "Project menu", { key: "F2", second: "Double-click or F2: rename", label: false });
            }

            // Closed and rename draw nothing in the overlay, so clicks reach the frame
            if (state === "closed") return;
            if (state === "rename") { setTimeout(renameName, 0); return; }
            if (state === "save-as") {
                // Save as names the project from here on: the header shows the new name, and this page
                // view's Recent projects lists it, dated now (the start screen reads AB.visit.recents)
                const input = h("input", { class: "k-field", type: "text", value: name + " copy", "aria-label": "Name", spellcheck: "false" });
                const save = () => {
                    const n = input.value.trim() || name, d = ds(), now = new Date();
                    names[d] = n;
                    const when = "Today " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
                    AB.visit.recents = [{ name: n, dataset: d, go: d === "lesmis" ? ["graph-place", "at-rest"] : null, when, path: "~/Documents/graphty/" + n + ".graphty" }].concat(AB.visit.recents.filter((r) => r.dataset !== d));
                    AB.flash("Saved as " + n);
                    AB.close();
                };
                input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); save(); } });
                el.append(AB.modal({
                    title: "Save " + name + " as",
                    body: AB.fieldRow("Name", input, { popover: true }),
                    foot: [AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }), AB.button("Save", { onClick: save })],
                }));
                return;
            }

            el.append(AB.menu({
                anchor: "#ab-project",
                place: "below-start",
                label: "Project " + name,
                back: ["project-menu", "closed"],
                items: [
                    AB.cmd("rename", { go: ["project-menu", "rename"] }),
                    { sep: true },
                    ...AB.fileList(),
                    { sep: true },
                    { label: "Save as...", shortcut: "Ctrl+Shift+S", go: ["project-menu", "save-as"] },
                    { label: "Close project", desc: "Back to the start screen", go: ["start-screen", "returning"] },
                ],
            }));
        },
    });
})();
