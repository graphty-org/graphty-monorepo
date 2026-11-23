/**
 * @file What `styles.add` and `styles.validate` refuse when the layer is written, rather than
 * accepting it and failing every repaint after: a missing value the channel cannot draw (#9706),
 * a `map`, `other` or `otherwise` value the channel cannot draw (#9715), and a key a layer
 * specification does not have (#9708).
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * Two nodes, one without a number at `data.x`.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    const s = createGraphSession();
    await s.data.addNodes([
        { id: "a", x: "n/a" },
        { id: "b", x: 1 },
    ]);

    return s;
}

/**
 * A layer encoding node opacity from `data.x`, with the given `missing`.
 * @param missing - What the binding paints for a missing value, as a JavaScript caller may write it.
 * @returns The specification.
 */
function opacityWith(missing: unknown): LayerSpec {
    return {
        name: "P",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.opacity": { by: "data.x", missing } },
    } as unknown as LayerSpec;
}

/**
 * What `add` rejected with.
 * @param s - The session.
 * @param spec - The specification.
 * @returns The rejection's code and its errors' paths.
 */
async function refusal(s: GraphSession, spec: LayerSpec): Promise<{ code: string; paths: string[] }> {
    try {
        await s.styles.add(spec);
    } catch (error) {
        assert.isTrue(isGraphtyError(error));
        if (!isGraphtyError(error)) {
            throw error;
        }
        const errors = error.details.errors as readonly { path: string }[];

        return { code: error.code, paths: errors.map((entry) => entry.path) };
    }

    throw new Error("add resolved");
}

describe("a missing value the channel cannot draw", () => {
    it("refuses one outside the channel's range with E_OPTION_RANGE", async () => {
        const s = await session();
        const spec = opacityWith({ value: 7 });

        assert.deepStrictEqual(await refusal(s, spec), {
            code: "E_OPTION_RANGE",
            paths: ["encode.node.opacity.missing.value"],
        });
        assert.isFalse(s.styles.validate(spec).ok);
    });

    it("refuses one of the wrong kind with E_BAD_LAYER", async () => {
        const s = await session();

        assert.strictEqual((await refusal(s, opacityWith({ value: "red" }))).code, "E_BAD_LAYER");
    });

    it("refuses one not in the { value } shape with E_BAD_LAYER", async () => {
        const s = await session();

        assert.deepStrictEqual(await refusal(s, opacityWith(0.2)), {
            code: "E_BAD_LAYER",
            paths: ["encode.node.opacity.missing"],
        });
        assert.strictEqual((await refusal(s, opacityWith(null))).code, "E_BAD_LAYER");
    });

    it("accepts one the channel draws, and skip", async () => {
        const s = await session();

        assert.isTrue(s.styles.validate(opacityWith({ value: 0.2 })).ok);
        assert.isTrue(s.styles.validate(opacityWith("skip")).ok);
        const layer = await s.styles.add(opacityWith({ value: 0.2 }));
        assert.isDefined(s.styles.get(layer.id));
    });
});

/**
 * A layer encoding node opacity from `data.x`, with the given extra binding options.
 * @param extra - The options, as a JavaScript caller may write them.
 * @returns The specification.
 */
function opacityBinding(extra: Record<string, unknown>): LayerSpec {
    return {
        name: "P",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.opacity": { by: "data.x", ...extra } },
    } as unknown as LayerSpec;
}

describe("a map, other or otherwise value the channel cannot draw", () => {
    it("refuses a map value outside the channel's range with E_OPTION_RANGE", async () => {
        const s = await session();
        const spec = opacityBinding({ map: { "n/a": 0.5, "1": 7 } });

        assert.deepStrictEqual(await refusal(s, spec), {
            code: "E_OPTION_RANGE",
            paths: ["encode.node.opacity.map.1"],
        });
        assert.isFalse(s.styles.validate(spec).ok);
    });

    it("refuses a map value of the wrong kind, and a map that is not one, with E_BAD_LAYER", async () => {
        const s = await session();

        assert.deepStrictEqual(await refusal(s, opacityBinding({ map: { "1": "red" } })), {
            code: "E_BAD_LAYER",
            paths: ["encode.node.opacity.map.1"],
        });
        assert.deepStrictEqual(await refusal(s, opacityBinding({ map: 0.5 })), {
            code: "E_BAD_LAYER",
            paths: ["encode.node.opacity.map"],
        });
    });

    it("refuses an other value the channel cannot draw", async () => {
        const s = await session();

        assert.deepStrictEqual(await refusal(s, opacityBinding({ other: { threshold: 2, value: 7 } })), {
            code: "E_OPTION_RANGE",
            paths: ["encode.node.opacity.other.value"],
        });
        assert.deepStrictEqual(await refusal(s, opacityBinding({ other: { threshold: 2, value: "red" } })), {
            code: "E_BAD_LAYER",
            paths: ["encode.node.opacity.other.value"],
        });
        assert.deepStrictEqual(await refusal(s, opacityBinding({ other: 7 })), {
            code: "E_BAD_LAYER",
            paths: ["encode.node.opacity.other"],
        });
    });

    it("refuses an otherwise value the channel cannot draw", async () => {
        const s = await session();

        assert.deepStrictEqual(await refusal(s, opacityBinding({ map: { "1": 0.5 }, otherwise: 7 })), {
            code: "E_OPTION_RANGE",
            paths: ["encode.node.opacity.otherwise"],
        });
    });

    it("accepts values the channel draws, on a color channel too", async () => {
        const s = await session();
        const good = opacityBinding({ map: { "1": 0.5 }, other: { threshold: 2, value: 0.2 }, otherwise: 1 });

        assert.isTrue(s.styles.validate(good).ok);
        const layer = await s.styles.add(good);
        assert.isDefined(s.styles.get(layer.id));
        const color = {
            name: "C",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.x", map: { "1": "red" }, other: { threshold: 2, value: "#808080" } } },
        } as unknown as LayerSpec;
        assert.isTrue(s.styles.validate(color).ok);
        assert.isFalse(
            s.styles.validate({
                ...color,
                encode: { "node.color": { by: "data.x", map: { "1": 0.5 } } },
            }).ok,
        );
    });
});

describe("a key a layer specification does not have", () => {
    it("refuses it with E_BAD_LAYER naming the key", async () => {
        const s = await session();
        const spec = {
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            style: { "node.color": "red" },
        } as unknown as LayerSpec;

        assert.deepStrictEqual(await refusal(s, spec), { code: "E_BAD_LAYER", paths: ["style"] });
        const [problem] = s.styles.validate(spec).errors;
        assert.include(problem?.candidates ?? [], "set");
        assert.include(problem?.candidates ?? [], "encode");
    });

    it("refuses it on update too", async () => {
        const s = await session();
        const layer = await s.styles.add({ name: "Red", target: "node", selector: { match: "everything" } });
        const patch = { style: { "node.color": "red" } } as unknown as Partial<LayerSpec>;

        try {
            await s.styles.update(layer.id, patch);
            assert.fail("update resolved");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_LAYER");
        }
    });
});
