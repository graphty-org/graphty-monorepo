import { assert, describe, it } from "vitest";

import {
    ATLAS_SIZE,
    distanceField,
    fontLigatures,
    GLYPH_TILE,
    GlyphAtlas,
    glyphKey,
    type PlacedGlyph,
    placeGlyphs,
    scriptFallback,
} from "../../src/meshes/GlyphAtlas";

const blank = (): Uint8Array => new Uint8Array(GLYPH_TILE * GLYPH_TILE);

describe("glyph atlas fallback list", () => {
    it("draws plain Latin, Greek, Cyrillic and CJK words from the atlas", () => {
        for (const text of [
            "AVATAR",
            "Node 42",
            "alpha beta",
            "\u0391\u03B8\u03AE\u03BD\u03B1",
            "\u041C\u043E\u0441\u043A\u0432\u0430",
            "\u6771\u4EAC",
        ]) {
            assert.isNull(scriptFallback(text), text);
        }
    });

    it("sends right-to-left, Indic, emoji and combining marks to RichTextLabel", () => {
        assert.strictEqual(scriptFallback("\u0627\u0644\u0642\u0627\u0647\u0631\u0629"), "right-to-left"); // Arabic
        assert.strictEqual(scriptFallback("\u05E9\u05DC\u05D5\u05DD"), "right-to-left"); // Hebrew
        assert.strictEqual(scriptFallback("\u0926\u093F\u0932\u094D\u0932\u0940"), "complex-script"); // Devanagari
        assert.strictEqual(scriptFallback("\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E"), "complex-script"); // Thai
        assert.strictEqual(scriptFallback("hub \u{1F680}"), "emoji");
        assert.strictEqual(scriptFallback("\u{1F1EF}\u{1F1F5}"), "emoji"); // a flag
        assert.strictEqual(scriptFallback("cafe\u0301"), "combining-mark");
        assert.strictEqual(scriptFallback("mixed \u0627 text"), "right-to-left");
    });
});

describe("glyph placement", () => {
    // A font with kerning: "AV" and "VA" pull 3 px closer than their glyphs' widths add up to.
    const widths: Record<string, number> = { A: 30, V: 30, T: 28, R: 29, " ": 10, f: 12, i: 8 };
    const kern = (s: string): number => {
        let w = 0;
        for (let i = 0; i < s.length; i++) {
            w += widths[s[i]];
            const pair = s.slice(i - 1, i + 1);
            if (pair === "AV" || pair === "VA") {
                w -= 3;
            }
        }
        return w;
    };

    it("puts each glyph at the width through it less its own, keeping kerning", () => {
        const placed = placeGlyphs("AVATAR", kern);
        assert.deepEqual(
            placed.map((g) => g.x),
            [0, 27, 54, 84, 112, 142],
        );
        // the last glyph ends where the measured line ends
        assert.strictEqual(placed[5].x + widths.R, kern("AVATAR"));
    });

    it("leaves spaces out but keeps their advance", () => {
        const placed = placeGlyphs("A A", kern);
        assert.deepEqual(placed, [
            { glyph: "A", x: 0 },
            { glyph: "A", x: 40 },
        ]);
    });
});

describe("glyph atlas ligature fonts", () => {
    // A fake raster: each drawn run inks one cell per character, at the cell its x falls on, with
    // the character's code as the ink. A ligature font shapes "fi" in one run into one glyph whose
    // ink differs from "f" and "i" apart -- what Chromium does with DejaVu Sans and DejaVu Serif,
    // whose advance widths ("fi" as wide as "f" plus "i") show nothing.
    const width = (s: string): number => 10 * s.length; // every test string is one code unit per glyph
    const raster =
        (ligates: boolean) =>
        (runs: readonly PlacedGlyph[]): number[] => {
            const cells = new Array<number>(64).fill(0);
            for (const run of runs) {
                const shaped = ligates ? run.glyph.replaceAll("fi", "\uFB01 ") : run.glyph;
                for (let i = 0; i < shaped.length; i++) {
                    cells[run.x / 10 + i] += shaped[i] === " " ? 0 : shaped.charCodeAt(i) % 251;
                }
            }
            return cells;
        };

    it("finds a font that draws a ligature, whose advance widths match its parts", () => {
        assert.strictEqual(width("fi"), width("f") + width("i"));
        assert.deepEqual(fontLigatures(width, raster(true)), ["fi", "ffi"]);
    });

    it("passes a font whose glyphs draw the same one by one as in a run", () => {
        assert.deepEqual(fontLigatures(width, raster(false)), []);
    });
});

describe("glyph atlas page", () => {
    it("holds about 2,500 tiles in one 4096 page", () => {
        const atlas = new GlyphAtlas();
        assert.strictEqual(atlas.size, ATLAS_SIZE);
        assert.strictEqual(atlas.capacity, 2601);
    });

    it("adds each glyph once, in order, and refuses the next one when full", () => {
        const atlas = new GlyphAtlas(GLYPH_TILE * 2, GLYPH_TILE);
        let draws = 0;
        const draw = (): Uint8Array => {
            draws++;
            return blank();
        };
        const keys = ["a", "b", "c", "d"].map((g) => glyphKey(g, "normal 400 Arial"));
        const tiles = keys.map((k) => atlas.add(k, draw));
        assert.deepEqual(
            tiles.map((t) => [t?.x, t?.y]),
            [
                [0, 0],
                [GLYPH_TILE, 0],
                [0, GLYPH_TILE],
                [GLYPH_TILE, GLYPH_TILE],
            ],
        );
        assert.strictEqual(atlas.add(keys[1], draw), tiles[1]);
        assert.strictEqual(draws, 4);
        assert.strictEqual(atlas.version, 4);
        // no second page and no eviction: the fifth glyph gets no tile, and the first four keep theirs
        assert.isNull(atlas.add(glyphKey("e", "normal 400 Arial"), draw));
        assert.strictEqual(draws, 4);
        assert.strictEqual(atlas.find(keys[0]), tiles[0]);
        assert.strictEqual(atlas.used, 4);
    });

    it("says whether a label's glyphs all fit, so a label falls back whole", () => {
        const atlas = new GlyphAtlas(GLYPH_TILE * 2, GLYPH_TILE);
        for (const g of "abc") {
            atlas.add(glyphKey(g, "f"), blank);
        }
        assert.isTrue(atlas.fits(["a", "b", "d", "d"].map((g) => glyphKey(g, "f"))));
        assert.isFalse(atlas.fits(["d", "e"].map((g) => glyphKey(g, "f"))));
        // a glyph in another font is another tile
        assert.isFalse(atlas.fits([glyphKey("a", "g"), glyphKey("b", "g")]));
    });

    it("writes each tile's field at its place in the page", () => {
        const atlas = new GlyphAtlas(GLYPH_TILE * 2, GLYPH_TILE);
        const before = atlas.pixels;
        assert.isNull(before);
        atlas.add("x", blank);
        const full = (): Uint8Array => new Uint8Array(GLYPH_TILE * GLYPH_TILE).fill(255);
        const tile = atlas.add("y", full);
        const pixels = atlas.pixels as Uint8Array;
        const centre = (GLYPH_TILE >> 1) * atlas.size + (tile?.x ?? 0) + (GLYPH_TILE >> 1);
        assert.strictEqual(pixels[centre], 255);
        assert.strictEqual(pixels[(GLYPH_TILE >> 1) * atlas.size + (GLYPH_TILE >> 1)], 0);
    });
});

describe("distance field", () => {
    it("is 191 on the edge, full inside, and falls to 0 one reach outside", () => {
        const side = 32;
        const radius = 8;
        const ink = new Uint8Array(side * side);
        // a filled square from column 12 to 19 and row 12 to 19
        for (let y = 12; y < 20; y++) {
            for (let x = 12; x < 20; x++) {
                ink[y * side + x] = 255;
            }
        }
        const field = distanceField(ink, side, radius);
        const at = (x: number, y: number): number => field[y * side + x];
        assert.strictEqual(at(16, 16), 255);
        // texel 11 is one texel outside the edge, texel 12 the edge's own inked texel
        assert.isAbove(at(12, 16), 191);
        assert.isBelow(at(11, 16), 191);
        assert.isAbove(at(11, 16), at(10, 16));
        assert.strictEqual(at(0, 16), 0);
    });
});
