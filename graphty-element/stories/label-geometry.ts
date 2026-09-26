/**
 * @file Where a label sits and what shape the ink on it makes.
 *
 * WHY THIS IS SEPARATE FROM `assertions.ts`. The readings there answer "is a label drawn, and
 * what colour is it" -- one number and one palette per label, which is all eleven of the
 * surviving Label stories ever needed to ask. Seventeen more stories are about the label's
 * GEOMETRY: where it hangs relative to its node, how much empty margin surrounds the words,
 * whether the panel's corners are rounded off, whether a pointer sticks out of the bottom of it,
 * how far apart the lines sit, whether the whole thing is fading with distance or moving.
 * None of that is a colour, and none of it can be read from the style model -- the model agreed
 * with itself the entire time those seventeen were unreachable.
 *
 * EVERYTHING HERE IS READ FROM THE SCENE. The plane's own local position, its scale, its
 * material's alpha, and the pixels on its `DynamicTexture`. A label that is configured
 * beautifully and drawn at the default reads exactly like the default here, which is the failure
 * these exist to catch.
 */

import { type AbstractMesh, DynamicTexture, type Mesh, type StandardMaterial } from "@babylonjs/core";

import type { Drawn } from "./assertions";

/** Alpha at or below which a pixel counts as bare canvas rather than ink. */
const INK_ALPHA = 16;

/**
 * How many pixels into a corner to look, past the antialiased edge.
 *
 * ABSOLUTE RATHER THAN A FRACTION, and the difference decides the answer. A corner radius is a
 * radius in pixels, so on a label wide enough to hold a cat's name a few per cent of the width is
 * further in than the rounding ever reaches -- the sample lands inside the panel and a rounded
 * corner reads as a square one. Three pixels is outside any rounding and inside any square panel.
 */
const CORNER_INSET = 3;

/** How tall a band at the top or bottom of the texture counts as "the edge of the panel". */
const BAND = 0.08;

/** How far one channel may be from the colour asked for and still count as that colour. */
const COLOUR_TOLERANCE = 40;

/** Where ink starts and stops across a band of rows, as fractions of the texture's width. */
interface Run {
    readonly from: number;
    readonly to: number;
}

/** The box the drawn ink covers on a label's own texture, in pixels. */
interface InkBox {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly width: number;
    readonly height: number;
}

/** What one label is actually drawn as, beyond its colours. */
export interface LabelGeometry {
    /** The node the label belongs to. */
    readonly id: string;
    /** Whether a label plane is in the scene for this node at all. */
    readonly drawn: boolean;
    /**
     * Where the plane sits relative to its node's mesh, in world units.
     *
     * The plane is PARENTED to the node's mesh, so this is the offset the attach position and
     * the attach offset produce, with no camera or layout arithmetic in it.
     */
    readonly offset: readonly [number, number, number];
    /** What the plane is scaled to, which is what a pulse animation moves and nothing else does. */
    readonly scale: number;
    /** The material's alpha, which is what depth fading writes and nothing else does. */
    readonly alpha: number;
    /** The label texture's size, in pixels. */
    readonly texture: { readonly width: number; readonly height: number };
    /** The box the ink covers on it. */
    readonly ink: InkBox;
    /** How far the ink is inset from each edge of the texture, as a fraction of the texture. */
    readonly inset: {
        readonly top: number;
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
    };
    /** Where the ink's weight sits on the texture, as a fraction from the top-left corner. */
    readonly centroid: { readonly x: number; readonly y: number };
    /** Whether ink reaches into each of the four corners of the texture. */
    readonly corners: {
        readonly topLeft: boolean;
        readonly topRight: boolean;
        readonly bottomLeft: boolean;
        readonly bottomRight: boolean;
    };
    /**
     * Where the ink starts and stops across a band at the top, the middle and the bottom of the
     * texture, each as a fraction of the texture's width.
     *
     * A PANEL IS A RECTANGLE AND A POINTER IS NOT. A plain label's background fills its canvas,
     * so all three run from 0 to 1. A speech-bubble pointer is drawn in a band added below the
     * panel and it tapers, so the bottom band is a short run in the middle. And a line of text
     * pushed to the left starts at the margin whatever its length, where a centred one starts
     * further in the shorter it is.
     */
    readonly band: { readonly top: Run; readonly middle: Run; readonly bottom: Run };
    /** How wide each of those bands runs, as a fraction of the texture's width. */
    readonly spread: { readonly top: number; readonly middle: number; readonly bottom: number };
    /**
     * The mean colour of a narrow strip down each side of the texture, as `#rrggbb`.
     *
     * WHAT A GRADIENT LOOKS LIKE AND A FLAT FILL DOES NOT. A panel painted in one colour reads
     * the same on both sides; one painted as a gradient reads its two ends.
     */
    readonly sides: { readonly left: string; readonly right: string };
    /**
     * What share of the rows between the first and last inked row carry no ink at all.
     *
     * HOW FAR APART THE LINES SIT, measured rather than inferred. Three lines pushed apart by a
     * line height of 2 leave wide blank bands between them; the same three at 1 nearly touch.
     */
    readonly blankRows: number;
    /** Opaque pixels on the texture, which is the same reading `Drawn.labelInk` carries. */
    readonly pixels: number;
}

/** A label that is not on screen, so that a story can say so rather than crash reading it. */
const ABSENT: Omit<LabelGeometry, "id"> = {
    drawn: false,
    offset: [0, 0, 0],
    scale: 0,
    alpha: 0,
    texture: { width: 0, height: 0 },
    ink: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    inset: { top: 0, bottom: 0, left: 0, right: 0 },
    centroid: { x: 0, y: 0 },
    corners: { topLeft: false, topRight: false, bottomLeft: false, bottomRight: false },
    band: { top: { from: 0, to: 0 }, middle: { from: 0, to: 0 }, bottom: { from: 0, to: 0 } },
    spread: { top: 0, middle: 0, bottom: 0 },
    sides: { left: "#000000", right: "#000000" },
    blankRows: 0,
    pixels: -1,
};

/**
 * Read one label plane's texture and work out the shape of the ink on it.
 * @param plane - The label plane.
 * @returns Everything measurable about the ink, or null when there is no texture to read.
 */
function measure(
    plane: AbstractMesh,
    only: readonly [number, number, number] | null,
): Omit<LabelGeometry, "id" | "drawn" | "offset" | "scale" | "alpha"> | null {
    const texture = (plane.material as StandardMaterial | null)?.diffuseTexture;

    if (!(texture instanceof DynamicTexture)) {
        return null;
    }

    const { width, height } = texture.getSize();

    if (width === 0 || height === 0) {
        return null;
    }

    const image = texture.getContext().getImageData(0, 0, width, height);
    // WITH A COLOUR, ONLY THAT COLOUR COUNTS AS INK. A label with a background panel is opaque
    // from corner to corner, so "how far is the text inset from the edge" cannot be asked of the
    // alpha channel at all -- the panel answers first. Filtering to the text's own colour asks
    // about the letters, which is what a margin, an alignment and a line height move.
    const inked = (x: number, y: number): boolean => {
        const at = (y * width + x) * 4;

        if (image.data[at + 3] <= INK_ALPHA) {
            return false;
        }

        return (
            only === null ||
            (Math.abs(image.data[at] - only[0]) <= COLOUR_TOLERANCE &&
                Math.abs(image.data[at + 1] - only[1]) <= COLOUR_TOLERANCE &&
                Math.abs(image.data[at + 2] - only[2]) <= COLOUR_TOLERANCE)
        );
    };

    /**
     * The mean colour of one vertical strip of the texture, over its opaque pixels.
     * @param from - The first column.
     * @param to - One past the last column.
     * @returns That colour, as `#rrggbb`.
     */
    const strip = (from: number, to: number): string => {
        let red = 0;
        let green = 0;
        let blue = 0;
        let seen = 0;

        for (let y = 0; y < height; y++) {
            for (let x = Math.max(0, from); x < Math.min(width, to); x++) {
                const at = (y * width + x) * 4;

                if (image.data[at + 3] <= INK_ALPHA) {
                    continue;
                }

                red += image.data[at];
                green += image.data[at + 1];
                blue += image.data[at + 2];
                seen++;
            }
        }

        if (seen === 0) {
            return "#000000";
        }

        const channel = (total: number): string =>
            Math.round(total / seen)
                .toString(16)
                .padStart(2, "0");

        return `#${channel(red)}${channel(green)}${channel(blue)}`;
    };

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let pixels = 0;
    let sumX = 0;
    let sumY = 0;
    const perRow = new Int32Array(height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!inked(x, y)) {
                continue;
            }

            pixels++;
            perRow[y]++;
            sumX += x;
            sumY += y;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (pixels === 0) {
        return {
            texture: { width, height },
            ink: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
            inset: { top: 0, bottom: 0, left: 0, right: 0 },
            centroid: { x: 0, y: 0 },
            corners: { topLeft: false, topRight: false, bottomLeft: false, bottomRight: false },
            band: { top: { from: 0, to: 0 }, middle: { from: 0, to: 0 }, bottom: { from: 0, to: 0 } },
            spread: { top: 0, middle: 0, bottom: 0 },
            sides: { left: strip(0, Math.max(1, Math.round(width / 8))), right: strip(width - Math.max(1, Math.round(width / 8)), width) },
            blankRows: 0,
            pixels: 0,
        };
    }

    // How far ink runs across a band of rows, as a fraction of the texture's width. Measured from
    // the outermost inked pixel on either side rather than by counting, so that a tapering
    // pointer reads narrow even though it is solid where it is drawn.
    const runOver = (from: number, to: number): Run => {
        let left = width;
        let right = -1;

        for (let y = Math.max(0, from); y < Math.min(height, to); y++) {
            for (let x = 0; x < width; x++) {
                if (inked(x, y)) {
                    left = Math.min(left, x);
                    break;
                }
            }

            for (let x = width - 1; x >= 0; x--) {
                if (inked(x, y)) {
                    right = Math.max(right, x);
                    break;
                }
            }
        }

        return right < left ? { from: 0, to: 0 } : { from: left / width, to: (right + 1) / width };
    };

    const band = Math.max(1, Math.round(height * BAND));
    const inX = Math.min(CORNER_INSET, width - 1);
    const inY = Math.min(CORNER_INSET, height - 1);

    const runs = {
        top: runOver(0, band),
        middle: runOver(Math.round(height / 2) - band, Math.round(height / 2) + band),
        bottom: runOver(height - band, height),
    };

    let blank = 0;

    for (let y = minY; y <= maxY; y++) {
        if (perRow[y] === 0) {
            blank++;
        }
    }

    return {
        texture: { width, height },
        ink: { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
        inset: {
            top: minY / height,
            bottom: (height - 1 - maxY) / height,
            left: minX / width,
            right: (width - 1 - maxX) / width,
        },
        centroid: { x: sumX / pixels / width, y: sumY / pixels / height },
        corners: {
            topLeft: inked(inX, inY),
            topRight: inked(width - 1 - inX, inY),
            bottomLeft: inked(inX, height - 1 - inY),
            bottomRight: inked(width - 1 - inX, height - 1 - inY),
        },
        band: runs,
        spread: {
            top: runs.top.to - runs.top.from,
            middle: runs.middle.to - runs.middle.from,
            bottom: runs.bottom.to - runs.bottom.from,
        },
        sides: { left: strip(0, Math.max(1, Math.round(width / 8))), right: strip(width - Math.max(1, Math.round(width / 8)), width) },
        blankRows: maxY === minY ? 0 : blank / (maxY - minY + 1),
        pixels,
    };
}

/**
 * Read every label in the scene.
 * @param scene - What the story drew.
 * @param onlyColour - Count only pixels near this colour as ink, as `#rrggbb`. Pass the text
 *     colour to ask about the letters on a label that also has a background panel.
 * @returns One reading per node, in the order the graph holds them.
 */
export function labelGeometry(scene: Drawn, onlyColour?: string): readonly LabelGeometry[] {
    const only: readonly [number, number, number] | null =
        onlyColour === undefined
            ? null
            : [
                  Number.parseInt(onlyColour.slice(1, 3), 16),
                  Number.parseInt(onlyColour.slice(3, 5), 16),
                  Number.parseInt(onlyColour.slice(5, 7), 16),
              ];

    return scene.graph.getNodes().map((node) => {
        const plane = node.label?.labelMesh ?? null;

        if (plane === null || plane.isDisposed() || !plane.isEnabled()) {
            return { id: String(node.id), ...ABSENT };
        }

        const ink = measure(plane, only);

        if (ink === null) {
            return { id: String(node.id), ...ABSENT };
        }

        const material = plane.material as StandardMaterial | null;

        return {
            id: String(node.id),
            drawn: true,
            offset: [plane.position.x, plane.position.y, plane.position.z] as const,
            scale: plane.scaling.x,
            alpha: material?.alpha ?? 1,
            ...ink,
        };
    });
}

/**
 * How much empty space the renderer left above and below the words, in the label's own canvas
 * pixels -- the unit a `marginTop` or `marginBottom` is written in.
 *
 * WHY NOT READ THE INSET STRAIGHT OFF THE TEXTURE. The ink of a particular string does not fill
 * its line box: the renderer sizes the line from the font's own box, and the letters on a label
 * reach only part of it -- how much depends on the letters and on the typeface the machine falls
 * back to for a family name like "Verdana".
 *
 * WHAT THIS DOES INSTEAD. The browser that drew the label is asked how tall this text is in this
 * font (`measureText`), which turns the ink's height on the texture into the texture's scale;
 * dividing the inset by that scale and taking away the gap between the line box and the ink
 * leaves the margin itself. The line box is laid out the way `measureLine` in
 * `src/meshes/RichTextParser.ts` lays it out: the larger of the font box and the ink box, times
 * the line height, with the extra leading split evenly above and below.
 * @param label - One reading from {@link labelGeometry}, taken with the text colour.
 * @param text - The words on the label.
 * @param font - The CSS font the label is drawn in, such as `"normal 48px Verdana"`.
 * @param lineHeight - The label's line height multiplier.
 * @returns The margin above and below the words, in canvas pixels.
 */
export function drawnMargins(
    label: LabelGeometry,
    text: string,
    font: string,
    lineHeight: number,
): { readonly top: number; readonly bottom: number } {
    const context = document.createElement("canvas").getContext("2d");

    if (context === null || label.ink.height === 0) {
        return { top: 0, bottom: 0 };
    }

    context.font = font;
    context.textBaseline = "alphabetic";
    const metrics = context.measureText(text);
    const ascent = Math.max(metrics.fontBoundingBoxAscent, metrics.actualBoundingBoxAscent);
    const descent = Math.max(metrics.fontBoundingBoxDescent, metrics.actualBoundingBoxDescent);
    const lineBox = (ascent + descent) * lineHeight;
    const baseline = (lineBox - ascent - descent) / 2 + ascent;
    const scale = label.ink.height / (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
    const above = label.ink.minY;
    const below = label.texture.height - 1 - label.ink.maxY;

    return {
        top: above / scale - (baseline - metrics.actualBoundingBoxAscent),
        bottom: below / scale - (lineBox - baseline - metrics.actualBoundingBoxDescent),
    };
}

/**
 * Which of several texts a label's ink is, read in the font the browser actually drew.
 *
 * FONT-INDEPENDENT BY CONSTRUCTION, like {@link drawnMargins}: the widths come from this browser's
 * own `measureText`, so a machine that falls back to a different font measures the candidates in
 * that font too. The renderer sizes its canvas to the words plus the side margins and stretches it
 * to fill the texture, so each candidate predicts its own horizontal scale and, from it, how wide
 * its ink should be on the texture. The candidate whose prediction is nearest wins.
 * @param label - The label, as {@link labelGeometry} read it.
 * @param candidates - The texts it might be showing.
 * @param font - The CSS font the label is drawn in.
 * @param marginX - The label's left plus right margin, in canvas pixels.
 * @returns The best candidate and each candidate's relative error.
 */
export function drawnText(
    label: LabelGeometry,
    candidates: readonly string[],
    font: string,
    marginX: number,
): { readonly best: string; readonly errors: Readonly<Record<string, number>> } {
    const context = document.createElement("canvas").getContext("2d");
    const errors: Record<string, number> = {};

    if (context === null || label.ink.width === 0) {
        return { best: "", errors };
    }

    context.font = font;
    let best = "";
    for (const text of candidates) {
        const metrics = context.measureText(text);
        const scale = label.texture.width / (metrics.width + marginX);
        const predicted = (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * scale;
        errors[text] = Math.abs(label.ink.width - predicted) / predicted;
        if (best === "" || errors[text] < errors[best]) {
            best = text;
        }
    }

    return { best, errors };
}

/**
 * Watch one label's plane for a while and report how far it moved.
 *
 * FOR THE STORIES WHOSE SUBJECT IS MOTION. An animated label is the one case where a single
 * reading of the scene says nothing: a pulse is a scale that changes, and any one frame of it is
 * a still label at some scale. Two readings a few frames apart is the smallest honest test.
 * @param scene - What the story drew.
 * @param overMs - How long to watch for.
 * @returns The largest change in scale and in position any one label showed.
 */
export async function labelMotion(scene: Drawn, overMs = 400): Promise<{ scale: number; position: number }> {
    const planes = scene.graph
        .getNodes()
        .map((node) => node.label?.labelMesh ?? null)
        .filter((plane): plane is Mesh => plane !== null && !plane.isDisposed());

    const before = planes.map((plane) => ({
        scale: plane.scaling.x,
        position: [plane.position.x, plane.position.y, plane.position.z] as const,
    }));

    await new Promise((resolve) => setTimeout(resolve, overMs));

    let scale = 0;
    let position = 0;

    planes.forEach((plane, at) => {
        scale = Math.max(scale, Math.abs(plane.scaling.x - before[at].scale));
        position = Math.max(
            position,
            Math.hypot(
                plane.position.x - before[at].position[0],
                plane.position.y - before[at].position[1],
                plane.position.z - before[at].position[2],
            ),
        );
    });

    return { scale, position };
}

/**
 * Everything these readings can see about the labels, as one short string.
 *
 * WHY A STORY NEEDS THIS. `assertDistinctPicture` digests each node's shape, size, colour and the
 * amount of ink on its label, which separates most sibling stories from one another -- but a label
 * with a background panel is opaque from corner to corner, so its ink is its area and three
 * stories that paint the panel three different ways digest identically. Everything that tells them
 * apart is geometry: where the plane hangs, what the panel's sides average out to, whether its
 * corners are cut, how the ink is spread, whether it is faded or moving.
 * @param scene - What the story drew.
 * @returns The digest, to hand to `assertDistinctPicture` as its extra reading.
 */
export function labelDigest(scene: Drawn): string {
    return labelGeometry(scene)
        .map((label) =>
            [
                label.id,
                label.drawn ? "on" : "off",
                label.offset.map((at) => at.toFixed(2)).join("/"),
                label.scale.toFixed(2),
                label.alpha.toFixed(2),
                `${String(label.texture.width)}x${String(label.texture.height)}`,
                `${String(label.ink.width)}x${String(label.ink.height)}`,
                label.sides.left,
                label.sides.right,
                [label.corners.topLeft, label.corners.topRight, label.corners.bottomLeft, label.corners.bottomRight]
                    .map((at) => (at ? "1" : "0"))
                    .join(""),
                [label.spread.top, label.spread.middle, label.spread.bottom].map((at) => at.toFixed(2)).join("/"),
                label.blankRows.toFixed(2),
            ].join(":"),
        )
        .join("|");
}
