/**
 * The element's configuration document.
 *
 * WHAT `Styles` IS NOW. The id paths a record is read with, the view mode, the background, the
 * layout and its options, the algorithms to run on load, and the behaviour settings -- and
 * nothing else. The stack of jmespath-selector layers it used to carry beside them is gone;
 * style layers are `session.styles`, which addresses a layer by a stable id and is tested in
 * `test/session/`.
 *
 * WHY THE 1.x KEYS ARE STILL HERE. A document saved by 1.x carries a `layers` array and an
 * `addDefaultStyle` flag, and this schema is strict: dropping either key would turn every one of
 * those documents into a parse error and take its id paths, its view mode, its background and
 * its layout down with the layers nobody reads. So both parse, neither is read, and the tests
 * below pin exactly that.
 */

import { assert, describe, it, vi } from "vitest";

import { colorToHex } from "../src/config";
import { ColorStyle } from "../src/config/common";
import { GraphtyError } from "../src/errors/GraphtyError";
import { Styles } from "../src/Styles";
import badLayer from "./helpers/styles-bad-layer.json";
import basicDualStyle from "./helpers/styles-basic-dual.json";
import basicEdgeStyle from "./helpers/styles-basic-edge.json";
import basicNodeStyle from "./helpers/styles-basic-node.json";
import basicSelector from "./helpers/styles-basic-selector.json";
import defaultStyle from "./helpers/styles-default.json";
import emptyStyle from "./helpers/styles-empty.json";
import emptyLayer from "./helpers/styles-empty-layer.json";
import twoLayerTemplate from "./helpers/styles-two-layers.json";

describe("Styles", () => {
    it("exists and is a class", () => {
        assert.isFunction(Styles);
    });

    it("is the configuration document and nothing else", () => {
        const s = Styles.default();

        // The layer half is gone rather than hidden: an instance carries the parsed document and
        // no second stack beside it, which is what makes `session.styles` the only stack there is.
        // The document is read through the one accessor, `config`; nothing else is public.
        assert.deepStrictEqual(Object.keys(s), []);
        assert.deepStrictEqual(Object.getOwnPropertyNames(Styles.prototype).sort(), ["config", "constructor"]);
        assert.isObject(s.config);
    });

    describe("fromJson", () => {
        it("accepts a document with an empty layer array", () => {
            const s = Styles.fromJson('{"graphtyTemplate": true, "majorVersion": "1", "layers": []}');

            assert.isEmpty(s.config.layers);
        });
    });

    describe("fromUrl", () => {
        it("reads the document at the URL", async () => {
            const s = await Styles.fromUrl(
                'data:application/json,{"graphtyTemplate":true,"majorVersion":"1","layers":[]}',
            );

            assert.isEmpty(s.config.layers);
        });

        it("refuses an HTTP failure with E_FETCH_FAILED", async () => {
            vi.stubGlobal("fetch", () => Promise.resolve(new Response("missing", { status: 404 })));
            try {
                const error: unknown = await Styles.fromUrl("missing.json").catch((e: unknown) => e);
                assert.instanceOf(error, GraphtyError);
                assert.strictEqual(error.code, "E_FETCH_FAILED");
                assert.strictEqual(error.details.status, 404);
            } finally {
                vi.unstubAllGlobals();
            }
        });

        it("refuses a body that is not JSON with E_PARSE_FAILED", async () => {
            const error: unknown = await Styles.fromUrl("data:text/plain,not%20json").catch((e: unknown) => e);
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_PARSE_FAILED");
        });
    });

    describe("fromObject", () => {
        it("accepts a document with an empty layer array", () => {
            const s = Styles.fromObject({ graphtyTemplate: true, majorVersion: "1", layers: [] });

            assert.isEmpty(s.config.layers);
        });

        it("fills in the whole configuration from the schema's defaults", () => {
            const s = Styles.fromObject(emptyStyle);

            assert.strictEqual(s.config.graph.viewMode, "3d");
            assert.deepStrictEqual(s.config.graph.background, {
                backgroundType: "color",
                color: "#F5F5F5",
            });
            assert.strictEqual(s.config.data.knownFields.nodeIdPath, "id");
            // Null, not "src": the element probes source/target, then src/dst, then from/to, so
            // a file spelled the way every one of the element's own guides teaches is read rather
            // than silently producing a graph with nodes and no edges.
            assert.isNull(s.config.data.knownFields.edgeSrcIdPath);
            assert.isNull(s.config.data.knownFields.edgeDstIdPath);
            assert.strictEqual(s.config.data.knownFields.repeatedEdges, "keep");
            assert.strictEqual(s.config.behavior.layout.preSteps, 0);
        });

        it("carries the configuration a document sets", () => {
            const s = Styles.fromObject({
                graphtyTemplate: true,
                majorVersion: "1",
                graph: {
                    viewMode: "2d",
                    background: { backgroundType: "color", color: "hotpink" },
                    layout: "circular",
                    layoutOptions: { radius: 5 },
                    startingCameraDistance: 60,
                },
                data: { algorithms: ["graphty:degree"] },
                behavior: { layout: { preSteps: 2000 } },
            });

            assert.strictEqual(s.config.graph.viewMode, "2d");
            // A CSS colour name is normalised on parse, which is why a background set through
            // the element reaches the renderer as hex whatever the caller wrote.
            assert.deepStrictEqual(s.config.graph.background, { backgroundType: "color", color: "#FF69B4" });
            assert.strictEqual(s.config.graph.layout, "circular");
            assert.deepStrictEqual(s.config.graph.layoutOptions, { radius: 5 });
            assert.strictEqual(s.config.graph.startingCameraDistance, 60);
            assert.deepStrictEqual(s.config.data.algorithms, ["graphty:degree"]);
            assert.strictEqual(s.config.behavior.layout.preSteps, 2000);
        });
    });

    /**
     * The 1.x keys, and the rule that governs both of them: they parse, and nothing reads them.
     *
     * The tests that used to live here asserted the opposite -- that a malformed layer threw a
     * `ZodError` and refused the document. That refusal is the behaviour that deliberately went
     * away: with nothing reading the array, turning down a whole configuration over one field in
     * an ignored layer loses the id paths, the view mode and the layout that the same document
     * carries, and the reader is given a parse error about a feature that no longer exists.
     */
    describe("the 1.x keys it accepts and ignores", () => {
        it("keeps a layer array out of reach of everything but the parser", () => {
            const s = Styles.fromObject(basicNodeStyle);

            assert.lengthOf(s.config.layers, 1);
            assert.notProperty(s, "layers");
            assert.notProperty(s, "getStyleForNode");
            assert.notProperty(s, "addLayer");
        });

        it("parses node, edge and dual layers without resolving any of them", () => {
            for (const document of [basicNodeStyle, basicEdgeStyle, basicDualStyle, twoLayerTemplate]) {
                const s = Styles.fromObject(document);

                assert.isAtLeast(s.config.layers.length, 1);
            }
        });

        it("parses a selector no 2.0 selector language accepts, because nothing compiles it", () => {
            // `starts_with(...)` is a jmespath function, and the element's own selector parser
            // admits no functions at all. It survives here only as text in an ignored field.
            const s = Styles.fromObject(basicSelector);

            assert.lengthOf(s.config.layers, 1);
        });

        it("accepts a layer with fields no 1.x layer ever had", () => {
            const s = Styles.fromObject(badLayer);

            assert.lengthOf(s.config.layers, 1);
            assert.strictEqual(s.config.graph.addDefaultStyle, false, "and the configuration beside it still arrives");
        });

        it("accepts an empty layer", () => {
            const s = Styles.fromObject(emptyLayer);

            assert.lengthOf(s.config.layers, 1);
            assert.strictEqual(s.config.graph.addDefaultStyle, false);
        });

        it("accepts addDefaultStyle and gives it to nobody", () => {
            // The flag used to unshift a default layer onto the 1.x stack. The session's two
            // locked base layers now give every graph its defaults whatever this says, so the
            // only thing left to assert is that the document still parses with it set.
            const s = Styles.fromObject(defaultStyle);

            assert.isTrue(s.config.graph.addDefaultStyle);
            assert.isEmpty(s.config.layers);
        });
    });

    describe("colors", () => {
        it("converted by name", () => {
            assert.strictEqual(colorToHex("hotpink"), "#FF69B4");
        });

        it("converted by hex rgb", () => {
            assert.strictEqual(colorToHex("#c0ffee"), "#C0FFEE");
        });

        it("converted by hex rgba", () => {
            assert.strictEqual(colorToHex("#c0ffee00"), "#C0FFEE00");
        });

        it("converted by rgb", () => {
            assert.strictEqual(colorToHex("rgb(1, 3, 5)"), "#010305");
        });

        it("converted by rgba", () => {
            assert.strictEqual(colorToHex("rgba(200, 60, 60, 0.3)"), "#C83C3C4D");
        });

        it("converted by hsl", () => {
            assert.strictEqual(colorToHex("hsl(210, 79%, 30%)"), "#104D89");
        });

        it("converted by hsla", () => {
            assert.strictEqual(colorToHex("hsla(210, 79%, 30%, 0.4)"), "#104D8966");
        });

        it("converted by hwb", () => {
            assert.strictEqual(colorToHex("hwb(60, 3%, 60%)"), "#666608");
        });

        it("converted by hwba, keeping its alpha like every other form", () => {
            assert.strictEqual(colorToHex("hwb(60, 3%, 60%, 0.6)"), "#66660899");
        });

        it("expands a collapsed #RGBA to eight digits", () => {
            assert.strictEqual(colorToHex("#f008"), "#FF000088");
        });

        it("answers undefined for a string that is not a color", () => {
            assert.isUndefined(colorToHex("notacolor"));
        });

        it("reports a style color that is not a color as an issue rather than throwing", () => {
            const result = ColorStyle.safeParse("notacolor");
            assert.isFalse(result.success);
            assert.strictEqual(ColorStyle.parse("red"), "#FF0000");
        });
    });
});
