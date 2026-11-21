/**
 * @file The pieces of the style stack that live outside `createStylesApi`: the reading cache,
 * the default palettes, a branches view's layers and a style document's shader check. Each is
 * reached here directly, without building a session.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Selector } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { isStateMark, outsideInView } from "../../../src/session/styles/branchesView";
import type { CompiledLayer } from "../../../src/session/styles/Layer";
import { assertDefaultPalettes, createPaletteDefaults } from "../../../src/session/styles/paletteDefaults";
import { createReadingCache } from "../../../src/session/styles/readingCache";
import { createScaleRegistry } from "../../../src/session/styles/scales";
import { checkDocument, documentRowKeys } from "../../../src/session/styles/styleDocument";

/**
 * A stack entry with only what the branches view reads.
 * @param id - The layer id.
 * @param kind - The layer kind.
 * @param selector - The layer selector.
 * @returns The entry.
 */
function entry(id: string, kind: string, selector: Selector = { match: "everything" }): CompiledLayer {
    return Object.freeze({
        layer: Object.freeze({ id, kind, enabled: true, selector }),
        selector: { test: null },
        reads: [],
    }) as unknown as CompiledLayer;
}

describe("createReadingCache", () => {
    it("reads once per token, and again when the token moves", () => {
        let token: readonly unknown[] | null = [1, "a"];
        let reads = 0;
        const kept = createReadingCache(() => token);
        const read = (): number => ++reads;

        assert.strictEqual(kept("q", read), 1);
        assert.strictEqual(kept("q", read), 1);
        assert.strictEqual(kept("other", read), 2);

        token = [1, "b"];
        assert.strictEqual(kept("q", read), 3);

        token = null;
        assert.strictEqual(kept("q", read), 4);
        assert.strictEqual(kept("q", read), 5);
    });
});

describe("createPaletteDefaults", () => {
    const spec: LayerSpec = {
        name: "Groups",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.group", scale: "ordinal" } },
    };

    it("fills a default into a color binding that names no palette, and remembers it", () => {
        const defaults = createPaletteDefaults({ scales: createScaleRegistry(), fresh: () => [] });
        assert.strictEqual(defaults.withDefaultPalettes(spec, "groups"), spec);

        defaults.defaultPalettes = { categorical: "okabe-ito" };
        const filled = defaults.withDefaultPalettes(spec, "groups");
        assert.deepStrictEqual(filled.encode?.["node.color"], {
            by: "data.group",
            scale: "ordinal",
            palette: "okabe-ito",
        });
        assert.strictEqual(defaults.defaulted.get("groups/node.color"), "okabe-ito");
    });

    it("names, on save, only the palette a binding was painted through", () => {
        const defaults = createPaletteDefaults({ scales: createScaleRegistry(), fresh: () => [] });
        assert.strictEqual(defaults.withResolvedPalettes(spec, "groups"), spec);
    });

    it("refuses a default of the wrong kind or an unknown palette", () => {
        const codeOf = (palettes: object): string | undefined => {
            try {
                assertDefaultPalettes(palettes);
                return undefined;
            } catch (error) {
                return isGraphtyError(error) ? error.code : "thrown";
            }
        };

        assert.strictEqual(codeOf({ categorical: "okabe-ito" }), undefined);
        assert.strictEqual(codeOf({ sequential: "okabe-ito" }), "E_BAD_COMMAND");
        assert.strictEqual(codeOf({ categorical: "no-such-palette" }), "E_UNKNOWN_PALETTE");
        assert.strictEqual(codeOf({ cyclic: "viridis" }), "E_BAD_COMMAND");
    });
});

describe("branches view", () => {
    it("keeps the selection ring and the hover mark above a view", () => {
        assert.isTrue(isStateMark(entry("selected", "user", { match: "state", state: "selected" })));
        assert.isTrue(isStateMark(entry("hovered", "user", { match: "state", state: "hovered" })));
        assert.isFalse(isStateMark(entry("mine", "user")));
    });

    it("draws nothing for the time window while no layer draws or hides it", () => {
        assert.deepStrictEqual(outsideInView([entry("mine", "user")]), []);
    });
});

describe("style documents", () => {
    const codeOf = (document: object): unknown => {
        try {
            checkDocument(document as Parameters<typeof checkDocument>[0]);
            return undefined;
        } catch (error) {
            return isGraphtyError(error) ? (error.details as { code?: unknown } | undefined)?.code : "thrown";
        }
    };

    it("refuses too many shaders and a shader that is not { id, text }", () => {
        const shaders = Array.from({ length: 65 }, (_, at) => ({ id: `s${String(at)}`, text: "" }));
        assert.strictEqual(codeOf({ version: 1, layers: [], shaders }), "shader.too-many");
        assert.strictEqual(codeOf({ version: 1, layers: [], shaders: [{ id: "s", text: 1 }] }), "shader.id-invalid");
    });

    it("keys each row by its node part's new id", () => {
        const specs = [
            { row: "r", target: "edge" },
            { row: "r", target: "node" },
            { target: "node" },
        ] as unknown as LayerSpec[];
        assert.deepStrictEqual(
            [...documentRowKeys(specs, ["e1", "n1", "x"])],
            [
                [0, "n1"],
                [1, "n1"],
            ],
        );
    });
});
