/* Project-name menu: opened from the project name at the top left (#ab-project), as in Figma.
   Items, in the spec's order: Rename, Author..., Export..., Version history, Duplicate,
   Show file location, Close. States: closed (the frame at rest, the name clickable), open,
   rename (the name becomes a field in place). Plain ASCII. The few styles it needs are
   injected below. A rename lasts for this page visit only. */
(function () {
    "use strict";
    const CSS = `
.pm-menu { width: 264px; }
.pm-oq { display: inline-block; margin-top: 2px; padding: 0 4px; border: 1px dashed var(--k-menu-ink3); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--k-menu-ink2); }
#ab-project[aria-expanded="true"] { background: var(--cm-bg-hover); }
#ab-project input.pm-name { width: 200px; height: 22px; font: inherit; color: inherit; background: var(--cm-bg-default, transparent); border: 1px solid var(--cm-bg-brand); border-radius: 4px; padding: 0 4px; }
`;
    if (!document.getElementById("pm-style")) document.head.append(h("style", { id: "pm-style" }, CSS));

    let name = null; // the project's name for this visit; starts from the fixtures

    function projectEl() { return document.getElementById("ab-project"); }
    function showName() {
        const p = projectEl();
        const t = p && p.querySelector(".k-ellipsis");
        if (t) t.textContent = name;
    }

    function item(o) {
        const target = o.go ? { go: o.go } : { onClick: o.onClick };
        return h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "data-described": o.desc || o.oq ? "" : null }, AB.act(target)),
            h("span", { class: "k-check-col" }),
            h("span", null, o.label,
                o.desc ? h("span", { class: "k-menu-desc" }, o.desc) : null,
                o.oq ? h("span", { class: "pm-oq", title: "Open question" }, "Open question: " + o.oq) : null),
            o.shortcut ? h("span", { class: "k-shortcut" }, o.shortcut) : null);
    }
    const sep = () => h("div", { class: "k-menu-sep", role: "separator" });

    function renameInPlace() {
        const p = projectEl();
        if (!p) return;
        const input = h("input", { class: "pm-name", value: name, "aria-label": "Project name" });
        let finished = false;
        // The field also blurs when another route redraws the top bar; only a rename still on screen navigates
        const done = (keep) => { if (finished) return; finished = true; if (keep) name = input.value.trim() || name; if (location.hash === AB.href("project-menu", "rename")) AB.go("project-menu", "closed"); };
        input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") done(true); if (e.key === "Escape") done(false); });
        input.addEventListener("click", (e) => e.stopPropagation());
        input.addEventListener("blur", () => done(true));
        p.querySelector(".k-ellipsis").replaceWith(input);
        setTimeout(() => { input.focus(); input.select(); }, 0);
    }

    registerSection({
        id: "project-menu",
        title: "Project-name menu",
        region: "overlay",
        rail: "graph",
        closeTo: "project-menu/closed",
        states: [
            { id: "closed", label: "Closed: the project name at rest" },
            { id: "open", label: "Open" },
            { id: "rename", label: "Rename: the name is a field" },
        ],
        render(el, state) {
            if (name === null) name = AB.fx.datasets.lesmis.frame.project;
            showName();
            const p = projectEl();
            if (p) p.setAttribute("aria-expanded", String(state === "open"));

            // Closed and rename draw nothing in the overlay, so the shell lets clicks reach the frame
            if (state === "closed") return;
            if (state === "rename") { renameInPlace(); return; }

            const file = AB.fx.datasets.lesmis.file;
            const m = h("div", { class: "k-menu ab-menu pm-menu", role: "menu", "aria-label": "Project " + name },
                item({ label: "Rename", go: ["project-menu", "rename"] }),
                item({ label: "Author...", desc: "The name shown on your notes and recipes", go: ["preferences", "general"],
                    oq: "this project's author, or the one in Preferences?" }),
                sep(),
                item({ label: "Export...", desc: "Figure, findings report, data and more", go: ["export-dialog", "figure"] }),
                item({ label: "Version history", desc: "Data versions, applied recipes, what was done", go: ["full-canvas-modes", "version-history"] }),
                sep(),
                item({ label: "Duplicate", onClick: () => AB.flash("Duplicate (not wired in the skeleton)") }),
                item({ label: "Show file location", desc: "Data loaded from " + file,
                    oq: "where the project file is kept, and its name",
                    onClick: () => AB.flash("Show file location (not wired in the skeleton)") }),
                sep(),
                item({ label: "Close", desc: "Back to the start screen; the selection is kept for next time", go: ["start-screen", "returning"] }),
            );
            el.append(AB.position(m, "#ab-project", "below-start"));
        },
    });
})();
