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

        const tagRegex = /<(\/?)(bold|italic|color|size|font|bg)(?:='([^']*)')?>/g;
        let match;

        while ((match = tagRegex.exec(line)) !== null) {
            if (match.index > currentPos) {
                segments.push({
                    text: line.substring(currentPos, match.index),
                    style: { ...styleStack[styleStack.length - 1] },
                });
            }

            const isClosing = match[1] === "/";
            const tagName = match[2];
            const tagValue = match[3];

            if (isClosing) {
                if (styleStack.length > 1) {
                    styleStack.pop();
                }
            } else {
                const newStyle = { ...styleStack[styleStack.length - 1] };

                switch (tagName) {
                    case "bold":
                        newStyle.weight = "bold";
                        break;
                    case "italic":
                        newStyle.style = "italic";
                        break;
                    case "color":
                        newStyle.color = tagValue || this.defaultStyle.color;
                        break;
                    case "size":
                        newStyle.size = Number.parseInt(tagValue || "0") || this.defaultStyle.size;
                        break;
                    case "font":
                        newStyle.font = tagValue || this.defaultStyle.font;
                        break;
                    case "bg":
                        newStyle.background = tagValue || null;
                        break;
                    default:
                        break;
                }

                styleStack.push(newStyle);
            }

            currentPos = match.index + match[0].length;
        }

        if (currentPos < line.length) {
            segments.push({
                text: line.substring(currentPos),
                style: { ...styleStack[styleStack.length - 1] },
            });
        }

        return segments;
    }

    /**
     * Measures the dimensions of parsed text content
     * @param parsedContent - The parsed text segments
     * @param ctx - Canvas rendering context for measurement
     * @param options - Measurement options
     * @param options.lineHeight - Line height multiplier
     * @param options.textOutline - Whether text outline is enabled
     * @param options.textOutlineWidth - Width of text outline
     * @returns Maximum width and total height of the text
     */
    measureText(
        parsedContent: TextSegment[][],
        ctx: CanvasRenderingContext2D,
        options: {
            lineHeight: number;
            textOutline: boolean;
            textOutlineWidth: number;
        },
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

/**
 * Measures one line of segments from the font's own metrics.
 *
 * The line's ink height is the tallest ascent plus the deepest descent over its segments, each
 * the larger of the font box (`fontBoundingBoxAscent` / `fontBoundingBoxDescent`) and the actual
 * glyph box, plus the outline on both sides. The line box is that height times `lineHeight`, and
 * the extra leading is split evenly above and below, as CSS does. The label's panel height and
 * the renderer's line advance both come from here, so they cannot disagree.
 * @param ctx - Canvas rendering context for measurement
 * @param lineSegments - The segments of one line
 * @param options - Layout options
 * @param options.lineHeight - Line height multiplier
 * @param options.textOutline - Whether text outline is enabled
 * @param options.textOutlineWidth - Width of text outline
 * @returns The line's advance width, its line box height, and the distance from the top of the
 * line box to the alphabetic baseline
 */
export function measureLine(
    ctx: CanvasRenderingContext2D,
    lineSegments: TextSegment[],
    options: { lineHeight: number; textOutline: boolean; textOutlineWidth: number },
): { width: number; lineBox: number; baseline: number } {
    let width = 0;
    let ascent = 0;
    let descent = 0;
    let maxSize = 0;

    for (const { text, style } of lineSegments) {
        ctx.font = `${style.style} ${style.weight} ${style.size}px ${style.font}`;
        const metrics = ctx.measureText(text);
        width += metrics.width;
        // The font box keeps every label in one font the same height whatever its letters; the
        // glyph box covers a face (a script font, say) whose ink overflows its own font box.
        ascent = Math.max(ascent, metrics.fontBoundingBoxAscent || 0, metrics.actualBoundingBoxAscent || 0);
        descent = Math.max(descent, metrics.fontBoundingBoxDescent || 0, metrics.actualBoundingBoxDescent || 0);
        maxSize = Math.max(maxSize, style.size);
    }

    // A context that reports no vertical metrics at all: fall back to the em square.
    if (ascent + descent === 0) {
        ascent = maxSize;
    }

    const outline = options.textOutline ? options.textOutlineWidth : 0;
    const inkHeight = ascent + descent + outline * 2;
    const lineBox = inkHeight * options.lineHeight;

    return { width, lineBox, baseline: (lineBox - inkHeight) / 2 + outline + ascent };
}

/**
 * Break lines that run past a width at the spaces between their words, keeping each word's
 * style. A word wider than the width keeps a line of its own; a line that fits is kept as it is.
 * @param ctx - A canvas to measure on.
 * @param lines - The lines, each a list of styled segments.
 * @param width - The widest a line may be, in the canvas's pixels.
 * @returns The lines, wrapped.
 */
export function wrapLines(ctx: CanvasRenderingContext2D, lines: TextSegment[][], width: number): TextSegment[][] {
    const measure = (text: string, style: TextSegment["style"]): number => {
        ctx.font = `${style.style} ${style.weight} ${style.size}px ${style.font}`;
        return ctx.measureText(text).width;
    };
    return lines.flatMap((line) => wrapLine(line, width, measure));
}

const SPACES = /^\s+$/;

/**
 * Break one line at the spaces between its words.
 * @param line - The line's styled segments.
 * @param width - The widest a line may be, in the canvas's pixels.
 * @param measure - How wide a piece of text is in a style.
 * @returns The line, wrapped into one or more lines.
 */
function wrapLine(
    line: TextSegment[],
    width: number,
    measure: (text: string, style: TextSegment["style"]) => number,
): TextSegment[][] {
    const out: TextSegment[][] = [];
    let current: TextSegment[] = [];
    let used = 0;
    const pieces = line.flatMap(({ text, style }) =>
        text
            .split(/(\s+)/)
            .filter((piece) => piece !== "")
            .map((piece) => ({ text: piece, style })),
    );
    for (const piece of pieces) {
        const space = SPACES.test(piece.text);
        const span = measure(piece.text, piece.style);
        if (!space && used > 0 && used + span > width) {
            // Spaces left at the end of a broken line are dropped.
            while (current.length > 0 && SPACES.test(current.at(-1)?.text ?? "")) {
                current.pop();
            }

            out.push(current);
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
