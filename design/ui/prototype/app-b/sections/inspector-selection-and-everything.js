/* Inspector: the Selection and Everything rows, the two built-in rows pinned at the top and bottom of the
   paint tree. Selection has a Style tab only (the selection's look). Everything has a Style tab (the
   default look, the background and the project's Look) and a Data tab that is the nothing-selected
   inspector's body, drawn by that section so the two never drift. Plain ASCII. */
(function () {
    const A = window.AB;
    const ID = "inspector-selection-and-everything";

    // Small styles this section needs; kept here so no shared file changes.
    if (!document.getElementById("isx-style")) {
        document.head.append(h("style", { id: "isx-style" }, `
.isx-open { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 10px; line-height: 16px; background: var(--cm-bg-warning, var(--cm-bg-secondary)); color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border-strong); vertical-align: 1px; cursor: help; }
.isx-line { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 16px; }
.isx-line .k-grow { min-width: 0; }
.isx-text { padding: 2px 16px 8px; }
.isx-gray { display: grid; grid-template-columns: auto 1fr auto auto; gap: 4px 8px; align-items: center; padding: 4px 16px 8px; }
.isx-gray .isx-g { justify-self: end; }
.isx-thumb { margin: 4px 16px 8px; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--cm-border); aspect-ratio: 16 / 9; background: var(--cm-bg-secondary); }
.isx-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(1); }
.isx-warn { color: var(--cm-text); }
.isx-ok { color: var(--cm-text-secondary); }
`));
    }

    const open = (q) => h("span", { class: "isx-open", title: q }, "Open question");
    const fieldRow = (legend, ...fields) => h("div", { class: "k-fieldrow" }, h("span", { class: "k-legend" }, legend), h("div", { class: "k-fields" }, fields));
    const wide = (f) => (f.classList.add("k-span3"), f);
    const pick = (label, value, o) => wide(A.field(value, Object.assign({ span: true, caret: true, onClick: () => A.flash(label + " (not wired in the skeleton)") }, o || {})));
    const colorField = (label, name) => wide(A.field(name, { span: true, caret: true, onClick: () => A.flash(label + " color picker (not wired in the skeleton)") }));
    function sw(el, color) { el.prepend(A.chit(color)); return el; }
    function toggle(label, on, onChange) {
        const s = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(!!on), "aria-label": label });
        const flip = () => { on = !on; s.setAttribute("aria-checked", String(on)); onChange && onChange(on); };
        s.addEventListener("click", flip);
        s.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), flip()));
        return h("div", { class: "isx-line" }, h("span", { class: "k-grow" }, label), s);
    }
    function seg(options, current) {
        return h("span", { class: "k-seg k-seg-fill k-span", role: "radiogroup", "aria-label": "Look" },
            options.map((o) => h("span", Object.assign({ role: "radio", "aria-checked": String(o.id === current), tabindex: "0" }, A.act({ go: [ID, o.state] })), o.label)));
    }

    // ---------- Selection row: Style ----------
    function selectionStyle() {
        const dimNote = h("div", { class: "isx-text k-secondary", hidden: true }, "While something is selected, every other node and edge fades. ", open("How far the rest fades, and whether a reader sets it"));
        return [
            A.section("Selected nodes and edges",
                fieldRow(h("span", null, "Outline color", open("The canvas draws the selection as a dark and a light band chosen for contrast on each background. Can a reader replace them with one color, and what happens to contrast then?")),
                    colorField("Outline", "Automatic: dark and light")),
                fieldRow("Outline width", pick("Outline width", "4 px")),
                toggle("Halo around selected nodes", false),
                toggle("Dim everything else", false, (on) => (dimNote.hidden = !on)),
                dimNote),
            A.section("On the canvas",
                h("div", { class: "isx-text k-secondary" }, "This row is always on top, so the selection's outline wins over every other row. To take the outline out of a screenshot, turn off this row's eye in the tree."),
                h("div", { class: "ab-pad" }, A.link("graph-place", "at-rest", "Show the paint order"))),
        ];
    }

    // ---------- Everything row: Style ----------
    // Relative luminance -> CIE L*, to read how far apart two colors stay when printed in gray.
    function lstar(hex) {
        const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
    }
    function grayOf(hex) {
        const L = lstar(hex), y = L > 8 ? ((L + 16) / 116) ** 3 : L / (24389 / 27);
        const v = Math.round(255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055));
        return "#" + v.toString(16).padStart(2, "0").repeat(3);
    }
    function grayCheck() {
        const lg = A.fx.datasets.lesmis.frame.legend;
        const rows = lg.rows.concat([{ label: "Other", color: lg.other.color, count: lg.other.count }]);
        const NEAR = 10; // ponytail: a fixed L* gap stands in for the element's real check; see the open question
        const clashes = [];
        for (let i = 0; i < rows.length; i++)
            for (let j = i + 1; j < rows.length; j++)
                if (Math.abs(lstar(rows[i].color) - lstar(rows[j].color)) < NEAR) clashes.push([rows[i], rows[j]]);
        const name = (r) => (r.label === "Other" ? "Other" : "group " + r.label);
        return A.section("Grayscale check",
            h("div", { class: "isx-text k-secondary" }, "How the graph's colors read when printed in gray. ", open("How close two grays may be before the check warns, and whether it also checks color-blind readers")),
            h("div", { class: "isx-thumb" }, A.drawing("lesmis-groups-rest", "Les Miserables colored by group, as it prints in gray")),
            h("div", { class: "isx-gray" },
                rows.map((r) => [A.chit(r.color, true), h("span", { class: "k-ellipsis" }, r.label === "Other" ? "Other" : "Group " + r.label), h("span", { class: "k-secondary k-num" }, r.count), h("span", { class: "isx-g" }, A.chit(grayOf(r.color), true))])),
            clashes.length
                ? h("div", null, h("div", { class: "isx-line isx-warn" }, h("span", { class: "k-warn-glyph" }, "!"), h("span", { class: "k-grow" }, clashes.length + (clashes.length === 1 ? " pair prints" : " pairs print") + " as nearly the same gray")),
                    h("div", { class: "isx-text k-secondary" }, clashes.map(([a, b]) => name(a) + " and " + name(b)).join("; ") + ".")
                  )
                : h("div", { class: "isx-line isx-ok" }, icon("check", "sm"), "Every group prints as its own gray"),
            h("div", { class: "ab-pad" }, A.button("Export a figure...", { kind: "secondary", go: ["export-dialog", "figure"] })),
        );
    }
    function everythingStyle(state) {
        const L = A.fx.datasets.lesmis, print = state === "print";
        const looks = [
            { id: "default", state: "everything", label: "Default" },
            { id: "print", state: "print", label: "Print" },
        ];
        return [
            A.section({ title: "Look", actions: open("Which Looks ship besides Default and Print, and what palette Print swaps in") },
                h("div", { class: "ab-pad" }, seg(looks, print ? "print" : "default")),
                h("div", { class: "isx-text k-secondary" }, print
                    ? "Print: reads in gray on white paper. It swaps the palettes under every color, adds no rows, and leaves the background alone. The legend names it."
                    : "Default: the palettes each row chose. The Look belongs to the project; a saved view keeps it.")),
            print ? grayCheck() : null,
            A.section("Nodes",
                fieldRow("Color", sw(colorField("Node", "808080"), "#808080")),
                fieldRow("Size", pick("Node size", "Default")),
                fieldRow("Shape", pick("Node shape", "Circle")),
                fieldRow("Label", wide(A.field(h("span", { class: "k-pill" }, "label"), { caret: true, onClick: () => A.flash("Label attribute (not wired in the skeleton)") })), pick("Label count", L.frame.labelBudget + " in view"))),
            A.section("Edges",
                fieldRow("Color", sw(colorField("Edge", "808080"), "#808080")),
                fieldRow("Width", pick("Edge width", "1 px")),
                fieldRow("Arrows", wide(A.field("None (undirected graph)", { onClick: () => A.flash("Arrows are drawn only on a directed graph") })))),
            A.section("Background",
                fieldRow("Canvas", wide(A.field(h("span", null, A.chit("var(--k-canvas, #F5F5F5)"), " Follows the theme"), { caret: true, onClick: () => A.flash("Background color (not wired in the skeleton)") })))),
            A.section("Paint order",
                h("div", { class: "isx-text k-secondary" }, "Everything is always the bottom row. Every row above it wins, property by property: a node in a group takes the group's color, not this one."),
                h("div", { class: "ab-pad" }, A.link("graph-place", "at-rest", "Show the paint order"), " ", h("span", { class: "k-tertiary" }, "or"), " ", A.link("graph-place", "everything-hidden", "hide Everything"))),
        ];
    }

    // ---------- Everything row: Data (the nothing-selected inspector's body) ----------
    function everythingData() {
        const tmp = h("div");
        A.renderSection("inspector-nothing-selected/overview", tmp);
        const body = tmp.querySelector(".ab-insp-body");
        return [
            h("div", { class: "isx-text k-secondary" }, "The whole graph, as the inspector shows it with ", A.link("inspector-nothing-selected", "overview", "nothing selected"), "."),
            body ? Array.from(body.childNodes) : Array.from(tmp.childNodes),
        ];
    }

    registerSection({
        id: ID,
        title: "Inspector: Selection and Everything rows",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "selection", label: "Selection row, Style" },
            { id: "everything", label: "Everything row, Style" },
            { id: "print", label: "Everything, Look set to Print" },
            { id: "data", label: "Everything row, Data" },
        ],
        render(el, state) {
            if (state === "selection") {
                el.append(A.inspector({ icon: "scan", title: "Selection", meta: "Nothing selected", kindKey: "selection-row", tab: "Style", tabs: { Style: selectionStyle } }));
                return;
            }
            const L = A.fx.datasets.lesmis;
            el.append(A.inspector({
                icon: "square", title: "Everything", meta: L.nodes + " nodes, " + L.edges + " edges", kindKey: "everything-row",
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: () => everythingStyle(state), Data: everythingData },
            }));
        },
    });
})();
