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
     * @returns Array of text segments grouped by line
     */
    parse(text: string): TextSegment[][] {
        const lines = text.split("\n");
        const parsedContent: TextSegment[][] = [];

        for (const line of lines) {
            const segments = this.parseLine(line);
            parsedContent.push(segments);
        }

        return parsedContent;
    }

    private parseLine(line: string): TextSegment[] {
        const segments: TextSegment[] = [];
        let currentPos = 0;

        const styleStack: RichTextStyle[] = [Object.assign({}, this.defaultStyle)];

        const tagRegex = /<(\/?)(bold|italic|color|size|font|bg)(?:='([^']*)')?>/g;
        let match;

        while ((match = tagRegex.exec(line)) !== null) {
            if (match.index > currentPos) {
                segments.push({
                    text: line.substring(currentPos, match.index),
                    style: Object.assign({}, styleStack[styleStack.length - 1]),
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
                const newStyle = Object.assign({}, styleStack[styleStack.length - 1]);

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
                        newStyle.size = parseInt(tagValue || "0") || this.defaultStyle.size;
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
                style: Object.assign({}, styleStack[styleStack.length - 1]),
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
