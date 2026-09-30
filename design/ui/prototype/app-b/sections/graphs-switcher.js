/* Graphs switcher: the menu on the Graph place's switcher line. It lists the project's graphs
   (double-click a name to rename it; each has Move up and Move down) and holds what acts on whole
   graphs: Compare with... and New graph from. A derived graph is a new entry in this list, never
   a tree row. Loading a file as a new graph is the load dialog's job, and version history lives
   in the project-name menu. Plain ASCII. The few styles it needs are injected below. */
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

    let order = null; // per-visit order, so Move up, Move down and rename change the list in place
    let lastState = null;
    const NO_TRANSFORM = "graphty-element has no transform API yet; computing a new graph in the app is not allowed.";

    function actBtn(iconName, label, disabled, onClick) {
        return h("span", Object.assign({ class: "gs-act", role: "button", "aria-label": label, title: label, "aria-disabled": disabled ? "true" : null }, disabled ? {} : AB.act({ onClick: (e) => { if (e) e.stopPropagation(); onClick(); } })), icon(iconName, "sm"));
    }

    // Double-click the name renames it (as in Figma); a single click switches graph, after a
    // short wait so a double-click does not also switch.
    function startRename(nameEl, g, redraw) {
        AB.renameInPlace(nameEl, { onSave: (n) => { g.name = n; redraw(); } });
    }

    function graphItem(g, i, list, redraw) {
        const label = h("span", { class: "k-ellipsis gs-label", style: "display:block", title: "Double-click to rename" }, g.name);
        const name = h("span", { class: "gs-name" }, label, h("span", { class: "k-menu-desc" }, g.desc),
            g.derived ? h("span", { class: "gs-oq", title: "Open question" }, "Open question: does it update when its source graph changes?") : null);
        let timer = null;
        const item = h("div", Object.assign({ class: "k-menu-item gs-graph", role: "menuitemradio", "aria-checked": g.current ? "true" : "false", "data-described": "" },
            AB.act({ onClick: () => {
                clearTimeout(timer);
                timer = setTimeout(() => (g.current ? AB.go("graph-place", "at-rest") : AB.flash("Switched to " + g.name + " (not wired in the skeleton)")), 250);
            } })),
        h("span", { class: "k-check-col" }, g.current ? icon("check", "sm") : null), name,
        h("span", { class: "gs-acts" },
            actBtn("chevron-up", "Move " + g.name + " up", i === 0, () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); redraw(); }),
            actBtn("chevron-down", "Move " + g.name + " down", i === list.length - 1, () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); redraw(); })));
        item.addEventListener("dblclick", (e) => { e.stopPropagation(); clearTimeout(timer); startRename(label, g, redraw); });
        item.addEventListener("keydown", (e) => { if (e.key === "F2") { e.preventDefault(); e.stopPropagation(); startRename(label, g, redraw); } });
        return item;
    }

    function commandItem(label, o) {
        return h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-haspopup": o.sub ? "menu" : null, "aria-expanded": o.sub ? String(!!o.open) : null, "data-hover": o.open ? "" : null, "data-described": o.desc ? "" : null }, AB.act(o.go ? { go: o.go } : { onClick: o.onClick })),
            h("span", { class: "k-check-col" }), h("span", null, label, o.desc ? h("span", { class: "k-menu-desc" }, o.desc) : null),
            o.sub ? h("span", { class: "k-sub" }, icon("chevron-right", "sm")) : null);
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
            { id: "rename", label: "Renaming a graph (double-click its name)" },
        ],
        render(el, state) {
            if (state !== lastState || !order) { order = graphs(AB.fx, state === "rename" ? "two-graphs" : state); lastState = state; }
            const m = h("div", { class: "k-menu ab-menu gs-menu", role: "menu", "aria-label": "Graphs in this project" });
            const draw = () => {
                m.replaceChildren(
                    h("div", { class: "k-menu-label" }, "Graphs in this project"),
                    ...order.map((g, i) => graphItem(g, i, order, draw)),
                    h("div", { class: "k-menu-sep", role: "separator" }),
                    commandItem("Compare with...", { go: ["full-canvas-modes", "comparison"], desc: "Two graphs, or two time windows" }),
                    commandItem("New graph from", { sub: true, open: state === "new-graph-from", go: ["graphs-switcher", state === "new-graph-from" ? "open" : "new-graph-from"] }),
                );
            };
            draw();
            el.append(AB.position(m, ".ab-switch-btn", "below-start"));

            if (state === "rename") {
                requestAnimationFrame(() => { const lab = m.querySelector(".gs-label"); if (lab) startRename(lab, order[0], draw); });
            }

            if (state === "new-graph-from") {
                const needs = () => AB.needsElement(NO_TRANSFORM);
                const sub = AB.menu({
                    anchor: m.querySelector("[aria-haspopup=menu]"), place: "right-start",
                    items: ["Selection (Extract as graph)", "Bipartite projection...", "Quotient by groups...", "Combine graphs...", "Null-model sample..."]
                        .map((label) => ({ label, disabled: true, desc: needs() })),
                });
                sub.classList.add("gs-sub");
                sub.setAttribute("aria-label", "New graph from");
                sub.append(h("div", { class: "k-menu-sep", role: "separator" }), h("div", { class: "gs-foot" }, "Each makes a new graph in this list, with its own rows and positions. The graph it came from is unchanged."));
                el.append(sub);
            }
        },
    });
})();
