/**
 * @file A third party's colour palette, and whether the element paints with it the way it paints
 * with its own.
 *
 * WHAT A PALETTE IS, for a reader who has never opened this package. graphty-element colours a
 * graph by putting a style layer on a stack and telling that layer to read a value out of the
 * data -- a degree, a score, a team name -- and turn it into a colour. Which colours it may reach
 * for is a palette: a named, ordered list of colour anchors. Eighteen ship with the element
 * (viridis, okabe-ito, purple-green and the rest), and until this extension point existed those
 * built-ins were the whole world. There was no registration call of any kind, and a layer naming
 * anything else was refused.
 *
 * WHY THAT MATTERS TO SOMEONE OUTSIDE. A company that has a brand does not have viridis. If the
 * only palettes an element can paint with are the ones it shipped with, every graph drawn in that
 * company's product is off-brand, and the only escape is to stop using the styling system and
 * paint meshes by hand -- which loses the legend, the saved document and the layer stack all at
 * once.
 *
 * A PALETTE IS THE ONE EXTENSION POINT WITH NO CODE IN IT. Nothing in the element ever asks a
 * palette for behaviour. The categorical index path, the continuous interpolation, the step
 * table, the over-subscription refusal, the legend and the reversal flag are all implemented by
 * code that reads six fields off a plain object. So the unit that gets registered is that plain
 * object, and `registerPalette` is a free function rather than a class registration.
 *
 * WHAT THIS FILE PROVES. That two palettes nobody here has heard of get everything the element's
 * own eighteen get: a place in the catalogue a picker reads, resolution by the same lookup that
 * finds a built-in, a value ramped onto a colour by the continuous path and by the categorical
 * one, a capacity that refuses over-subscription rather than wrapping two groups onto one colour,
 * reversal, a missing-value policy, a legend block, and a round trip through a saved document.
 * Every assertion reads what the element RESOLVED for a node or what the session REPORTED, never
 * a private field: `styles.explain({ node })` is the element saying, in its own words, what that
 * node is painted and which layer painted it.
 *
 * THE TWO DUMMIES. `acme-heat` is a five-anchor sequential ramp, written the way a brand palette
 * arrives -- mostly hex, with one anchor in `oklch()` because that is what a design system
 * exports. `acme-teams` is a four-colour categorical palette with one anchor written as a CSS
 * colour name, claiming safety for deuteranopia and making no claim about the other two. Neither
 * duplicates a built-in. Both are deliberately arithmetic a reader can check by eye: with five
 * anchors, a value a quarter of the way along the ramp lands exactly on the second anchor, so
 * every colour asserted below is an anchor written at the top of this file rather than a mixture
 * nobody can verify.
 *
 * EVERY IMPORT BELOW IS ONE A CUSTOMER COULD WRITE. The relative paths are this repository
 * reaching its own published entry points: `../../../extend` is
 * `@graphty/graphty-element/extend`, `../../../catalog` is `@graphty/graphty-element/catalog`,
 * `../../../session` is `@graphty/graphty-element/session` and `../../../index.js` is
 * `@graphty/graphty-element`. Nothing here reaches into `src/`.
 */

import { afterAll, afterEach, assert, beforeEach, describe, it } from "vitest";

import { type Binding, type LayerId, PALETTE_DESCRIPTORS, paletteDescriptor, palettesOfKind } from "../../../catalog";
import { clearRegisteredPalettesForTesting, isGraphtyError, type PaletteDescriptor, registerPalette } from "../../../extend";
import { Graph } from "../../../index.js";
import type { GraphSession, LayerSpec, StyleDocument } from "../../../session";

// -------------------------------------------------------------------------------------------
// The extension: two palettes the element has never heard of
// -------------------------------------------------------------------------------------------

/**
 * The five anchors of the sequential ramp, as the brand's design system exports them.
 *
 * The middle one is `oklch()` on purpose. The element's colour parser reads it, but the
 * interpolation that builds a ramp reads six hex digits and answers magenta for anything else --
 * so an anchor stored as written would give this palette correct endpoints and a magenta middle,
 * with no error attached to it. What registration does about that is asserted below.
 */
const HEAT_ANCHORS = ["#0B1D51", "#1B7F79", "oklch(0.7 0.15 30)", "#F2A65A", "#F7F056"] as const;

/** The same five anchors as every reader of a palette actually sees them. */
const HEAT_HEXES = ["#0B1D51", "#1B7F79", "#ED7665", "#F2A65A", "#F7F056"] as const;

/** The four anchors of the categorical palette, one of them written as a CSS colour name. */
const TEAM_ANCHORS = ["#1B6CA8", "#E07A1F", "rebeccapurple", "#3F8F5B"] as const;

/** The same four anchors as every reader of a palette actually sees them. */
const TEAM_HEXES = ["#1B6CA8", "#E07A1F", "#663399", "#3F8F5B"] as const;

/** The sequential palette, exactly as a third party would declare it. */
const ACME_HEAT: PaletteDescriptor = {
    id: "acme-heat",
    plainName: "Acme Deep Sea to Sunrise",
    kind: "sequential",
    colors: [...HEAT_ANCHORS],
    capacity: null,
    colorblindSafe: ["deuteranopia", "tritanopia"],
};

/**
 * The categorical palette, claiming safety for one form of colour blindness and none of the
 * others.
 *
 * An empty or partial claim means "makes no claim about the rest", not "known to fail", which is
 * the same thing the element's own descriptors mean by it.
 */
const ACME_TEAMS: PaletteDescriptor = {
    id: "acme-teams",
    plainName: "Acme Four Teams",
    kind: "categorical",
    colors: [...TEAM_ANCHORS],
    capacity: TEAM_ANCHORS.length,
    colorblindSafe: ["deuteranopia"],
};

/**
 * File both palettes.
 *
 * Called at module scope, the way a plugin package registers itself on import, and again by the
 * one test that has to see the catalogue with nothing registered in it. Registering the identical
 * palette twice is a no-op, so calling this twice is safe.
 */
function registerAcmePalettes(): void {
    registerPalette(ACME_HEAT);
    registerPalette(ACME_TEAMS);
}

registerAcmePalettes();

// -------------------------------------------------------------------------------------------
// The graph the palettes are asked to paint
// -------------------------------------------------------------------------------------------

/**
 * Eleven nodes, in four teams of four different sizes.
 *
 * THE SIZES DIFFER ON PURPOSE. The element numbers categories largest group first, so unequal
 * group sizes are what make "alpha gets the first anchor" a fact rather than a coincidence of
 * insertion order. `heat` runs 0, 25, 50, 75, 100 because a five-anchor ramp lands exactly on its
 * anchors at those five values. `squad` cuts the same nodes five ways instead of four, which is
 * one more group than the four-colour palette has colours.
 *
 * `ghost` carries a team and a squad and no heat at all: it is the element the ramp has nothing
 * to say about, which is what the missing-value policy is about.
 */
const NODES = [
    { id: "a1", team: "alpha", squad: "one", heat: 0 },
    { id: "a2", team: "alpha", squad: "one", heat: 25 },
    { id: "a3", team: "alpha", squad: "one", heat: 50 },
    { id: "a4", team: "alpha", squad: "one", heat: 75 },
    { id: "b1", team: "bravo", squad: "two", heat: 100 },
    { id: "b2", team: "bravo", squad: "two", heat: 50 },
    { id: "b3", team: "bravo", squad: "two", heat: 0 },
    { id: "c1", team: "charlie", squad: "three", heat: 100 },
    { id: "c2", team: "charlie", squad: "four", heat: 50 },
    { id: "d1", team: "delta", squad: "five", heat: 25 },
    { id: "ghost", team: "alpha", squad: "one" },
];

/** A path through the graph, so nothing under test is measuring an unconnected dust cloud. */
const EDGES = [
    { src: "a1", dst: "a2" },
    { src: "a2", dst: "a3" },
    { src: "a3", dst: "a4" },
    { src: "a4", dst: "b1" },
    { src: "b1", dst: "b2" },
    { src: "b2", dst: "b3" },
    { src: "b3", dst: "c1" },
    { src: "c1", dst: "c2" },
    { src: "c2", dst: "d1" },
    { src: "d1", dst: "ghost" },
];

/** The teams in the order the element numbers them: largest group first. */
const TEAMS_BY_SIZE = ["alpha", "bravo", "charlie", "delta"] as const;

/** The heat values that land exactly on the five anchors of a five-anchor ramp. */
const HEAT_AT_ANCHOR = [0, 25, 50, 75, 100] as const;

/** One node carrying each of those five values, in the same order. */
const NODE_AT_ANCHOR = ["a1", "a2", "a3", "a4", "b1"] as const;

/** What the element paints a node whose value the ramp cannot read, when nothing else says. */
const MAGENTA = "#FF00FF";

// -------------------------------------------------------------------------------------------
// Layers a consumer would write
// -------------------------------------------------------------------------------------------

/** A binding that reads a value out of the data, as opposed to one that writes a fixed value. */
type RuleBinding = Extract<Binding, { by: string }>;

/**
 * A layer that ramps `heat` through the sequential palette.
 * @param extra - anything the binding should carry beyond the palette and the domain
 * @returns the specification
 */
function heatLayer(extra: Partial<RuleBinding> = {}): LayerSpec {
    const binding: RuleBinding = {
        by: "data.heat",
        scale: "linear",
        domain: [0, 100],
        palette: "acme-heat",
        ...extra,
    };

    return { name: "Heat", target: "node", selector: { match: "everything" }, encode: { "node.color": binding } };
}

/**
 * A layer that names each group with one anchor of the categorical palette.
 * @param path - the attribute to read, which decides how many groups there are
 * @param name - what to call the layer, so two of them can be told apart in one stack
 * @returns the specification
 */
function teamLayer(path: string, name = "Teams"): LayerSpec {
    return {
        name,
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: path, scale: "ordinal", palette: "acme-teams" } },
    };
}

// -------------------------------------------------------------------------------------------
// Reading what the element did
// -------------------------------------------------------------------------------------------

let container: HTMLDivElement;
let graph: Graph;
let session: GraphSession;

/**
 * Stand a real element up with the graph above loaded into it.
 */
async function openGraph(): Promise<void> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    graph = new Graph(container);
    await graph.init();
    session = graph.getSession();

    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.operationQueue.waitForCompletion();
}

/**
 * Take the element down and drain what it still has queued.
 *
 * Drained before the graph is thrown away: a style edit is a queued run and the element schedules
 * a repaint behind every finished run, so disposing with one still in flight runs that repaint
 * against a store the dispose has already emptied.
 */
async function closeGraph(): Promise<void> {
    await graph.operationQueue.waitForCompletion();
    graph.dispose();
    container.remove();
}

/**
 * The colour the element says one node is painted, in the one spelling every anchor is stored in.
 * @param id - the node id
 * @returns six upper-case hex digits behind a hash, or null when nothing painted a colour
 */
function paintedColor(id: string): string | null {
    const painted = session.styles.explain({ node: id }).merged["node.color"];

    // Alpha is a channel of its own; an anchor is a hue, so the comparison is of hues.
    return painted === undefined ? null : painted.hex.slice(0, 7).toUpperCase();
}

/**
 * Which layers painted anything onto one node, bottom first.
 *
 * This is how "the layer was refused" is read without reaching inside the repaint: a layer the
 * element could not prepare paints nothing, so it is simply not among the contributors.
 * @param id - the node id
 * @returns the layer ids
 */
function paintersOf(id: string): readonly LayerId[] {
    return session.styles.explain({ node: id }).contributions.map((contribution) => contribution.layerId);
}

/**
 * Add a layer and wait until the element has finished repainting behind it.
 * @param spec - the layer
 * @returns the layer's id
 */
async function addLayer(spec: LayerSpec): Promise<LayerId> {
    const layer = await session.styles.add(spec);
    await graph.operationQueue.waitForCompletion();

    return layer.id;
}

/**
 * The code a style verb refused with.
 * @param call - the call
 * @returns the code, or null when it did not refuse
 */
async function codeOf(call: () => PromiseLike<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * What a registration refused with, and which field it blamed.
 * @param call - the registration
 * @returns the code and the field, or null when it did not refuse
 */
function refusalOf(call: () => void): { code: string; field: unknown } | null {
    try {
        call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            return { code: "not-a-graphty-error", field: null };
        }

        return { code: error.code, field: error.details.field };
    }

    return null;
}

afterAll(() => {
    // The registries are global and there is no unregister, so a suite that registers something
    // owes the next suite the registry it found.
    clearRegisteredPalettesForTesting();
});

// -------------------------------------------------------------------------------------------
// The catalogue
// -------------------------------------------------------------------------------------------

describe("a third party's palette, in the catalogue a picker reads", () => {
    beforeEach(openGraph);
    afterEach(closeGraph);

    it("is offered by the session beside the element's own, with the description it registered", () => {
        const offered = session.catalog.palettes();
        const heat = offered.find((descriptor) => descriptor.id === "acme-heat");
        const teams = offered.find((descriptor) => descriptor.id === "acme-teams");

        assert.isDefined(heat, "a picker reading the session's catalogue can offer acme-heat");
        assert.isDefined(teams, "and acme-teams");
        assert.strictEqual(heat.plainName, "Acme Deep Sea to Sunrise", "the plain name a person reads");
        assert.strictEqual(teams.kind, "categorical");
        assert.strictEqual(teams.capacity, TEAM_ANCHORS.length, "how many groups it can name");
        assert.deepStrictEqual(
            offered.slice(0, PALETTE_DESCRIPTORS.length),
            [...PALETTE_DESCRIPTORS],
            "the element's own eighteen come first and are unchanged",
        );
    });

    it("carries its own colour-blindness claim, and the element takes it on trust", () => {
        const teams = session.catalog.palettes().find((descriptor) => descriptor.id === "acme-teams");

        assert.isDefined(teams);
        assert.deepStrictEqual(
            [...teams.colorblindSafe],
            ["deuteranopia"],
            "one form claimed, the other two not claimed rather than denied",
        );
    });

    it("leaves a page that registered nothing looking at exactly the table the element ships", () => {
        clearRegisteredPalettesForTesting();

        assert.strictEqual(
            session.catalog.palettes(),
            PALETTE_DESCRIPTORS,
            "the built-in array itself, so two sessions that agree compare equal",
        );

        registerAcmePalettes();

        const composed = session.catalog.palettes();

        assert.notStrictEqual(composed, PALETTE_DESCRIPTORS, "and a different array once something registered");
        assert.strictEqual(composed, session.catalog.palettes(), "the same one until the registration changes");
        assert.strictEqual(composed.length, PALETTE_DESCRIPTORS.length + 2);
    });

    it("is found by the same lookup that finds a palette the element ships", () => {
        assert.strictEqual(paletteDescriptor("acme-heat")?.plainName, "Acme Deep Sea to Sunrise");
        assert.strictEqual(paletteDescriptor("viridis")?.plainName, "Purple to Yellow", "and the built-ins still are");
        assert.isUndefined(paletteDescriptor("acme-nothing"), "and a name nobody registered is still nothing");
    });

    it("is offered to a picker that has already decided what kind of encoding it is making", () => {
        const sequential = palettesOfKind("sequential").map((descriptor) => String(descriptor.id));
        const categorical = palettesOfKind("categorical").map((descriptor) => String(descriptor.id));

        assert.include(sequential, "acme-heat");
        assert.notInclude(sequential, "acme-teams", "a categorical palette is not offered for a ramp");
        assert.include(categorical, "acme-teams");
        assert.strictEqual(sequential.at(-1), "acme-heat", "the element's own come first, the plugin's after");
        assert.include(sequential, "viridis", "and the built-ins are still all there");
    });

    it("is stored in the one colour spelling every reader of an anchor understands", () => {
        const heat = paletteDescriptor("acme-heat");
        const teams = paletteDescriptor("acme-teams");

        assert.deepStrictEqual(heat?.colors.map((color) => color.toUpperCase()), [...HEAT_HEXES]);
        assert.deepStrictEqual(
            teams?.colors.map((color) => color.toUpperCase()),
            [...TEAM_HEXES],
            "a CSS colour name registered as one is read back as six hex digits",
        );
    });
});

// -------------------------------------------------------------------------------------------
// Painting
// -------------------------------------------------------------------------------------------

describe("a third party's palette, painting a real graph", () => {
    beforeEach(openGraph);
    afterEach(closeGraph);

    it("ramps a measurement onto its anchors, in the order they were registered", async () => {
        await addLayer(heatLayer());

        for (const [index, id] of NODE_AT_ANCHOR.entries()) {
            assert.strictEqual(
                paintedColor(id),
                HEAT_HEXES[index],
                `node ${id}, whose heat is ${String(HEAT_AT_ANCHOR[index])}, is painted anchor ${String(index)}`,
            );
        }
    });

    it("puts its oklch anchor in the middle of the ramp rather than the magenta of a colour nothing could read", async () => {
        await addLayer(heatLayer());

        // a3's heat is 50, which on a five-anchor ramp is the third anchor exactly -- the one
        // written in oklch. Magenta here would be the interpolation path reporting "this anchor
        // is not six hex digits" in the only way it can: silently, as a colour.
        assert.strictEqual(paintedColor("a3"), "#ED7665");
        assert.notStrictEqual(paintedColor("a3"), MAGENTA, "the anchor was normalised, not passed through");
    });

    it("passes the check a form runs before it lets anybody press Apply", () => {
        const mine = session.styles.validate(heatLayer());
        const builtIn = session.styles.validate(heatLayer({ palette: "viridis" }));

        // `validate()` is the synchronous door: a settings panel calls it on every keystroke, and
        // a layer it reports an error on is a layer the panel refuses to let anybody add. A check
        // that knew the element's own seventeen names and nothing else would stop a reader
        // applying their own palette without ever reaching the code that paints it.
        assert.isTrue(mine.ok, "a layer naming the registered palette is addable as it stands");
        assert.deepStrictEqual([...mine.errors], [], "with nothing wrong with it");
        assert.deepStrictEqual([...builtIn.errors], [...mine.errors], "the verdict a built-in palette gets");
    });

    it("is the palette an analysis layer paints with when a consumer encodes a run by naming it", async () => {
        // `encode()` is the route an algorithm result takes to the screen -- the consumer hands
        // over a run and a channel, and the element writes the path, the selector and the layer.
        // It is also the only route that has a palette of its own to fall back on, so a palette
        // it could not resolve would not fail: it would quietly paint viridis.
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        const layer = await session.styles.encode({ run: run.id, channel: "node.color", palette: "acme-heat" });
        await graph.operationQueue.waitForCompletion();

        const bound = layer.encode?.["node.color"];

        assert.isDefined(bound, "the layer the element wrote encodes the channel that was asked for");
        assert.strictEqual(
            "by" in bound ? bound.palette : undefined,
            "acme-heat",
            "the key the consumer typed is the key the layer records, so a saved document keeps it",
        );

        // Every node in this graph has one edge or two, and an encoding reads the extent the run
        // measured -- so degree 1 is the bottom of the ramp and degree 2 is the top.
        assert.strictEqual(paintedColor("a1"), HEAT_HEXES[0], "the node with one edge takes the first anchor");
        assert.strictEqual(paintedColor("a2"), HEAT_HEXES.at(-1), "and the node with two takes the last");
        assert.notStrictEqual(paintedColor("a1"), paintedColor("a2"), "through the plugin's ramp, not one colour");
    });

    it("mixes a colour between two anchors for a value that sits between them", async () => {
        // A domain twice as wide puts heat 25 an eighth of the way along the ramp, which is
        // halfway between the first anchor and the second rather than on either of them.
        await addLayer(heatLayer({ domain: [0, 200] }));

        assert.strictEqual(
            paintedColor("a2"),
            "#134E65",
            "each channel is halfway from #0B1D51 to #1B7F79, which is what interpolating two anchors means",
        );
        assert.notInclude([...HEAT_HEXES], paintedColor("a2"), "and it is not simply the nearer anchor");
    });

    it("names each group with one anchor when it says it is categorical, and never interpolates", async () => {
        await addLayer(teamLayer("data.team"));

        const painted = TEAMS_BY_SIZE.map((team) => {
            const node = NODES.find((entry) => entry.team === team);

            assert.isDefined(node, `the graph holds a ${team} node`);

            return paintedColor(node.id);
        });

        assert.deepStrictEqual(painted, [...TEAM_HEXES], "one anchor per group, largest group first");
        assert.strictEqual(new Set(painted).size, TEAM_HEXES.length, "four groups, four different colours");
    });

    it("sends the smallest value to the far end of the ramp when the binding reverses it", async () => {
        await addLayer(heatLayer({ reverse: true }));

        assert.strictEqual(paintedColor("a1"), HEAT_HEXES.at(-1), "heat 0 lands on the last anchor");
        assert.strictEqual(paintedColor("b1"), HEAT_HEXES[0], "and heat 100 on the first");
    });

    it("leaves an element it has nothing to say about painted whatever the layers below it painted", async () => {
        const before = paintedColor("ghost");

        assert.isNotNull(before, "the element's own base layer paints every node a colour");

        const layerId = await addLayer(heatLayer());

        assert.strictEqual(paintedColor("ghost"), before, "the node with no heat keeps the colour it had");
        assert.notInclude(paintersOf("ghost"), layerId, "the ramp did not paint it at all");
        assert.strictEqual(paintedColor("a1"), HEAT_HEXES[0], "while the nodes it could measure were painted");
    });

    it("paints a missing value a named colour when the reader asks for one by name", async () => {
        await addLayer(heatLayer({ missing: { value: "#CCCCCC" } }));

        assert.strictEqual(paintedColor("ghost"), "#CCCCCC");
    });

    it("never wraps a fifth group round onto its first colour", async () => {
        const four = await addLayer(teamLayer("data.team", "Four groups"));

        assert.include(paintersOf("a1"), four, "four groups fit in four colours and the layer paints");

        const before = paintedColor("a1");
        const five = await addLayer(teamLayer("data.squad", "Five groups"));

        assert.notInclude(
            paintersOf("a1"),
            five,
            "five groups do not fit in four colours, so the layer paints nothing at all",
        );
        assert.strictEqual(paintedColor("a1"), before, "and the layer beneath it is left exactly as it was");
    });

    it("is refused before anything is painted when a layer names a palette nobody registered", async () => {
        const painted = paintedColor("a1");

        const refusal = await codeOf(() =>
            session.styles.add({
                name: "Nobody's palette",
                target: "node",
                selector: { match: "everything" },
                encode: {
                    "node.color": { by: "data.heat", scale: "linear", domain: [0, 100], palette: "acme-nothing" },
                },
            }),
        );

        // AT THE EDIT, NOT AT THE REPAINT. The name used to be written onto the layer unchecked
        // and the layer then painted nothing one frame later, which is a failure arriving
        // somewhere a settings form is not listening. `E_UNKNOWN_PALETTE` is the same family a
        // consumer already switches on for an unknown algorithm, layout or format.
        assert.strictEqual(refusal, "E_UNKNOWN_PALETTE");

        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(paintedColor("a1"), painted, "no colour was invented for a palette that does not exist");
        assert.strictEqual(paintersOf("a1").length, 1, "only the element's own base layer painted");
    });
});

// -------------------------------------------------------------------------------------------
// The legend
// -------------------------------------------------------------------------------------------

describe("a third party's palette, in the legend a reader is shown", () => {
    beforeEach(openGraph);
    afterEach(closeGraph);

    it("tells the legend it names groups, names itself, and hands over one swatch per group", async () => {
        await addLayer(teamLayer("data.team"));

        const [block] = session.styles.legend();

        assert.isDefined(block, "a layer that encodes a channel has a legend block");
        assert.strictEqual(block.kind, "categorical", "the block's shape comes from the palette's own kind");
        assert.strictEqual(block.palette?.name, "acme-teams");
        assert.deepStrictEqual(
            block.swatches.map((swatch) => swatch.label),
            [...TEAMS_BY_SIZE],
        );
        assert.deepStrictEqual(
            block.swatches.map((swatch) => swatch.color?.toUpperCase()),
            [...TEAM_HEXES],
            "each swatch is painted by asking the ramp, so a legend cannot drift from the picture",
        );
    });

    it("tells the legend it is a ramp, and says when the binding turned it round", async () => {
        await addLayer(heatLayer({ reverse: true }));

        const [block] = session.styles.legend();

        assert.isDefined(block);
        assert.strictEqual(block.kind, "sequential");
        assert.deepStrictEqual(block.palette, { name: "acme-heat", reversed: true });
        assert.strictEqual(block.swatches.at(0)?.color?.toUpperCase(), HEAT_HEXES.at(-1), "the reversed low end");
        assert.strictEqual(block.swatches.at(-1)?.color?.toUpperCase(), HEAT_HEXES[0], "and the reversed high end");
    });
});

// -------------------------------------------------------------------------------------------
// Saved documents
// -------------------------------------------------------------------------------------------

describe("a third party's palette, in a document somebody saved", () => {
    beforeEach(openGraph);
    afterEach(closeGraph);

    it("paints the same colours again when the document that named it is reopened", async () => {
        const layerId = await addLayer(heatLayer());
        const before = paintedColor("b1");
        const document = session.styles.toDocument();

        await session.styles.remove(layerId);
        await graph.operationQueue.waitForCompletion();

        assert.notStrictEqual(paintedColor("b1"), before, "the layer really was taken away");

        const report = await session.styles.applyTemplate(document);
        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(report.applied.length, 1);
        assert.strictEqual(paintedColor("b1"), before, "and the reopened document paints exactly what it saved");
    });

    it("is accepted inside a document that carries its description, once it is registered here", async () => {
        const carried = paletteDescriptor("acme-heat");

        assert.isDefined(carried, "the descriptor a saved look would travel with");

        const document: StyleDocument = {
            version: 1,
            layers: [heatLayer()],
            palettes: [carried],
        };

        const report = await session.styles.applyTemplate(document);
        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(report.applied.length, 1, "a document describing a palette this element has is readable");
        assert.strictEqual(paintedColor("b1"), HEAT_HEXES.at(-1));
    });

    it("is refused, rather than half-applied, when the document describes a palette nobody registered", async () => {
        const document: StyleDocument = {
            version: 1,
            layers: [heatLayer()],
            palettes: [{ ...ACME_HEAT, id: "acme-nothing" }],
        };

        const code = await codeOf(() => session.styles.applyTemplate(document));

        assert.isNotNull(code, "the document was refused");
        assert.notStrictEqual(
            code,
            "not-a-graphty-error",
            "with a code a consumer can switch on rather than a message it has to read",
        );
        assert.strictEqual(session.styles.list().length, 2, "and the stack is exactly the element's own two layers");
    });
});

// -------------------------------------------------------------------------------------------
// What registration refuses, and where the author finds out
// -------------------------------------------------------------------------------------------

describe("a third party's palette, at the moment it is registered", () => {
    it("is refused with the anchor named when one of its colours is not a colour", () => {
        const refusal = refusalOf(() => {
            registerPalette({ ...ACME_HEAT, id: "acme-typo", colors: ["#0B1D51", "grayish", "#F7F056"] });
        });

        assert.deepStrictEqual(refusal, { code: "E_BAD_COMMAND", field: "colors" });
        assert.isUndefined(paletteDescriptor("acme-typo"), "and nothing was filed");
    });

    it("is refused when the capacity it declares contradicts the kind it declares", () => {
        const refusal = refusalOf(() => {
            registerPalette({ ...ACME_HEAT, id: "acme-muddle", capacity: 8 });
        });

        assert.deepStrictEqual(
            refusal,
            { code: "E_BAD_COMMAND", field: "capacity" },
            "a ramp has no fixed number of values in it, and the element will not guess which half the author meant",
        );
    });

    it("is refused when it was registered without a name a person could read", () => {
        const refusal = refusalOf(() => {
            registerPalette({ ...ACME_HEAT, id: "acme-nameless", plainName: "" });
        });

        assert.deepStrictEqual(refusal, { code: "E_BAD_COMMAND", field: "plainName" });
    });

    it("cannot take the name of a palette the element ships", () => {
        const refusal = refusalOf(() => {
            registerPalette({ ...ACME_HEAT, id: "viridis" });
        });

        assert.strictEqual(
            refusal?.code,
            "E_DUPLICATE_PLUGIN",
            "a document that painted with viridis yesterday has to paint with viridis today",
        );
        assert.strictEqual(paletteDescriptor("viridis")?.plainName, "Purple to Yellow", "and viridis is untouched");
    });

    it("is one palette, not two, when the module that registered it is evaluated twice", () => {
        registerAcmePalettes();
        registerAcmePalettes();

        const offered = palettesOfKind("sequential").filter((descriptor) => descriptor.id === "acme-heat");

        assert.strictEqual(offered.length, 1, "a picker offers it once, however many times the module was evaluated");
        assert.strictEqual(
            PALETTE_DESCRIPTORS.filter((descriptor) => descriptor.id === "acme-heat").length,
            0,
            "and a plugin never lands in the table of what the element itself ships",
        );
    });

    it("replaces the palette a hot reload registered before it, unless the caller asked to be told", () => {
        const first: PaletteDescriptor = { ...ACME_TEAMS, id: "acme-scratch" };
        const second: PaletteDescriptor = { ...first, colors: ["#111111", "#222222", "#333333", "#444444"] };

        registerPalette(first);
        registerPalette(second);

        assert.strictEqual(
            paletteDescriptor("acme-scratch")?.colors[0]?.toUpperCase(),
            "#111111",
            "the second registration won",
        );

        const refusal = refusalOf(() => {
            registerPalette({ ...first, colors: ["#555555", "#666666", "#777777", "#888888"] }, { strict: true });
        });

        assert.strictEqual(refusal?.code, "E_DUPLICATE_PLUGIN", "a build that wants the collision to be loud gets it");
    });
});
