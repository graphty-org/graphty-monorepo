/**
 * The dry run's routes: one per feature a user reaches from the start page. The first come from the
 * success paths of the design studio's tier 3 study (design/ui/studio/tier3/answers.md, "Success
 * paths on build 758b8e8081"); each route's `from` names the study task half it walks.
 *
 * A route has two parts, kept apart on purpose:
 *
 *  - `walk(u)`: what the user does, through `u` (README.md, "The user's hands"): real clicks, keys and
 *    file choices, from the start page, never by URL and never by calling the app's code. The author
 *    of a UI change may re-record these steps.
 *  - `checks`: what the user would see when the walk is done, read through graphty-element's public
 *    API (`g`, README.md, "Reading the outcome") or the page's accessibility tree. A branch may not
 *    remove or change an existing check except on a branch of its own
 *    (tools/dry-run-check-guard.mjs). Each check is retried until it passes or 15 seconds pass, so it
 *    waits on its condition, never on a clock.
 *
 * tools/dry-run-check-guard.mjs reads this file without running it: every route's `checks` and
 * other properties, every import, and every top-level declaration a check uses (directly or through
 * another) are protected. A declaration only the walks use is a step, free to change, and may not
 * write to anything protected.
 */
import assert from "node:assert/strict";

// ---------------------------------------------------------------- steps many routes share

/**
 * Wait until the open graph is in: the Everything layer counts its nodes. The layer appears with
 * "0 nodes" before the data arrives, so a walk that went on at that point acted on an empty graph.
 * @param u the user's hands (README.md)
 */
async function opened(u) {
    await u.page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
}

/**
 * Samples, then the sample's card: the graph opens on the Graph's Values tab.
 * @param u the user's hands (README.md)
 * @param sample the sample as its card names it ("Les Miserables")
 */
async function openSample(u, sample) {
    await u.click("Samples");
    // A card is named "Open the <name> sample: <its title>".
    const name = sample.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await u.click(u.button(new RegExp(`^Open the ${name} sample: `)));
    await opened(u);
}

/**
 * "Open a file" and the file chosen in the browser's chooser: the graph opens at once.
 * @param u the user's hands (README.md)
 * @param file a file in design/ui/studio/tool/files/
 */
async function openFile(u, file) {
    await u.upload(u.page.getByRole("button", { name: /^Open a file/ }), file);
    await opened(u);
}

/**
 * "+" beside Style layers, then Layer; the new layer's name box keeps "Layer 1" at the next click.
 * @param u the user's hands (README.md)
 */
async function newLayer(u) {
    await u.click("Add a layer or a folder");
    await u.page.getByRole("menuitem", { name: "Layer", exact: true }).click();
    await u.page.getByRole("heading", { name: "Layer 1", level: 2 }).waitFor();
}

/**
 * The collapsed "Which nodes" (or "Which edges") line of a layer or folder: a click expands it.
 * @param u the user's hands (README.md)
 */
async function openWhich(u) {
    await u.page.getByRole("button", { name: /^Which (nodes|edges),/ }).click();
}

/**
 * "Add a condition" in the layer's Which nodes (or Which edges), then the column in its attribute list.
 * @param u the user's hands (README.md)
 * @param column the column, as the attribute list names it
 */
async function addCondition(u, column) {
    await u.click("Add a condition");
    await u.page
        .getByRole("listbox", { name: "Attributes" })
        .getByRole("option", { name: new RegExp(`^${column}(,|$)`) })
        .click();
}

/**
 * Fill "+" (the Color line, focus in its box), then a color typed and Enter.
 * @param u the user's hands (README.md)
 * @param color a color word or hex, as a user types it
 */
async function fill(u, color) {
    await u.click("Add to node fill");
    await u.type(color);
    await u.key("Enter");
}

/**
 * A card's match menu ("<column>: how to match"), then one of its choices.
 * @param u the user's hands (README.md)
 * @param column the column, as the attribute list names it
 * @param choice the choice, as the menu names it
 */
async function match(u, column, choice) {
    await u.page.getByRole("combobox", { name: `${column}: how to match` }).click();
    await u.page.getByRole("option", { name: choice, exact: true }).click();
}

/**
 * The Everything layer: its inspector opens on Style, Node.
 * @param u the user's hands (README.md)
 */
async function everything(u) {
    await u.page.getByRole("treeitem", { name: /^Everything,/ }).click();
}

/**
 * A "by attribute" link beside a style line ("Node size by attribute"), then the column.
 * @param u the user's hands (README.md)
 * @param link the link's accessible name
 * @param column the column, as the attribute list names it
 */
async function byAttribute(u, link, column) {
    await u.click(link);
    await u.page.getByRole("option", { name: new RegExp(`^${column}(,|$)`) }).click();
}

/**
 * Analyze, the analysis typed into its filter, Enter, then its Run button.
 * @param u the user's hands (README.md)
 * @param analysis the analysis, as its Run button names it ("Louvain")
 */
async function analyze(u, analysis) {
    await u.click("Analyze");
    await u.type(analysis.toLowerCase());
    await u.key("Enter");
    await u.click(`Run ${analysis}`);
}

/**
 * A new layer's Edge tab, then "Add a condition" and the column.
 * @param u the user's hands (README.md)
 * @param column the column, as the attribute list names it
 */
async function edgeCondition(u, column) {
    await u.page.getByRole("tab", { name: "Edge", exact: true }).click();
    await openWhich(u);
    await addCondition(u, column);
}

/**
 * Line "+" ("Add to edge line"), one of its choices, then a value typed and Enter.
 * @param u the user's hands (README.md)
 * @param choice the choice, as the menu names it
 * @param value what to type
 */
async function line(u, choice, value) {
    await u.click("Add to edge line");
    await u.page.getByRole("menuitem", { name: choice, exact: true }).click();
    await u.type(value);
    await u.key("Enter");
}

/**
 * The Everything layer, then its node color box, a color typed and Enter.
 * @param u the user's hands (README.md)
 * @param color a color word or hex, as a user types it
 */
async function everythingColor(u, color) {
    await u.page.getByRole("treeitem", { name: /^Everything,/ }).click();
    await u.page.getByRole("textbox", { name: /^Node color/ }).click();
    await u.type(color);
    await u.key("Enter");
}

// ---------------------------------------------------------------- what checks read

const STARTING_NODE_COLOR = "#6366F1";
const STARTING_EDGE_COLOR = "#A9A9A9";
const yes = (v) => v === true || v === "yes" || v === "true";
const missing = (v) => v === null || v === undefined || v === "";

/**
 * Every distinct value in a map, as a set.
 * @param map a promise of id to value
 * @returns the values
 */
const valuesOf = async (map) => new Set(Object.values(await map));

/**
 * Exactly the nodes whose record passes `test` -- `count` of them, the number the screen gives --
 * are drawn in `color`; every other node keeps the starting color.
 * @param g the readers (README.md)
 * @param test which records are meant
 * @param color a color word or hex, as a user types it
 * @param count how many the screen says there are
 */
async function onlyTheseColored(g, test, color, count) {
    const [colors, nodes] = [await g.nodeLook("node.color"), await g.nodes()];
    const want = nodes
        .filter(test)
        .map((n) => n.id)
        .sort();
    assert.equal(want.length, count, `the data holds ${count} such nodes`);
    const drawn = Object.keys(colors)
        .filter((id) => colors[id] === color)
        .sort();
    assert.deepEqual(drawn, want, `the nodes drawn ${color}`);
    const rest = Object.keys(colors).filter((id) => !want.includes(id));
    assert.deepEqual(
        new Set(rest.map((id) => colors[id])),
        new Set([STARTING_NODE_COLOR]),
        "every other node keeps the starting color",
    );
}

/**
 * Exactly the edges whose record passes `test` -- `count` of them -- are drawn with `look`
 * (channel to value); every other edge keeps the starting width and gray.
 * @param g the readers (README.md)
 * @param test which records are meant
 * @param look { width, color } they are drawn with
 * @param count how many the screen says there are
 */
async function onlyTheseEdges(g, test, look, count) {
    const edges = await g.edges();
    const want = new Set(edges.filter(test).map((e) => e.id));
    assert.equal(want.size, count, `the data holds ${count} such edges`);
    const drawn = { width: await g.edgeLook("edge.width"), color: await g.edgeLook("edge.color") };
    for (const e of edges) {
        const expect = want.has(e.id) ? look : { width: 8, color: STARTING_EDGE_COLOR };
        assert.deepEqual({ width: drawn.width[e.id], color: drawn.color[e.id] }, expect, `edge ${e.id}`);
    }
}

/**
 * After a community run: `count` nodes drawn red, the found node among them, the rest in `others` other colors.
 * @param g the readers (README.md)
 * @param name the node's name
 * @param count how many the screen says there are
 * @param others how many other clusters there are
 */
async function oneClusterRed(g, name, count, others) {
    const [colors, nodes] = [await g.nodeLook("node.color"), await g.nodes()];
    const red = nodes.filter((n) => colors[n.id] === "#FF0000");
    // a node's name is its `name` column on one file and its `label` column on another
    assert.ok(
        red.some((n) => n.name === name || n.label === name),
        `${name} is red`,
    );
    assert.equal(red.length, count, "the cluster's size");
    const rest = new Set(nodes.filter((n) => colors[n.id] !== "#FF0000").map((n) => colors[n.id]));
    assert.equal(rest.size, others, "the other clusters keep their own colors");
    assert.ok(!rest.has(STARTING_NODE_COLOR), "no node is left in the starting color");
}

/**
 * A style channel follows a number column: the node with more is never drawn smaller.
 * @param g the readers (README.md)
 * @param channel the style channel ("node.size")
 * @param column the column, as the attribute list names it
 */
async function followsNumber(g, channel, column) {
    const [look, nodes] = [await g.nodeLook(channel), await g.nodes()];
    const byValue = nodes.filter((n) => !missing(n[column])).sort((a, b) => Number(a[column]) - Number(b[column]));
    const drawn = byValue.map((n) => look[n.id]);
    assert.ok(new Set(drawn).size > 1, `${channel} varies`);
    for (let i = 1; i < drawn.length; i++)
        assert.ok(drawn[i] >= drawn[i - 1], `${byValue[i].id} has more ${column} but is drawn smaller`);
}

/**
 * Every node of one value of `column` shares one color, and each value has its own.
 * @param g the readers (README.md)
 * @param column the column, as the attribute list names it
 * @param values every value the column holds
 */
async function colorPerValue(g, column, values) {
    const [colors, nodes] = [await g.nodeLook("node.color"), await g.nodes()];
    const per = new Map();
    for (const n of nodes) per.set(n[column], (per.get(n[column]) ?? new Set()).add(colors[n.id]));
    assert.deepEqual(new Set(per.keys()), new Set(values), `the values of ${column}`);
    for (const [v, c] of per) assert.equal(c.size, 1, `every ${v} is drawn in one color`);
    assert.equal(new Set([...per.values()].map((c) => [...c][0])).size, values.length, "each value has its own color");
}

const sizeIs = (nodes, edges) => async (g) => assert.deepEqual(await g.counts(), { nodes, edges });

// ---------------------------------------------------------------- the routes

export const routes = [
    {
        id: "t37a-sample-size-and-hub",
        feature: "Open a sample and read its size and its most connected node",
        from: "T37 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
        },
        checks: {
            "Les Miserables opens with 77 nodes and 254 edges": sizeIs(77, 254),
            "the Values tab shows the highest degree, 36": async (g) =>
                assert.match(await g.page.getByRole("group", { name: "Highest" }).innerText(), /\b36\b/),
        },
    },
    {
        id: "t37b-sample-size-and-hub",
        feature: "Open a sample and read its size and its most connected node",
        from: "T37 B",
        async walk(u) {
            await openSample(u, "Zachary's karate club");
        },
        checks: {
            "the karate club opens with 34 nodes and 78 edges": sizeIs(34, 78),
            "the Values tab shows the highest degree, 17": async (g) =>
                assert.match(await g.page.getByRole("group", { name: "Highest" }).innerText(), /\b17\b/),
        },
    },
    {
        id: "t38a-file-category-blue",
        feature: "Open a GraphML file and color two values of a category",
        from: "T38 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await newLayer(u);
            await addCondition(u, "role");
            await u.page.getByRole("checkbox", { name: /^board/ }).click();
            await u.page.getByRole("checkbox", { name: /^staff/ }).click();
            await u.click("Done");
            await fill(u, "blue");
        },
        checks: {
            "volunteers.graphml opens with 24 nodes and 63 edges": sizeIs(24, 63),
            "exactly the 8 board and staff are blue": (g) =>
                onlyTheseColored(g, (n) => n.role === "board" || n.role === "staff", "#0000FF", 8),
        },
    },
    {
        id: "t38b-file-category-blue",
        feature: "Open a GraphML file and color two values of a category",
        from: "T38 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await newLayer(u);
            await addCondition(u, "kind");
            await u.page.getByRole("checkbox", { name: /^company/ }).click();
            await u.page.getByRole("checkbox", { name: /^agency/ }).click();
            await u.click("Done");
            await fill(u, "blue");
        },
        checks: {
            "sources.graphml opens with 24 nodes and 59 edges": sizeIs(24, 59),
            "exactly the 10 companies and agencies are blue": (g) =>
                onlyTheseColored(g, (n) => n.kind === "company" || n.kind === "agency", "#0000FF", 10),
        },
    },
    {
        id: "t39a-everything-dark-green",
        feature: "Color every node from the Everything layer",
        from: "T39 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await everythingColor(u, "darkgreen");
        },
        checks: {
            "every node is dark green": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.color")), new Set(["#006400"])),
            "every tie keeps its starting gray": async (g) =>
                assert.deepEqual(await valuesOf(g.edgeLook("edge.color")), new Set([STARTING_EDGE_COLOR])),
        },
    },
    {
        id: "t39b-new-layer-orange",
        feature: "Color every node from a new layer with no condition",
        from: "T39 B",
        async walk(u) {
            await openSample(u, "College football");
            await newLayer(u);
            await fill(u, "orange");
        },
        checks: {
            "College football opens with 115 nodes and 613 edges": sizeIs(115, 613),
            "every node is orange": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.color")), new Set(["#FFA500"])),
            "the new layer is in the layer list": async (g) => assert.ok((await g.layers()).includes("Layer 1")),
        },
    },
    {
        id: "t40a-name-contains-purple",
        feature: "Color the nodes whose name contains some letters",
        from: "T40 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await newLayer(u);
            await addCondition(u, "name");
            await u.type("Mme");
            await u.key("Enter");
            await fill(u, "purple");
        },
        checks: {
            "exactly the 6 names holding Mme are purple": (g) =>
                onlyTheseColored(g, (n) => String(n.name).includes("Mme"), "#800080", 6),
        },
    },
    {
        id: "t40b-name-starts-with-purple",
        feature: "Color the nodes whose name starts with some letters",
        from: "T40 B",
        async walk(u) {
            await openFile(u, "yeast-galactose.graphml");
            await newLayer(u);
            await addCondition(u, "name");
            await match(u, "name", "Starts with");
            await u.type("GAL");
            await u.key("Enter");
            await fill(u, "purple");
        },
        checks: {
            "yeast-galactose.graphml opens with 331 nodes and 361 edges": sizeIs(331, 361),
            "exactly the 8 names starting with GAL are purple": (g) =>
                onlyTheseColored(g, (n) => String(n.name).startsWith("GAL"), "#800080", 8),
        },
    },
    {
        id: "t41a-two-conditions-red",
        feature: "Color the nodes that meet two conditions at once",
        from: "T41 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await newLayer(u);
            await addCondition(u, "trained");
            await addCondition(u, "phone");
            await match(u, "phone", "Has no value");
            await u.click("Done");
            await fill(u, "red");
        },
        checks: {
            "exactly the 4 trained with no phone are red": (g) =>
                onlyTheseColored(g, (n) => yes(n.trained) && missing(n.phone), "#FF0000", 4),
        },
    },
    {
        id: "t41b-two-conditions-red",
        feature: "Color the nodes that meet two conditions at once",
        from: "T41 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await newLayer(u);
            await addCondition(u, "on_record");
            await addCondition(u, "email");
            await match(u, "email", "Has no value");
            await u.click("Done");
            await fill(u, "red");
        },
        checks: {
            "exactly the 4 on the record with no email are red": (g) =>
                onlyTheseColored(g, (n) => yes(n.on_record) && missing(n.email), "#FF0000", 4),
        },
    },
    {
        id: "t42a-number-at-or-over-orange",
        feature: "Color the nodes at or over a number",
        from: "T42 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await newLayer(u);
            await addCondition(u, "hours");
            await u.type("20");
            await u.key("Enter");
            await fill(u, "orange");
        },
        checks: {
            "exactly the 11 with 20 or more hours are orange": (g) =>
                onlyTheseColored(g, (n) => Number(n.hours) >= 20, "#FFA500", 11),
        },
    },
    {
        id: "t42b-number-at-or-over-orange",
        feature: "Color the nodes at or over a number",
        from: "T42 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await newLayer(u);
            await addCondition(u, "donations");
            await u.type("10000");
            await u.key("Enter");
            await fill(u, "orange");
        },
        checks: {
            "exactly the 9 with 10,000 or more in donations are orange": (g) =>
                onlyTheseColored(g, (n) => Number(n.donations) >= 10000, "#FFA500", 9),
        },
    },
    {
        id: "t43a-size-by-number",
        feature: "Size every node by a number column",
        from: "T43 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await everything(u);
            await byAttribute(u, "Node size by attribute", "hours");
        },
        checks: { "a volunteer with more hours is never drawn smaller": (g) => followsNumber(g, "node.size", "hours") },
    },
    {
        id: "t43b-size-by-number",
        feature: "Size every node by a number column",
        from: "T43 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await everything(u);
            await byAttribute(u, "Node size by attribute", "donations");
        },
        checks: {
            "a source with more donations is never drawn smaller": (g) => followsNumber(g, "node.size", "donations"),
        },
    },
    {
        id: "t44a-labels-from-names",
        feature: "Put every node's name on the drawing",
        from: "T44 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await everything(u);
            await u.click("Add to node text");
            await u.page.getByRole("menuitem", { name: "Label", exact: true }).click();
            await u.page.getByRole("option", { name: /^name(,|$)/ }).click();
        },
        checks: {
            "every node carries its name as a label": async (g) => {
                const [labels, nodes] = [await g.nodeLook("node.label"), await g.nodes()];
                for (const n of nodes) assert.equal(labels[n.id], n.name, `the label of ${n.id}`);
            },
        },
    },
    {
        id: "t44b-labels-from-names",
        feature: "Put every node's name on the drawing",
        from: "T44 B",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await everything(u);
            await u.click("Add to node text");
            await u.page.getByRole("menuitem", { name: "Label", exact: true }).click();
            await u.page.getByRole("option", { name: /^name(,|$)/ }).click();
        },
        checks: {
            "every node carries its name as a label": async (g) => {
                const [labels, nodes] = [await g.nodeLook("node.label"), await g.nodes()];
                for (const n of nodes) assert.equal(labels[n.id], n.name, `the label of ${n.id}`);
            },
        },
    },
    {
        id: "t49a-color-then-undo",
        feature: "Undo a color change",
        from: "T49 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await everythingColor(u, "red");
            await u.page.getByRole("button", { name: /^Undo changing node color/ }).waitFor();
            await u.key("Control+z");
        },
        checks: {
            "every node is back to the starting color": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.color")), new Set([STARTING_NODE_COLOR])),
            "Redo offers the color change back": async (g) =>
                assert.ok(await g.page.getByRole("button", { name: /^Redo changing node color/ }).isEnabled()),
        },
    },
    {
        id: "t49b-color-then-undo",
        feature: "Undo a color change",
        from: "T49 B",
        async walk(u) {
            await openSample(u, "Zachary's karate club");
            await everythingColor(u, "yellow");
            await u.page.getByRole("button", { name: /^Undo changing node color/ }).click();
        },
        checks: {
            "every node is back to the starting color": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.color")), new Set([STARTING_NODE_COLOR])),
        },
    },
    {
        id: "t50a-open-project-read-layer",
        feature: "Open a saved project and read what a layer picks out",
        from: "T50 A",
        async walk(u) {
            await u.upload(u.page.getByRole("button", { name: /^Open a file/ }), "lesmis-poster.graphty.json");
            await opened(u);
            await u.page.getByRole("treeitem", { name: /^Poster,/ }).click();
        },
        checks: {
            "the project opens on Les Miserables": sizeIs(77, 254),
            "exactly the 3 Mlle characters are orange": (g) =>
                onlyTheseColored(g, (n) => String(n.name).includes("Mlle"), "#FFA500", 3),
            "the Poster layer's inspector is open": async (g) =>
                assert.ok(await g.page.getByRole("heading", { name: "Poster", level: 2 }).isVisible()),
        },
    },
    {
        id: "t50b-open-project-read-layer",
        feature: "Open a saved project and read what a layer picks out",
        from: "T50 B",
        async walk(u) {
            await u.upload(u.page.getByRole("button", { name: /^Open a file/ }), "volunteers-thanks.graphty.json");
            await opened(u);
            await u.page.getByRole("treeitem", { name: /^Thank-you cards,/ }).click();
        },
        checks: {
            "the project opens on the volunteers": sizeIs(24, 63),
            "exactly the 6 trained with 30 or more hours are green": (g) =>
                onlyTheseColored(g, (n) => yes(n.trained) && Number(n.hours) >= 30, "#008000", 6),
        },
    },
    {
        id: "t51a-color-by-category",
        feature: "Give each value of a category its own color",
        from: "T51 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await everything(u);
            await byAttribute(u, "Node color by attribute", "role");
        },
        checks: { "each role has its own color": (g) => colorPerValue(g, "role", ["volunteer", "staff", "board"]) },
    },
    {
        id: "t51b-color-by-category",
        feature: "Give each value of a category its own color",
        from: "T51 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await everything(u);
            await byAttribute(u, "Node color by attribute", "kind");
        },
        checks: { "each kind has its own color": (g) => colorPerValue(g, "kind", ["person", "company", "agency"]) },
    },
    {
        id: "t45a-edge-category-thick-red",
        feature: "Style the ties of one kind apart from the people",
        from: "T45 A",
        async walk(u) {
            await openFile(u, "neighbors.csv");
            await newLayer(u);
            await edgeCondition(u, "kind");
            await u.page.getByRole("checkbox", { name: /^family/ }).click();
            await u.click("Done");
            await line(u, "Width", "24");
            await line(u, "Color", "red");
        },
        checks: {
            "neighbors.csv opens with 16 nodes and 30 edges": sizeIs(16, 30),
            "exactly the 8 family ties are thick and red": (g) =>
                onlyTheseEdges(g, (e) => e.kind === "family", { width: 24, color: "#FF0000" }, 8),
        },
    },
    {
        id: "t45b-edge-number-thick-blue",
        feature: "Style the ties at or over a number apart from the people",
        from: "T45 B",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await newLayer(u);
            await edgeCondition(u, "shared_chapters");
            await u.type("5");
            await u.key("Tab");
            await u.click("Done");
            await line(u, "Width", "24");
            await line(u, "Color", "blue");
        },
        checks: {
            "exactly the 51 ties with 5 or more shared chapters are thick and blue": (g) =>
                onlyTheseEdges(g, (e) => Number(e.shared_chapters) >= 5, { width: 24, color: "#0000FF" }, 51),
        },
    },
    {
        id: "t46a-community-one-cluster-red",
        feature: "Find communities, then color the one holding a named node",
        from: "T46 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await analyze(u, "Louvain");
            await u.page.getByRole("combobox", { name: "Find" }).click();
            await u.type("Javert");
            await u.key("Enter");
            await u.page.getByRole("button", { name: /^Louvain Group/ }).click();
            await u.page.getByRole("textbox", { name: /^Node color/ }).click();
            await u.type("red");
            await u.key("Enter");
        },
        checks: {
            "Javert's cluster of 11 is red, the other 5 keep their colors": (g) => oneClusterRed(g, "Javert", 11, 5),
        },
    },
    {
        id: "t46b-community-one-cluster-red",
        feature: "Find communities, then color the one holding a named node",
        from: "T46 B",
        async walk(u) {
            await openSample(u, "College football");
            await analyze(u, "Louvain");
            await u.page.getByRole("combobox", { name: "Find" }).click();
            await u.type("Nebraska");
            await u.key("Enter");
            await u.page.getByRole("button", { name: /^Louvain Group/ }).click();
            await u.page.getByRole("textbox", { name: /^Node color/ }).click();
            await u.type("red");
            await u.key("Enter");
        },
        checks: {
            "Nebraska's cluster of 12 is red, the other 9 keep their colors": (g) =>
                oneClusterRed(g, "Nebraska", 12, 9),
        },
    },
    {
        id: "t47a-every-cluster-box",
        feature: "Change the shape of every cluster at once, keeping their colors",
        from: "T47 A",
        async walk(u) {
            await openSample(u, "Les Miserables");
            await analyze(u, "Louvain");
            await u.page.getByRole("treeitem", { name: /^Louvain,/ }).click();
            await u.click("Add to node shape");
            await u.page.getByRole("menuitem", { name: "Shape", exact: true }).click();
            await u.page.getByRole("combobox", { name: /^Node shape/ }).click();
            await u.page.getByRole("option", { name: "Box", exact: true }).click();
        },
        checks: {
            "every node is a box": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.shape")), new Set(["box"])),
            "the 6 clusters keep 6 colors": async (g) => {
                const colors = await valuesOf(g.nodeLook("node.color"));
                assert.equal(colors.size, 6);
                assert.ok(!colors.has(STARTING_NODE_COLOR));
            },
        },
    },
    {
        id: "t48a-cluster-colors-on-some",
        feature: "Narrow a community run's colors to the nodes meeting a condition",
        from: "T48 A",
        async walk(u) {
            await openFile(u, "volunteers.graphml");
            await analyze(u, "Louvain");
            await u.page.getByRole("treeitem", { name: /^Louvain,/ }).click();
            await openWhich(u);
            await addCondition(u, "trained");
            await u.click("Done");
        },
        checks: {
            "only the 15 trained are in cluster colors": async (g) => {
                const [colors, nodes] = [await g.nodeLook("node.color"), await g.nodes()];
                const trained = nodes.filter((n) => yes(n.trained));
                assert.equal(trained.length, 15);
                assert.ok(
                    trained.every((n) => colors[n.id] !== STARTING_NODE_COLOR),
                    "every trained node is in a cluster color",
                );
                assert.ok(
                    nodes.filter((n) => !yes(n.trained)).every((n) => colors[n.id] === STARTING_NODE_COLOR),
                    "every untrained node keeps the starting color",
                );
            },
        },
    },
    {
        id: "t47b-every-cluster-box",
        feature: "Change the shape of every cluster at once, keeping their colors",
        from: "T47 B",
        async walk(u) {
            await openSample(u, "College football");
            await analyze(u, "Louvain");
            await u.page.getByRole("treeitem", { name: /^Louvain,/ }).click();
            await u.click("Add to node shape");
            await u.page.getByRole("menuitem", { name: "Shape", exact: true }).click();
            await u.page.getByRole("combobox", { name: /^Node shape/ }).click();
            await u.page.getByRole("option", { name: "Box", exact: true }).click();
        },
        checks: {
            "every node is a box": async (g) =>
                assert.deepEqual(await valuesOf(g.nodeLook("node.shape")), new Set(["box"])),
            "the 10 clusters keep 10 colors": async (g) => {
                const colors = await valuesOf(g.nodeLook("node.color"));
                assert.equal(colors.size, 10);
                assert.ok(!colors.has(STARTING_NODE_COLOR));
            },
        },
    },
    {
        id: "t48b-cluster-colors-on-some",
        feature: "Narrow a community run's colors to the nodes meeting a condition",
        from: "T48 B",
        async walk(u) {
            await openFile(u, "sources.graphml");
            await analyze(u, "Louvain");
            await u.page.getByRole("treeitem", { name: /^Louvain,/ }).click();
            await openWhich(u);
            await addCondition(u, "on_record");
            await u.click("Done");
        },
        checks: {
            "only the 12 on the record are in cluster colors": async (g) => {
                const [colors, nodes] = [await g.nodeLook("node.color"), await g.nodes()];
                const onRecord = nodes.filter((n) => yes(n.on_record));
                assert.equal(onRecord.length, 12);
                assert.ok(
                    onRecord.every((n) => colors[n.id] !== STARTING_NODE_COLOR),
                    "every source on the record is in a cluster color",
                );
                assert.ok(
                    nodes.filter((n) => !yes(n.on_record)).every((n) => colors[n.id] === STARTING_NODE_COLOR),
                    "every source off the record keeps the starting color",
                );
            },
        },
    },
];
