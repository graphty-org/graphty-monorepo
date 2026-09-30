/* Graphs switcher: the menu on the Graph place's switcher line. It lists the project's graphs
   (each with Rename, Move up, Move down) and holds what acts on whole graphs: New graph from,
   Add as another graph..., Compare with... and Version history. A derived graph is a new entry
   in this list, never a tree row. Plain ASCII. The few styles it needs are injected below. */
(function () {
    "use strict";
    const CSS = `
.gs-menu { width: 300px; }
.gs-graph { gap: 8px; }
.gs-graph .gs-name { flex: 1; min-width: 0; }
.gs-graph .gs-name input { width: 100%; height: 20px; font: inherit; color: inherit; background: #ffffff1a; border: 1px solid var(--cm-bg-brand); border-radius: 4px; padding: 0 4px; }
.gs-acts { display: inline-flex; gap: 2px; flex: none; margin-inline-start: auto; }
.gs-act { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; color: var(--k-menu-ink2); cursor: pointer; }
.gs-act:hover, .gs-act:focus-visible { background: #ffffff26; color: #fff; }
.gs-act[aria-disabled="true"] { color: var(--k-menu-ink3); pointer-events: none; }
.gs-oq { display: inline-block; margin-top: 2px; padding: 0 4px; border: 1px dashed var(--k-menu-ink3); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--k-menu-ink2); }
.gs-foot { padding: 4px 16px 4px 40px; font-size: 11px; line-height: 16px; color: var(--k-menu-ink2); max-width: 280px; }
.gs-sub { width: 280px; }
`;
    if (!document.getElementById("gs-style")) document.head.append(h("style", { id: "gs-style" }, CSS));

    // Numbers from kit/fixtures.json: the Les Miserables graph, and its quotient by the 10 groups
    // of the "group" attribute (7 legend rows plus "Other", which is groups 6, 7 and 10).
    function graphs(fx, state) {
        const L = fx.datasets.lesmis;
        const groups = L.frame.legend.rows.length + L.frame.legend.other.title.split(/,| and /).length;
        const base = { name: L.frame.graphRow, desc: L.nodes + " nodes, " + L.edges + " edges, from " + L.file, current: true };
        if (state !== "two-graphs") return [base];
        return [base, {
            name: L.frame.graphRow + " by group", derived: true,
            desc: groups + " nodes, one per group. Made from " + L.frame.graphRow + " by Quotient by groups",
        }];
    }

    let order = null; // per-visit order, so Move up and Move down change the list in place
    let lastState = null;

    function actBtn(iconName, label, disabled, onClick) {
        return h("span", Object.assign({ class: "gs-act", role: "button", "aria-label": label, title: label, "aria-disabled": disabled ? "true" : null }, disabled ? {} : AB.act({ onClick: (e) => { if (e) e.stopPropagation(); onClick(); } })), icon(iconName, "sm"));
    }

    function graphItem(g, i, list, redraw) {
        const name = h("span", { class: "gs-name" }, h("span", { class: "k-ellipsis", style: "display:block" }, g.name), h("span", { class: "k-menu-desc" }, g.desc),
            g.derived ? h("span", { class: "gs-oq", title: "Open question" }, "Open question: does it update when its source graph changes?") : null);
        const item = h("div", Object.assign({ class: "k-menu-item gs-graph", role: "menuitemradio", "aria-checked": g.current ? "true" : "false", "data-described": "" },
            AB.act({ onClick: () => (g.current ? AB.go("graph-place", "at-rest") : AB.flash("Switched to " + g.name + " (not wired in the skeleton)")) })),
        h("span", { class: "k-check-col" }, g.current ? icon("check", "sm") : null), name,
        h("span", { class: "gs-acts" },
            actBtn("pencil", "Rename " + g.name, false, () => {
                const input = h("input", { value: g.name, "aria-label": "Graph name" });
                const done = () => { g.name = input.value.trim() || g.name; redraw(); };
                input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") done(); if (e.key === "Escape") redraw(); });
                input.addEventListener("click", (e) => e.stopPropagation());
                input.addEventListener("blur", done);
                name.firstChild.replaceWith(input);
                input.focus(); input.select();
            }),
            actBtn("chevron-up", "Move " + g.name + " up", i === 0, () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); redraw(); }),
            actBtn("chevron-down", "Move " + g.name + " down", i === list.length - 1, () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); redraw(); })));
        return item;
    }

    function commandItem(label, o) {
        const it = h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-haspopup": o.sub ? "menu" : null, "aria-expanded": o.sub ? String(!!o.open) : null, "data-hover": o.open ? "" : null, "data-described": o.desc ? "" : null }, AB.act(o.go ? { go: o.go } : { onClick: o.onClick })),
            h("span", { class: "k-check-col" }), h("span", null, label, o.desc ? h("span", { class: "k-menu-desc" }, o.desc) : null),
            o.sub ? h("span", { class: "k-sub" }, icon("chevron-right", "sm")) : null);
        return it;
    }

    registerSection({
        id: "graphs-switcher",
        title: "Graphs switcher",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        states: [
            { id: "open", label: "One graph" },
            { id: "two-graphs", label: "Two graphs, one of them derived" },
            { id: "new-graph-from", label: "New graph from submenu open" },
        ],
        render(el, state) {
            if (state !== lastState || !order) { order = graphs(AB.fx, state); lastState = state; }
            const anchor = ".ab-switch-btn";
            const m = h("div", { class: "k-menu ab-menu gs-menu", role: "menu", "aria-label": "Graphs in this project" });
            let sub = null;
            const draw = () => {
                m.replaceChildren(
                    h("div", { class: "k-menu-label" }, "Graphs in this project"),
                    ...order.map((g, i) => graphItem(g, i, order, draw)),
                    h("div", { class: "k-menu-sep", role: "separator" }),
                    commandItem("New graph from", { sub: true, open: state === "new-graph-from", go: ["graphs-switcher", state === "new-graph-from" ? "open" : "new-graph-from"] }),
                    commandItem("Add as another graph...", { go: ["load-step", "preview"], desc: "Load a file into this project as its own graph" }),
                    commandItem("Compare with...", { go: ["full-canvas-modes", "comparison"], desc: "Two graphs, or two time windows" }),
                    h("div", { class: "k-menu-sep", role: "separator" }),
                    commandItem("Version history", { go: ["full-canvas-modes", "version-history"] }),
                );
            };
            draw();
            el.append(AB.position(m, anchor, "below-start"));

            if (state === "new-graph-from") {
                sub = AB.menu({
                    anchor: m.querySelector("[aria-haspopup=menu]"), place: "right-start",
                    items: [
                        { label: "Selection (Extract as graph)", disabled: true, desc: "Needs a selection: nothing is selected" },
                        { label: "Bipartite projection...", onClick: () => AB.flash("Bipartite projection options (not wired in the skeleton)") },
                        { label: "Quotient by groups...", desc: "One node per group of a group row", go: ["graphs-switcher", "two-graphs"] },
                        { label: "Combine graphs...", onClick: () => AB.flash("Combine graphs options (not wired in the skeleton)") },
                        { label: "Null-model sample...", onClick: () => AB.flash("Null-model sample options (not wired in the skeleton)") },
                    ],
                });
                sub.classList.add("gs-sub");
                sub.setAttribute("aria-label", "New graph from");
                sub.append(h("div", { class: "k-menu-sep", role: "separator" }), h("div", { class: "gs-foot" }, "Each makes a new graph in this list, with its own rows and positions. The graph it came from is unchanged."));
                el.append(sub);
            }
        },
    });
})();
