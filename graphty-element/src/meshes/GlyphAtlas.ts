/**
 * @file The glyph atlas behind `labelText: "glyphs"` (issue #3252, design/rendering/row-renderer.md
 * section 4.7): one signed-distance tile per glyph in one square texture, the rules that send a
 * label back to `RichTextLabel`, and where each glyph of a plain label goes.
 *
 * Rules kept here, each with its reason:
 * - One page, no eviction. A label with a glyph that does not fit is drawn by `RichTextLabel`.
 * - No mipmaps on the distance texture (the draw's job): they cost thin stems about 30% of their
 *   ink at 11 and 14 px.
 * - A glyph sits at `width(text through glyph) - width(glyph)`, which keeps the font's kerning.
 */

/** The atlas texture's side, in texels. */
export const ATLAS_SIZE = 4096;
/** The font size each glyph's distance field is drawn at, in pixels. */
export const SDF_FONT_PX = 56;
/** How far the distance field reaches past a glyph's ink, in texels. */
export const SDF_RADIUS = 12;
/** One tile's side: the font size and the field's reach on both sides. 51 x 51 = 2,601 tiles. */
export const GLYPH_TILE = SDF_FONT_PX + 2 * SDF_RADIUS;
/** The distance, as a fraction of the reach, that sits on a glyph's edge (texel value 191). */
const SDF_CUTOFF = 0.25;

/** Why a label's words cannot be drawn from the atlas; `RichTextLabel` draws that label. */
export type GlyphFallback = "right-to-left" | "complex-script" | "emoji" | "combining-mark" | "ligature" | "atlas-full";

// Scripts written right to left: their order and their joining need a shaping engine.
const RIGHT_TO_LEFT =
    /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}\p{Script=Mende_Kikakui}]/u;
// Indic and the other Brahmic scripts: conjuncts and reordered vowel signs need shaping.
const COMPLEX_SCRIPT =
    /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Thai}\p{Script=Lao}\p{Script=Tibetan}\p{Script=Myanmar}\p{Script=Khmer}]/u;
// Pictographs, flags (regional indicators), joiners and the emoji variation selector.
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️/u;
// A mark sits on the glyph before it at a place only the font's positioning table knows.
const COMBINING_MARK = /\p{M}/u;

/**
 * Which rule sends these words to `RichTextLabel`, judged from the words alone.
 * @param text - A label's words.
 * @returns The rule, or null when the atlas can draw them.
 */
export function scriptFallback(text: string): GlyphFallback | null {
    if (RIGHT_TO_LEFT.test(text)) {
        return "right-to-left";
    }
    if (COMPLEX_SCRIPT.test(text)) {
        return "complex-script";
    }
    if (EMOJI.test(text)) {
        return "emoji";
    }
    if (COMBINING_MARK.test(text)) {
        return "combining-mark";
    }
    return null;
}

/** One glyph of a placed line: its character and its left edge, in the measuring font's pixels. */
export interface PlacedGlyph {
    readonly glyph: string;
    readonly x: number;
}

/**
 * Where each inked glyph of one line goes. A glyph sits at the width of the text through it less
 * its own width, so kerning between it and the glyph before it is kept. A glyph whose advance is
 * under half its own width was merged into a ligature with the one before: the font shapes these
 * words, so they are not placed.
 * @param text - One line of a label, in one style.
 * @param measure - The width of a string in the label's font (Canvas `measureText(...).width`).
 * @returns The inked glyphs, left to right, or "ligature".
 */
export function placeGlyphs(text: string, measure: (s: string) => number): PlacedGlyph[] | "ligature" {
    const placed: PlacedGlyph[] = [];
    let through = "";
    let before = 0;
    for (const glyph of text) {
        through += glyph;
        const end = measure(through);
        const own = measure(glyph);
        if (own > 0 && end - before < own / 2) {
            return "ligature";
        }
        if (glyph.trim() !== "") {
            placed.push({ glyph, x: end - own });
        }
        before = end;
    }
    return placed;
}

/** Where one glyph's tile sits in the atlas, in texels from the top left. */
export interface GlyphTile {
    readonly index: number;
    readonly x: number;
    readonly y: number;
}

/**
 * The atlas's tiles: one page of `size` x `size` texels cut into `tile`-sided squares, filled in
 * order and never evicted. `pixels` holds the distance fields, one byte per texel, row by row.
 */
export class GlyphAtlas {
    private readonly tiles = new Map<string, GlyphTile>();
    private readonly perRow: number;
    /** How many tiles the page holds. */
    readonly capacity: number;
    /** The distance fields, one byte per texel; allocated with the first tile. */
    private texels: Uint8Array | null = null;
    /** Bumped by every tile added, so the draw uploads the page only when it changed. */
    version = 0;

    /**
     * Cut one page into tiles.
     * @param size - The page's side, in texels.
     * @param tile - One tile's side, in texels.
     */
    constructor(
        readonly size = ATLAS_SIZE,
        readonly tile = GLYPH_TILE,
    ) {
        this.perRow = Math.floor(size / tile);
        this.capacity = this.perRow * this.perRow;
    }

    /**
     * The page's texels.
     * @returns One byte per texel, or null before the first tile.
     */
    get pixels(): Uint8Array | null {
        return this.texels;
    }

    /**
     * How many tiles are in use.
     * @returns The count.
     */
    get used(): number {
        return this.tiles.size;
    }

    /**
     * The tile of a glyph already in the atlas.
     * @param key - The glyph and its font, as {@link glyphKey} spells them.
     * @returns The tile, or undefined.
     */
    find(key: string): GlyphTile | undefined {
        return this.tiles.get(key);
    }

    /**
     * The tile of a glyph, drawing its distance field into the next free tile the first time.
     * @param key - The glyph and its font, as {@link glyphKey} spells them.
     * @param draw - Writes the glyph's coverage (0-255, `tile` x `tile`, row by row); called once.
     * @returns The tile, or null when the page is full.
     */
    add(key: string, draw: () => Uint8ClampedArray | Uint8Array): GlyphTile | null {
        const known = this.tiles.get(key);
        if (known !== undefined) {
            return known;
        }
        const index = this.tiles.size;
        if (index >= this.capacity) {
            return null;
        }
        const tile: GlyphTile = {
            index,
            x: (index % this.perRow) * this.tile,
            y: Math.floor(index / this.perRow) * this.tile,
        };
        this.texels ??= new Uint8Array(this.size * this.size);
        const field = distanceField(draw(), this.tile, SDF_RADIUS);
        for (let row = 0; row < this.tile; row++) {
            this.texels.set(
                field.subarray(row * this.tile, (row + 1) * this.tile),
                (tile.y + row) * this.size + tile.x,
            );
        }
        this.tiles.set(key, tile);
        this.version++;
        return tile;
    }

    /**
     * Whether every glyph of these words has a tile, or still fits: the label falls back as a
     * whole rather than drawing some of its glyphs.
     * @param keys - The keys of a label's inked glyphs.
     * @returns True when all of them have or can get a tile.
     */
    fits(keys: readonly string[]): boolean {
        const fresh = new Set(keys.filter((k) => !this.tiles.has(k)));
        return this.tiles.size + fresh.size <= this.capacity;
    }
}

/**
 * The atlas key of one glyph in one font.
 * @param glyph - One code point.
 * @param font - The Canvas font family, style and weight the glyph is drawn in.
 * @returns The key.
 */
export function glyphKey(glyph: string, font: string): string {
    return `${font}\u0000${glyph}`;
}

const INF = 1e20;

/**
 * A signed distance field from a glyph's coverage: 255 deep inside, 191 on the edge, falling to 0
 * at `radius` texels outside (Felzenszwalb and Huttenlocher's exact squared distance transform,
 * run once for the inside and once for the outside).
 * @param coverage - The glyph's ink, 0-255, `side` x `side`, row by row.
 * @param side - The square's side, in texels.
 * @param radius - How far the field reaches, in texels.
 * @returns The field, one byte per texel.
 */
export function distanceField(coverage: Uint8ClampedArray | Uint8Array, side: number, radius: number): Uint8Array {
    const n = side * side;
    const outer = new Float64Array(n);
    const inner = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const a = coverage[i] / 255;
        if (a >= 1) {
            outer[i] = 0;
            inner[i] = INF;
        } else if (a <= 0) {
            outer[i] = INF;
            inner[i] = 0;
        } else {
            // an edge texel: place the edge inside it by its coverage
            const d = 0.5 - a;
            outer[i] = d > 0 ? d * d : 0;
            inner[i] = d < 0 ? d * d : 0;
        }
    }
    transform2d(outer, side);
    transform2d(inner, side);
    const field = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
        field[i] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / radius + SDF_CUTOFF))));
    }
    return field;
}

function transform2d(grid: Float64Array, side: number): void {
    const f = new Float64Array(side);
    const z = new Float64Array(side + 1);
    const v = new Uint16Array(side);
    for (let x = 0; x < side; x++) {
        transform1d(grid, x, side, side, f, v, z);
    }
    for (let y = 0; y < side; y++) {
        transform1d(grid, y * side, 1, side, f, v, z);
    }
}

// Lower envelope of parabolas along one row or column (Felzenszwalb and Huttenlocher, 2012).
function transform1d(
    grid: Float64Array,
    offset: number,
    stride: number,
    length: number,
    f: Float64Array,
    v: Uint16Array,
    z: Float64Array,
): void {
    for (let q = 0; q < length; q++) {
        f[q] = grid[offset + q * stride];
    }
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    let k = 0;
    for (let q = 1; q < length; q++) {
        let s: number;
        do {
            const r = v[k];
            s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
        } while (s <= z[k] && --k > -1);
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
        while (z[k + 1] < q) {
            k++;
        }
        const r = v[k];
        grid[offset + q * stride] = f[r] + (q - r) * (q - r);
    }
}
