import { assert, describe, it } from "vitest";

import { NodeShapes } from "../../../src/config/NodeStyle";
import {
    type ArrowValue,
    type AuthoredValue,
    CHANNEL_DESCRIPTORS,
    type ChannelDescriptor,
    channelDescriptor,
    CHANNELS,
    channelsFor,
    type ChannelValueKind,
    type ChannelValues,
    COLOR_CHANNELS,
    type ColorChannel,
    type EdgeLineValue,
    isChannel,
    type NodeShapeValue,
    type PaintedValue,
    toColorValue,
} from "../../../src/session/styles/channels";

/** The twenty-three channels the design declares, in the order it declares them. */
const DECLARED = [
    "node.color",
    "node.size",
    "node.shape",
    "node.label",
    "node.labelStyle",
    "node.tooltip",
    "node.opacity",
    "node.outline",
    "node.glow",
    "node.wireframe",
    "node.flat",
    "node.marker",
    "edge.color",
    "edge.width",
    "edge.opacity",
    "edge.style",
    "edge.curvature",
    "edge.arrowHead",
    "edge.arrowTail",
    "edge.animationSpeed",
    "edge.label",
    "edge.labelStyle",
    "edge.tooltip",
];

describe("the channel set", () => {
    it("is exactly the declared set, closed and in order", () => {
        assert.deepEqual([...CHANNELS], DECLARED);
    });

    it("keys every descriptor by its own name, so a table entry cannot describe another channel", () => {
        for (const channel of CHANNELS) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].channel, channel);
        }
    });

    it("targets whatever the name says it targets", () => {
        for (const channel of CHANNELS) {
            const expected = channel.startsWith("node.") ? "node" : "edge";
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].target, expected, channel);
        }
    });

    it("says where every channel lands in a parsed style", () => {
        for (const channel of CHANNELS) {
            assert.isNotEmpty(CHANNEL_DESCRIPTORS[channel].stylePath, channel);
        }
    });

    it("splits into twelve node channels and eleven edge channels", () => {
        assert.strictEqual(channelsFor("node").length, 12);
        assert.strictEqual(channelsFor("edge").length, 11);
        assert.deepEqual(
            channelsFor("edge").map((descriptor) => descriptor.channel),
            DECLARED.filter((channel) => channel.startsWith("edge.")),
        );
    });

    it("recognises a channel and refuses anything else, so a misspelling is never a silent no-op", () => {
        assert.isTrue(isChannel("node.color"));
        assert.isFalse(isChannel("node.colour"));
        assert.isFalse(isChannel("nodeColor"));
        assert.isFalse(isChannel(""));
        assert.isFalse(isChannel(7));
        assert.isFalse(isChannel(null));
        // Object.hasOwn rather than a property read, so an inherited name is not a channel.
        assert.isFalse(isChannel("toString"));
        assert.isFalse(isChannel("constructor"));
    });

    it("looks one channel up and answers undefined for a name it does not have", () => {
        assert.strictEqual(channelDescriptor("edge.width")?.plainName, "Edge Width");
        assert.isUndefined(channelDescriptor("edge.thickness"));
    });
});

describe("what the element can really draw", () => {
    it("draws every channel but the marker", () => {
        const unrenderable = CHANNELS.filter((channel) => !CHANNEL_DESCRIPTORS[channel].renderable);

        assert.deepEqual(unrenderable, ["node.marker"]);
    });

    it("says why the marker draws nothing, rather than accepting a value and dropping it", () => {
        const marker = CHANNEL_DESCRIPTORS["node.marker"];

        assert.strictEqual(marker.accepts, "nothing");
        assert.isDefined(marker.caveat);
    });

    it("records what the renderer narrows, on the channels it narrows", () => {
        // A curvature is a switch, and a label's own box is sized to its text.
        assert.isDefined(CHANNEL_DESCRIPTORS["edge.curvature"].caveat);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.curvature"].accepts, "boolean");
        assert.isDefined(CHANNEL_DESCRIPTORS["node.labelStyle"].caveat);
        assert.isDefined(CHANNEL_DESCRIPTORS["node.outline"].caveat);
        assert.isDefined(CHANNEL_DESCRIPTORS["node.glow"].caveat);
    });

    it("takes the node shapes from the schema the mesh builder reads, not from a second list", () => {
        assert.deepEqual(CHANNEL_DESCRIPTORS["node.shape"].values, [...NodeShapes.options]);
    });

    it("offers the nine line patterns the edge renderer has meshes for", () => {
        const patterns = CHANNEL_DESCRIPTORS["edge.style"].values ?? [];

        assert.deepEqual([...patterns], ["solid", "dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"]);
    });

    it("does not offer the line patterns the catalogue's EdgeLinePattern invented", () => {
        // EdgeLinePattern in src/catalog/types.ts names nine patterns of which seven have never
        // had a mesh. Offering one would be a control that silently draws something else.
        const patterns = CHANNEL_DESCRIPTORS["edge.style"].values ?? [];

        for (const invented of ["dashed", "dotted", "dash-dot-dot", "long-dash", "short-dash", "double", "wave"]) {
            assert.notInclude(patterns, invented);
        }
    });

    it("offers the same arrows at both ends", () => {
        const head = CHANNEL_DESCRIPTORS["edge.arrowHead"].values ?? [];

        assert.deepEqual(CHANNEL_DESCRIPTORS["edge.arrowTail"].values, head);
        assert.include(head, "normal");
        assert.include(head, "none");
    });

    it("bounds the numbers the renderer bounds", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.opacity"].max, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.opacity"].max, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.size"].min, 0);
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.size"].max);
    });
});

describe("colour channels", () => {
    it("are the four that carry a colour, and the type says the same four", () => {
        const fromTheType: readonly ColorChannel[] = ["node.color", "node.outline", "node.glow", "edge.color"];

        assert.deepEqual([...COLOR_CHANNELS], fromTheType);
    });
});

describe("what each channel carries", () => {
    // Everything in this block is checked by the compiler as much as by the assertion. A value
    // type that drifts from the renderer stops compiling here rather than drawing the wrong
    // thing at run time.
    it("types a colour channel as a parsed colour, and lets an author write a string", () => {
        const painted: PaintedValue<"node.color"> | null = toColorValue("#ff0000");
        const authored: AuthoredValue<"node.color"> = "red";

        assert.strictEqual(painted?.hex, "#ff0000");
        assert.deepEqual(toColorValue(authored), painted);
    });

    it("types the enumerated channels as the values their schemas allow", () => {
        const shape: NodeShapeValue = "icosphere";
        const pattern: EdgeLineValue = "dash-dot";
        const arrow: ArrowValue = "vee";

        assert.include(CHANNEL_DESCRIPTORS["node.shape"].values ?? [], shape);
        assert.include(CHANNEL_DESCRIPTORS["edge.style"].values ?? [], pattern);
        assert.include(CHANNEL_DESCRIPTORS["edge.arrowHead"].values ?? [], arrow);
    });

    it("types the rest as what a repaint writes", () => {
        const style: Partial<ChannelValues> = {
            "node.size": 3,
            "node.label": "gene A",
            "node.wireframe": true,
            "node.labelStyle": { sizePx: 12, weight: "bold" },
            "edge.animationSpeed": 0.5,
            "edge.curvature": true,
        };

        assert.strictEqual(style["node.size"], 3);
        assert.isUndefined(style["node.marker"]);
    });

    it("makes the marker unwritable rather than writable and ignored", () => {
        // This line compiles only while the marker's value type is `never`, which is how a
        // channel the element cannot draw stays unreachable instead of silently doing nothing.
        const nothingFits: [PaintedValue<"node.marker">] extends [never] ? true : false = true;

        assert.isTrue(nothingFits);
    });

    it("gives every descriptor a value kind a control can be built from", () => {
        const kinds: readonly ChannelValueKind[] = CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel].accepts);
        const drawn = (descriptor: ChannelDescriptor): boolean => descriptor.renderable;

        assert.strictEqual(kinds.filter((kind) => kind === "nothing").length, 1);
        assert.isFalse(drawn(CHANNEL_DESCRIPTORS["node.marker"]));
    });
});

describe("toColorValue", () => {
    it("reads six-digit hex and keeps the numbers beside the string", () => {
        const color = toColorValue("#ff9900");

        assert.deepEqual(color, { r: 255, g: 153, b: 0, a: 1, hex: "#ff9900" });
    });

    it("reads hex without the hash, and in either case", () => {
        assert.deepEqual(toColorValue("FF9900"), toColorValue("#ff9900"));
    });

    it("doubles three-digit shorthand the way CSS does", () => {
        assert.deepEqual(toColorValue("#f0c"), { r: 255, g: 0, b: 204, a: 1, hex: "#ff00cc" });
    });

    it("reads eight-digit hex as a colour with alpha, and writes it back the same way", () => {
        const color = toColorValue("#ff990080");

        assert.strictEqual(color?.a, 128 / 255);
        assert.strictEqual(color?.hex, "#ff990080");
    });

    it("reads four-digit shorthand with alpha", () => {
        assert.deepEqual(toColorValue("#f0c8"), { r: 255, g: 0, b: 204, a: 136 / 255, hex: "#ff00cc88" });
    });

    it("drops the alpha digits from the string form when the colour is opaque", () => {
        assert.strictEqual(toColorValue("#112233ff")?.hex, "#112233");
    });

    it("reads a CSS colour name through the element's own normaliser, so channels accept what styles accept", () => {
        assert.deepEqual(toColorValue("red"), { r: 255, g: 0, b: 0, a: 1, hex: "#ff0000" });
    });

    it("reads components that are already parsed, and clamps them", () => {
        assert.deepEqual(toColorValue({ r: -5, g: 300, b: 12.6, a: 4 }), {
            r: 0,
            g: 255,
            b: 13,
            a: 1,
            hex: "#00ff0d",
        });
    });

    it("treats a non-finite alpha as opaque rather than as a hole in the colour", () => {
        assert.strictEqual(toColorValue({ r: 1, g: 2, b: 3, a: Number.NaN })?.a, 1);
    });

    it("answers null for what is not a colour, and never throws", () => {
        // It runs inside a repaint loop with no try/catch of its own: one unreadable value must
        // not cost every later element its style.
        assert.isNull(toColorValue("not-a-colour"));
        assert.isNull(toColorValue("#12345"));
        assert.isNull(toColorValue(""));
        assert.isNull(toColorValue(null));
        assert.isNull(toColorValue(undefined));
    });
});
