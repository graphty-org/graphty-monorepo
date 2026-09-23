/**
 * @file An arrow's own size, colour and opacity, from the layer that asks for them to the parsed
 * style the renderer builds the cap from.
 *
 * WHY THIS FILE EXISTS. `EdgeStyle.arrowHead` has carried `size`, `color` and `opacity` since
 * 1.x, `EdgeMesh.createArrowHead` reads all three, and for the whole of the 2.0 branch no public
 * route wrote any of them: the channel table published `edge.arrowHead` -- the cap's TYPE -- and
 * nothing else. The renderer drew an arrow at any size in any colour and nothing could ask it to.
 * Three Storybook stories that demonstrated exactly that were deleted rather than migrated.
 *
 * The second half of the file is the colour pin, which is a wrong picture rather than a missing
 * one. `defaultEdgeStyle.arrowHead` named `darkgrey` and `ArrowStyle.color` defaulted to white,
 * so `EdgeStyle.parse` filled a colour into every painted head while an `arrowTail` -- optional,
 * and absent from the defaults -- got none and fell back to its line. One edge, two ends, two
 * colours, and `docs/guide/styling.md` saying an arrow follows the line it caps.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Path } from "../../../src/catalog/types";
import { defaultEdgeStyle, EdgeStyle } from "../../../src/config";
import { StylePainter } from "../../../src/managers/StylePainter";
import { CHANNEL_DESCRIPTORS, COLOR_CHANNELS, isChannel } from "../../../src/session/styles/channels";
import { createStylesApi, type RepaintContext, type SessionStylesApi } from "../../../src/session/styles/index";
import { channelRole } from "../../../src/session/styles/intern";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector or a binding names. */
type Row = Readonly<Record<Path, unknown>>;

/** Two nodes and the one edge between them: the smallest graph with an arrow in it. */
const NODES: readonly Row[] = [{ "data.id": "A" }, { "data.id": "B" }];

/** Three edges carrying a weight, so an arrow size has something to ramp over. */
const EDGES: readonly Row[] = [{ "data.weight": 1 }, { "data.weight": 2 }, { "data.weight": 3 }];

/** What a test drives: the stack, the engine behind it, and the painter over both. */
interface Harness {
    /** The stack to edit. */
    readonly styles: SessionStylesApi;
    /** The engine the painter reads. */
    readonly engine: RepaintEngine;
    /** The painter under test. */
    readonly painter: StylePainter;
    /** Paint every element from the whole stack, as a first draw does. */
    paintAll(): Promise<void>;
}

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/**
 * Build a stack, an engine and a painter over two nodes and three edges.
 * @returns The harness.
 */
function harness(): Harness {
    const elements: SelectorSource = {
        nodeValue: (index, path) => NODES[index]?.[path],
        edgeValue: (index, path) => EDGES[index]?.[path],
    };
    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => EDGES.length,
        elements,
        measured: () => undefined,
    });
    const styles = createStylesApi({ elements, base: [], repaint: engine.repaint });
    const painter = new StylePainter();
    painter.bind(engine);

    return {
        styles,
        engine,
        painter,
        paintAll: async (): Promise<void> => {
            await engine.repaintAll(styles.compiled(), quietContext());
            painter.markPainted();
        },
    };
}

/**
 * Paint every edge with one layer and read the style the first one is drawn from.
 * @param set - The channels the layer writes.
 * @returns The parsed edge style, and the key its source mesh is interned under.
 */
async function edgePaintedWith(set: LayerSpec["set"]): Promise<{ style: ReturnType<typeof EdgeStyle.parse>; meshKey: string }> {
    const held = harness();

    await held.styles.add({ name: "arrows", target: "edge", selector: { match: "everything" }, set });
    await held.paintAll();

    const paint = held.painter.edgePaint(0);

    assert.isNotNull(paint, "the painter drew nothing for the edge at index 0");

    return { style: paint.style, meshKey: paint.meshKey };
}

describe("the six arrow channels", () => {
    it("publishes a size, a colour and an opacity for each end", () => {
        for (const channel of [
            "edge.arrowHeadSize",
            "edge.arrowHeadColor",
            "edge.arrowHeadOpacity",
            "edge.arrowTailSize",
            "edge.arrowTailColor",
            "edge.arrowTailOpacity",
        ]) {
            assert.isTrue(isChannel(channel), `${channel} is not a channel, so no layer can write it`);
        }
    });

    it("lands each one on the field of the parsed style the renderer reads", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadSize"].stylePath, "arrowHead.size");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadColor"].stylePath, "arrowHead.color");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadOpacity"].stylePath, "arrowHead.opacity");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailSize"].stylePath, "arrowTail.size");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailColor"].stylePath, "arrowTail.color");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailOpacity"].stylePath, "arrowTail.opacity");
    });

    it("bounds them the way the schema bounds them, so a control cannot offer what the schema rejects", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadSize"].min, 0);
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.arrowHeadSize"].max);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadOpacity"].min, 0);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadOpacity"].max, 1);
    });

    it("counts the two arrow colours among the colour channels", () => {
        assert.include([...COLOR_CHANNELS], "edge.arrowHeadColor");
        assert.include([...COLOR_CHANNELS], "edge.arrowTailColor");
    });

    it("keys a source mesh on all six, because an arrow is geometry and its own material", () => {
        for (const channel of [
            "edge.arrowHeadSize",
            "edge.arrowHeadColor",
            "edge.arrowHeadOpacity",
            "edge.arrowTailSize",
            "edge.arrowTailColor",
            "edge.arrowTailOpacity",
        ] as const) {
            assert.strictEqual(channelRole(channel), "mesh", channel);
        }
    });
});

describe("what a layer that writes them paints", () => {
    it("writes the head's size, colour and opacity into the style the cap is built from", async () => {
        const { style } = await edgePaintedWith({
            "edge.arrowHead": "normal",
            "edge.arrowHeadSize": 2,
            "edge.arrowHeadColor": "#ff0000",
            "edge.arrowHeadOpacity": 0.5,
        });

        assert.strictEqual(style.arrowHead?.size, 2);
        assert.strictEqual(style.arrowHead?.color, "#ff0000");
        assert.strictEqual(style.arrowHead?.opacity, 0.5);
    });

    it("writes the tail's three without touching the head's", async () => {
        const { style } = await edgePaintedWith({
            "edge.arrowHead": "normal",
            "edge.arrowTail": "tee",
            "edge.arrowTailSize": 3,
            "edge.arrowTailColor": "#00ff00",
            "edge.arrowTailOpacity": 0.25,
        });

        assert.strictEqual(style.arrowTail?.size, 3);
        assert.strictEqual(style.arrowTail?.color, "#00ff00");
        assert.strictEqual(style.arrowTail?.opacity, 0.25);
        assert.isUndefined(style.arrowHead?.color, "the head was never painted, so it follows its line");
    });

    it("draws two arrow sizes from two source meshes, so a repaint really rebuilds the cap", async () => {
        const held = harness();

        await held.styles.add({
            name: "big arrows on heavy edges",
            target: "edge",
            selector: { match: "expression", where: "data.weight > `1`" },
            set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 3 },
        });
        await held.paintAll();

        const small = held.painter.edgePaint(0);
        const large = held.painter.edgePaint(1);

        assert.notStrictEqual(small?.meshKey, large?.meshKey, "two arrow sizes that share a mesh key never rebuild");
    });

    it("draws two head colours from two source meshes, so a colour edit really rebuilds the cap", async () => {
        const held = harness();

        // The CAP ITSELF IS THE SAME on every edge -- same type, same size, same end -- so the
        // only thing the two keys below can disagree about is the colour. A test that switched
        // the cap on for one edge and not the other would pass on the cap type alone, which is
        // how the defect this pins survived: the colour was never in the key at all, because a
        // resolved colour is an object and the interner pushed every object as "nothing painted
        // this".
        await held.styles.add({
            name: "red heads everywhere",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal", "edge.arrowHeadColor": "#ff0000" },
        });
        await held.styles.add({
            name: "blue heads on the heaviest edge",
            target: "edge",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "edge.arrowHeadColor": "#0000ff" },
        });
        await held.paintAll();

        const red = held.painter.edgePaint(0);
        const blue = held.painter.edgePaint(2);

        assert.strictEqual(red?.style.arrowHead?.color, "#ff0000");
        assert.strictEqual(blue?.style.arrowHead?.color, "#0000ff");
        assert.notStrictEqual(
            red?.meshKey,
            blue?.meshKey,
            "two head colours that share a mesh key are one cap drawn twice: `Edge.paintFrom` " +
                "returns early on an unchanged key, so a colour written to a graph already on " +
                "screen changes nothing at all",
        );
    });

    it("keys the tail's colour too, at the other end of the same line", async () => {
        const held = harness();

        await held.styles.add({
            name: "red tails everywhere",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowTail": "normal", "edge.arrowTailColor": "#ff0000" },
        });
        await held.styles.add({
            name: "green tails on the heaviest edge",
            target: "edge",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "edge.arrowTailColor": "#00ff00" },
        });
        await held.paintAll();

        assert.strictEqual(held.painter.edgePaint(2)?.style.arrowTail?.color, "#00ff00");
        assert.notStrictEqual(held.painter.edgePaint(0)?.meshKey, held.painter.edgePaint(2)?.meshKey);
    });

    it("tells two colours apart by every component, so a red and a green are not one key", async () => {
        const held = harness();

        await held.styles.add({
            name: "opaque red heads everywhere",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal", "edge.arrowHeadColor": "#ff0000" },
        });
        await held.styles.add({
            name: "the same red, half transparent, on the heaviest edge",
            target: "edge",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "edge.arrowHeadColor": "#ff000080" },
        });
        await held.paintAll();

        assert.notStrictEqual(
            held.painter.edgePaint(0)?.meshKey,
            held.painter.edgePaint(2)?.meshKey,
            "an alpha that does not key a mesh is a cap drawn at the wrong transparency",
        );
    });

    it("takes a size bound to a value in the data, which is what an encoding needs a scalar for", async () => {
        const held = harness();

        await held.styles.add({
            name: "arrow size by weight",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal" },
            encode: { "edge.arrowHeadSize": { by: "data.weight", scale: "linear", domain: [1, 3], range: [0.5, 2] } },
        });
        await held.paintAll();

        assert.strictEqual(held.painter.edgePaint(0)?.style.arrowHead?.size, 0.5);
        assert.strictEqual(held.painter.edgePaint(2)?.style.arrowHead?.size, 2);
    });
});

describe("the colour an unstyled arrow is drawn in", () => {
    it("is not pinned in the element's own defaults", () => {
        assert.isUndefined(
            defaultEdgeStyle.arrowHead?.color,
            "a colour in the defaults reaches every painted edge and no layer can be seen past it",
        );
    });

    it("is not filled in by the schema either, which is the other half of the same pin", () => {
        assert.isUndefined(
            EdgeStyle.parse({ arrowHead: { type: "normal" } }).arrowHead?.color,
            "ArrowStyle.color carrying a default means parsing an arrow invents a colour for it",
        );
    });

    it("leaves both ends of one edge to follow the line, rather than one grey and one magenta", async () => {
        const { style } = await edgePaintedWith({
            "edge.color": "#ff00ff",
            "edge.arrowHead": "normal",
            "edge.arrowTail": "normal",
        });

        assert.strictEqual(
            style.arrowHead?.color,
            style.arrowTail?.color,
            "the two ends of one unstyled edge must be drawn the same",
        );
        assert.isUndefined(style.arrowHead?.color, "an unpainted cap carries no colour, so the renderer's fallback fires");
    });
});

describe("the two other unreachable fields this lane publishes", () => {
    it("publishes the user's cap on how many pattern elements an edge draws", async () => {
        assert.isTrue(isChannel("edge.patternCount"));

        const { style } = await edgePaintedWith({ "edge.style": "dot", "edge.patternCount": 12 });

        assert.strictEqual(style.line?.patternCount, 12);
    });

    it("publishes the glow's strength, which the node.glow caveat used to say was unreachable", () => {
        assert.isTrue(isChannel("node.glowStrength"));
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glowStrength"].stylePath, "effect.glow.strength");
    });
});
