/* Project-name menu: opened from the project name at the top left (#ab-project), as in Figma.
   Items (spec section 10.2): Rename (a door to double-clicking the name), Save, Save as...,
   Export..., Version history, Show file location, Close. This menu is "this project"; the main
   menu is "the app". Duplicate and Author... are gone (Save as... and Settings > You are their homes). States: closed (the name at rest; a click opens the menu,
   a double-click renames), open, rename (the name is a field in place). A rename lasts for this
   page visit only. Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.pm-menu { width: 264px; }
.pm-oq { display: inline-block; margin-top: 2px; padding: 0 4px; border: 1px dashed var(--k-menu-ink3); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--k-menu-ink2); }
#ab-project[aria-expanded="true"] { background: var(--cm-bg-hover); }
`;
    if (!document.getElementById("pm-style")) document.head.append(h("style", { id: "pm-style" }, CSS));

    let name = null; // the project's name for this visit; starts from the fixtures

    function projectEl() { return document.getElementById("ab-project"); }
    function showName() {
        const t = projectEl() && projectEl().querySelector(".k-ellipsis");
        if (t) { t.textContent = name; t.title = "Click for the project menu; double-click to rename"; }
    }

    // Double-clicking the name renames it, as in Figma. The shell owns the name's click (it opens
    // the menu), so the double-click is caught once, on the document.
    document.addEventListener("dblclick", (e) => {
        if (e.target.closest && e.target.closest("#ab-project") && !e.target.closest("input")) {
            e.preventDefault();
            AB.go("project-menu", "rename");
        }
    });

    function renameName() {
        const t = projectEl() && projectEl().querySelector(".k-ellipsis");
        if (!t) return;
        // The shared rename field; leaving it (Enter, Esc, blur) returns to the name at rest
        AB.renameInPlace(t, {
            onSave: (n) => { name = n; },
            focusAfter: { focus: () => { if (location.hash === AB.href("project-menu", "rename")) AB.go("project-menu", "closed"); } },
        });
    }

    function item(o) {
        const target = o.go ? { go: o.go } : { onClick: o.onClick };
        return h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "data-described": o.desc || o.oq ? "" : null, "aria-keyshortcuts": o.keys || null }, AB.act(target)),
            h("span", { class: "k-check-col" }),
            h("span", null, o.label,
                o.desc ? h("span", { class: "k-menu-desc" }, o.desc) : null,
                o.oq ? h("span", { class: "pm-oq", title: "Open question" }, "Open question: " + o.oq) : null),
            o.shortcut ? h("span", { class: "k-shortcut", "aria-hidden": o.keys ? "true" : null }, o.shortcut) : null);
    }
    const sep = () => h("div", { class: "k-menu-sep", role: "separator" });

    registerSection({
        id: "project-menu",
        title: "Project-name menu",
        region: "overlay",
        rail: "graph",
        closeTo: "project-menu/closed",
        states: [
            { id: "closed", label: "Closed: the project name at rest" },
            { id: "open", label: "Open" },
            { id: "rename", label: "Rename: the name is a field (double-click the name)" },
        ],
        render(el, state) {
            if (name === null) name = AB.fx.datasets.lesmis.frame.project;
            showName();
            const p = projectEl();
            if (p) p.setAttribute("aria-expanded", String(state === "open"));

            // Closed and rename draw nothing in the overlay, so the shell lets clicks reach the frame
            if (state === "closed") return;
            if (state === "rename") { setTimeout(renameName, 0); return; }

            const file = AB.fx.datasets.lesmis.file;
            const m = h("div", { class: "k-menu ab-menu pm-menu", role: "menu", "aria-label": "Project " + name },
                item({ label: "Rename", shortcut: "Double-click", go: ["project-menu", "rename"] }),
                sep(),
                item({ label: "Save", shortcut: "Ctrl+S", keys: "Control+S", onClick: () => AB.flash("Save (not wired in the skeleton)") }),
                item({ label: "Save as...", shortcut: "Ctrl+Shift+S", keys: "Control+Shift+S", onClick: () => AB.flash("Save as (not wired in the skeleton)") }),
                item({ label: "Export...", shortcut: "Ctrl+E", keys: "Control+E", desc: "Image, video, report, data and more", go: ["export-image", "image"] }),
                item({ label: "Version history", desc: "Data versions, applied recipes, what was done", go: ["full-canvas-modes", "version-history"] }),
                item({ label: "Show file location", desc: "Data loaded from " + file,
                    oq: "where the file lives",
                    onClick: () => AB.flash("Show file location (not wired in the skeleton)") }),
                sep(),
                item({ label: "Close", desc: "Back to the start screen", go: ["start-screen", "returning"] }),
            );
            el.append(AB.position(m, "#ab-project", "below-start"));
        },
    });
})();
