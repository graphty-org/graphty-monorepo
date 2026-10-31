import type { RichTextStyle, TextSegment } from "./RichTextLabel.ts";

/**
 * Parses rich text markup into styled text segments
 */
export class RichTextParser {
    private readonly defaultStyle: RichTextStyle;

    /**
     * Creates a new rich text parser
     * @param defaultStyle - Default text style to use as base
     */
    constructor(defaultStyle: RichTextStyle) {
        this.defaultStyle = defaultStyle;
    }

    /**
     * Parses rich text into an array of line segments
     * @param text - The text to parse (supports markup tags)
     * @param plainText - Draw every character as written, reading no markup.
     * @returns Array of text segments grouped by line
     */
    parse(text: string, plainText = false): TextSegment[][] {
        const whole = (line: string): TextSegment[] =>
            line === "" ? [] : [{ text: line, style: { ...this.defaultStyle } }];
        return text.split("\n").map((line) => (plainText ? whole(line) : this.parseLine(line)));
    }

    private parseLine(line: string): TextSegment[] {
        const segments: TextSegment[] = [];
        let currentPos = 0;

        const styleStack: RichTextStyle[] = [{ ...this.defaultStyle }];
        // A copy of the style in force. The stack never empties: a closing tag never pops the base.
        const top = (): RichTextStyle => ({ ...(styleStack.at(-1) ?? this.defaultStyle) });

        // `<lt>` draws a literal `<` (see escapeLabelMarkup); every other tag opens or closes a style.
        const tagRegex = /<(\/?)(bold|italic|color|size|font|bg|shift|lt)(?:='([^']*)')?>/g;
        let match;

        while ((match = tagRegex.exec(line)) !== null) {
            if (match.index > currentPos) {
                segments.push({
                    text: line.substring(currentPos, match.index),
                    style: top(),
                });
            }

            const isClosing = match[1] === "/";
            const tagName = match[2];

            if (tagName === "lt") {
                segments.push({ text: "<", style: top() });
                currentPos = match.index + match[0].length;
                continue;
            }
            const tagValue = match[3];

            if (isClosing) {
                if (styleStack.length > 1) {
                    styleStack.pop();
                }
            } else {
                const newStyle = top();
                this.applyTag(newStyle, tagName, tagValue);
                styleStack.push(newStyle);
            }

            currentPos = match.index + match[0].length;
        }

        if (currentPos < line.length) {
            segments.push({
                text: line.substring(currentPos),
                style: top(),
            });
        }

        return segments;
    }

    /**
     * Apply one opening tag to the style it opens in.
     * @param style - A copy of the style in force, changed in place.
     * @param tagName - The tag.
     * @param tagValue - Its value, when it has one.
     */
    private applyTag(style: RichTextStyle, tagName: string, tagValue: string | undefined): void {
        switch (tagName) {
            case "bold":
                style.weight = "bold";
                break;
            case "italic":
                style.style = "italic";
                break;
            case "color":
                style.color = tagValue || this.defaultStyle.color;
                break;
            case "size":
                style.size = this.sizeOf(style.size, tagValue);
                break;
            case "font":
                style.font = tagValue || this.defaultStyle.font;
                break;
            case "bg":
                style.background = tagValue || null;
                break;
            case "shift": {
                // how far down the run is drawn: in percent of the label's own size, or in its units
                const v = Number.parseFloat(tagValue ?? "");
                const by = tagValue?.endsWith("%") ? (this.defaultStyle.size * v) / 100 : v;
                style.shift = (style.shift ?? 0) + (Number.isFinite(by) ? by : 0);
                break;
            }
            default:
                break;
        }
    }

    /**
     * A size tag's size: in percent of the size it is opened in (a run of a label drawn larger than the rest), or
     * in points; the default size when it reads as none.
     * @param openedIn - The size in force where the tag opens.
     * @param tagValue - The tag's value.
     * @returns The size.
     */
    private sizeOf(openedIn: number, tagValue: string | undefined): number {
        if (tagValue?.endsWith("%")) {
            return (openedIn * Number.parseFloat(tagValue)) / 100 || this.defaultStyle.size;
        }
        return Number.parseInt(tagValue || "0") || this.defaultStyle.size;
    }

    /**
     * Measures the dimensions of parsed text content
     * @param parsedContent - The parsed text segments
     * @param ctx - Canvas rendering context for measurement
     * @param options - Measurement options
     * @param options.lineHeight - Line height multiplier
     * @param options.textOutline - Whether text outline is enabled
     * @param options.textOutlineWidth - Width of text outline
     * @param options.runAlign - Where runs of different sizes meet on a line
     * @returns Maximum width and total height of the text
     */
    measureText(
        parsedContent: TextSegment[][],
        ctx: CanvasRenderingContext2D,
        options: LineOptions,
    ): { maxWidth: number; totalHeight: number } {
        let maxWidth = 0;
        let totalHeight = 0;

        for (const lineSegments of parsedContent) {
            const line = measureLine(ctx, lineSegments, options);
            const lineWidth = line.width + (options.textOutline ? options.textOutlineWidth * 2 : 0);

            maxWidth = Math.max(maxWidth, lineWidth);
            totalHeight += line.lineBox;
        }

        return { maxWidth, totalHeight };
    }
}

/** How a label's runs of different sizes meet on a line: their alphabetic baselines, hanging baselines or middles. */
export type RunAlign = "baseline" | "hanging" | "middle";

/** How a line is laid out. */
export interface LineOptions {
    /** Line height multiplier. */
    lineHeight: number;
    /** Whether the text is outlined. */
    textOutline: boolean;
    /** How wide its outline is. */
    textOutlineWidth: number;
    /** Where runs of different sizes meet (`runAlign`); unset, on their alphabetic baselines. */
    runAlign?: RunAlign;
}

const FONT_BOX_REFERENCE = 1000;
const fontBoxes = new Map<string, readonly [number, number]>();

/** Forget every font box read so far: a web font that has just loaded measured as its fallback until now. */
export function forgetFontBoxes(): void {
    fontBoxes.clear();
}

/**
 * A font's ascent and descent at a size, the same with hinted and unhinted glyphs. Chromium reports the font box in whole pixels, rounded
 * differently with hinted glyphs and with unhinted ones (`textRendering = "geometricPrecision"`), so a 10 px
 * Verdana ascent read 10 or 9 and the label's baseline moved by up to a pixel. Read at 1000 px, scaled and rounded
 * to the nearest pixel (as Chromium rounds it for hinted glyphs), the box is the same whichever glyphs are drawn,
 * so a label keeps the whole-pixel height, and a node sized to its label the size, it had with hinted glyphs.
 * @param ctx - Canvas rendering context for measurement (its font is changed)
 * @param style - The run's style
 * @returns ascent and descent above and below the alphabetic baseline, in whole pixels at the style's size
 */
function fontBox(ctx: CanvasRenderingContext2D, style: TextSegment["style"]): readonly [number, number] {
    const key = `${style.style} ${style.weight} ${style.font}`;
    let box = fontBoxes.get(key);
    if (box === undefined) {
        ctx.font = `${style.style} ${style.weight} ${FONT_BOX_REFERENCE}px ${style.font}`;
        const m = ctx.measureText("");
        box = [m.fontBoundingBoxAscent || 0, m.fontBoundingBoxDescent || 0];
        fontBoxes.set(key, box);
    }
    return [
        Math.round((box[0] * style.size) / FONT_BOX_REFERENCE),
        Math.round((box[1] * style.size) / FONT_BOX_REFERENCE),
    ];
}

/**
 * Measures one line of segments from the font's own metrics.
 *
 * Each run sits on the line where `runAlign` says: its alphabetic baseline on the line's (the default), its hanging
 * baseline on the line's hanging baseline (vis-network's labels below a node, drawn with `textBaseline` hanging), or
 * its middle on the line's middle (its labels drawn with `textBaseline` middle), the line's own being its tallest
 * run's; then each run is moved down by its own `shift`. The line's ink height is the tallest ascent plus the deepest
 * descent over its runs as they sit, each the larger of the font box (`fontBoundingBoxAscent` /
 * `fontBoundingBoxDescent`) and the actual glyph box, plus the outline on both sides. The line box is that height
 * times `lineHeight`, and the extra leading is split evenly above and below, as CSS does. The label's panel height
 * and the renderer's line advance both come from here, so they cannot disagree.
 * @param ctx - Canvas rendering context for measurement
 * @param lineSegments - The segments of one line
 * @param options - Layout options
 * @returns The line's advance width, its line box height, the distance from the top of the line box to the
 * alphabetic baseline, how far below that baseline each run's own baseline is drawn, and the line's ascent and
 * descent (its ink above and below the baseline, without the outline)
 */
export function measureLine(
    ctx: CanvasRenderingContext2D,
    lineSegments: TextSegment[],
    options: LineOptions,
): { width: number; lineBox: number; baseline: number; offsets: number[]; ascent: number; descent: number } {
    let width = 0;
    let maxSize = 0;
    ctx.textBaseline = "alphabetic";
    const runs = lineSegments.map(({ text, style }) => {
        ctx.font = `${style.style} ${style.weight} ${style.size}px ${style.font}`;
        const metrics = ctx.measureText(text);
        width += metrics.width;
        maxSize = Math.max(maxSize, style.size);
        const [fontAscent, fontDescent] = fontBox(ctx, style);
        ctx.font = `${style.style} ${style.weight} ${style.size}px ${style.font}`;
        return {
            // The font box keeps every label in one font the same height whatever its letters; the
            // glyph box covers a face (a script font, say) whose ink overflows its own font box.
            ascent: Math.max(fontAscent, metrics.actualBoundingBoxAscent || 0),
            descent: Math.max(fontDescent, metrics.actualBoundingBoxDescent || 0),
            fontAscent,
            // a browser that reports no hanging baseline draws it at 80% of the ascent, as Chromium does
            hanging: Math.abs(metrics.hangingBaseline || 0) || 0.8 * fontAscent,
            middle: ((metrics.emHeightAscent || fontAscent) - (metrics.emHeightDescent || fontDescent)) / 2,
            shift: style.shift ?? 0,
        };
    });
    // the line's own baseline is its tallest run's
    const tallest = runs.reduce<(typeof runs)[number] | null>(
        (best, r) => (best === null || r.fontAscent > best.fontAscent ? r : best),
        null,
    );
    const offsets = runs.map((r) => {
        const along = (key: "hanging" | "middle"): number => (tallest === null ? 0 : tallest[key] - r[key]);
        const placed = { baseline: 0, hanging: -along("hanging"), middle: -along("middle") }[
            options.runAlign ?? "baseline"
        ];
        return placed + r.shift;
    });
    let ascent = 0;
    let descent = 0;
    runs.forEach((r, i) => {
        ascent = Math.max(ascent, r.ascent - offsets[i]);
        descent = Math.max(descent, r.descent + offsets[i]);
    });

    // A context that reports no vertical metrics at all: fall back to the em square.
    if (ascent + descent === 0) {
        ascent = maxSize;
    }

    const outline = options.textOutline ? options.textOutlineWidth : 0;
    const inkHeight = ascent + descent + outline * 2;
    const lineBox = inkHeight * options.lineHeight;

    return { width, lineBox, baseline: (lineBox - inkHeight) / 2 + outline + ascent, offsets, ascent, descent };
}

/** How a label's lines are fitted to its wrap width. */
export interface WrapOptions {
    /** Whether the spaces after a word must fit too (`wrapTrailingSpace`). */
    trailingSpace?: boolean;
    /** Cut a line that does not fit, with an ellipsis after it, in place of wrapping (`wrapEllipsis`). */
    ellipsis?: boolean;
    /** Break between any two letters, not only at spaces (`wrapAnywhere`). */
    anywhere?: boolean;
    /** How many blanks a blank counts as against the width (`wrapSpaceCount`); unset, one. */
    spaceCount?: number;
}

/** How wide a piece of text is in a style, in a canvas's pixels. */
type Measure = (text: string, style: TextSegment["style"]) => number;

/**
 * Break lines that run past a width at the spaces between their words, keeping each word's
 * style. A word wider than the width keeps a line of its own; a line that fits is kept as it is.
 * @param ctx - A canvas to measure on.
 * @param lines - The lines, each a list of styled segments.
 * @param width - The widest a line may be, in the canvas's pixels.
 * @param options - How the lines are fitted.
 * @returns The lines, wrapped.
 */
export function wrapLines(
    ctx: CanvasRenderingContext2D,
    lines: TextSegment[][],
    width: number,
    options: WrapOptions = {},
): TextSegment[][] {
    const measure: Measure = (text, style) => {
        ctx.font = `${style.style} ${style.weight} ${style.size}px ${style.font}`;
        return ctx.measureText(text).width;
    };
    return options.ellipsis === true
        ? lines.map((line) => ellipsize(line, width, measure))
        : lines.flatMap((line) => wrapLine(line, width, measure, options));
}

const ELLIPSIS = "\u2026";

/**
 * Cut a line wider than a width to the most letters that still fit with an ellipsis after them, as
 * Cytoscape.js's `text-wrap: ellipsis` does; a line narrower than the width is kept as it is.
 * @param line - The line's styled segments.
 * @param width - The widest it may be, in the canvas's pixels.
 * @param measure - How wide a piece of text is in a style.
 * @returns The line, cut.
 */
function ellipsize(line: TextSegment[], width: number, measure: Measure): TextSegment[] {
    if (line.reduce((sum, seg) => sum + measure(seg.text, seg.style), 0) < width) {
        return line;
    }
    const out: TextSegment[] = [];
    let used = 0;
    for (const seg of line) {
        let kept = "";
        for (const ch of seg.text) {
            if (used + measure(kept + ch, seg.style) + measure(ELLIPSIS, seg.style) > width) {
                pushKept(out, kept, seg.style);
                out.push({ text: ELLIPSIS, style: seg.style });
                return out;
            }
            kept += ch;
        }
        pushKept(out, kept, seg.style);
        used += measure(kept, seg.style);
    }
    // every letter fit beside an ellipsis: Cytoscape.js then draws none
    return out;
}

/**
 * Add a segment's kept letters to a line, when there are any.
 * @param out - The line.
 * @param text - The letters.
 * @param style - Their style.
 */
function pushKept(out: TextSegment[], text: string, style: TextSegment["style"]): void {
    if (text !== "") {
        out.push({ text, style });
    }
}

const SPACES = /^\s+$/;

/**
 * How wide the space after a word is: the spaces that follow it, or one space where the line ends
 * with it, as Cytoscape measures every word.
 * @param pieces - The line's words and spaces.
 * @param i - The word's place among them.
 * @param measure - How wide a piece of text is in a style.
 * @param anywhere - Whether the line breaks between any two letters, each followed by a zero-width break.
 * @returns The width.
 */
function spaceAfter(pieces: readonly TextSegment[], i: number, measure: Measure, anywhere: boolean): number {
    const next = pieces[i + 1];
    if (next !== undefined && SPACES.test(next.text)) {
        return measure(next.text, next.style);
    }
    // broken anywhere, a letter is followed by a zero-width break, as Cytoscape.js joins them
    return anywhere ? 0 : measure(" ", pieces[i].style);
}

/**
 * A line's words and the runs of spaces between them, each in its segment's style.
 * @param line - The line's styled segments.
 * @param anywhere - Whether the line breaks between any two letters: every letter is then a word of its own.
 * @returns The pieces, in order.
 */
function wordsAndSpaces(line: readonly TextSegment[], anywhere: boolean): TextSegment[] {
    return line.flatMap(({ text, style }) =>
        text
            .split(/(\s+)/)
            .filter((piece) => piece !== "")
            .flatMap((piece) => (anywhere && !SPACES.test(piece) ? Array.from(piece) : [piece]))
            .map((piece) => ({ text: piece, style })),
    );
}

/**
 * A broken line without the spaces left at its end, which are dropped.
 * @param pieces - The line's pieces, changed in place.
 * @returns The same line.
 */
function withoutTrailingSpaces(pieces: TextSegment[]): TextSegment[] {
    while (pieces.length > 0 && SPACES.test(pieces.at(-1)?.text ?? "")) {
        pieces.pop();
    }
    return pieces;
}

/**
 * Break one line at the spaces between its words.
 * @param line - The line's styled segments.
 * @param width - The widest a line may be, in the canvas's pixels.
 * @param measure - How wide a piece of text is in a style.
 * @param options - How the line is fitted: trailing spaces, breaks anywhere, what a blank counts as.
 * @returns The line, wrapped into one or more lines.
 */
function wrapLine(line: TextSegment[], width: number, measure: Measure, options: WrapOptions): TextSegment[][] {
    const anywhere = options.anywhere === true;
    // Measured with the space after each word, a line narrower than the width as a whole is still kept whole:
    // Cytoscape desktop (ding's LabelInfo) and Cytoscape.js both measure the whole line first and wrap only one
    // that does not fit ("Decanoic Acid", 98.95 wide at a width of 100, stays on one line).
    // ponytail: ding keeps it whole only for a one-line label; a label of several lines breaks each by its words
    if (options.trailingSpace === true && line.reduce((sum, seg) => sum + measure(seg.text, seg.style), 0) < width) {
        return [line];
    }
    const blanks = options.spaceCount ?? 1;
    const out: TextSegment[][] = [];
    let current: TextSegment[] = [];
    let used = 0;
    const pieces = wordsAndSpaces(line, anywhere);
    for (const [i, piece] of pieces.entries()) {
        const space = SPACES.test(piece.text);
        const span = measure(piece.text, piece.style) * (space ? blanks : 1);
        const after = options.trailingSpace === true && !space ? spaceAfter(pieces, i, measure, anywhere) : 0;
        if (!space && used > 0 && used + span + after > width) {
            out.push(withoutTrailingSpaces(current));
            current = [];
            used = 0;
        }

        if (!space || used > 0) {
            current.push(piece);
            used += span;
        }
    }

    out.push(current);
    return out;
}
