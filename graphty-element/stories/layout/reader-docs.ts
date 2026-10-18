/**
 * The reader-facing half of the Layout and Performance stories: a caption drawn above the canvas
 * and the markup a consumer writes to get the same picture.
 *
 * A story sets `parameters.caption` and `parameters.docs.source.code`; {@link captionDecorator}
 * on the meta draws the caption. Docs pages show only the primary story, so the caption is where
 * each story's own text is read, by readers and by the screenshot alike.
 * @module
 */

import type { Decorator } from "@storybook/web-components-vite";

/** How a reader caption is drawn: a strip above the canvas, readable at 1200 x 900. */
const CAPTION_STYLE = [
    "padding: 10px 14px",
    "background: #f1f5f9",
    "color: #1e293b",
    "border-bottom: 1px solid #cbd5e1",
    "font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    "font-size: 15px",
    "line-height: 1.4",
].join("; ");

/**
 * Draws the story's `parameters.caption` above whatever the story rendered.
 * @param story - The story, or the decorators inside this one.
 * @param context - The story context, whose parameters carry the caption.
 * @returns The story wrapped with its caption, or the story alone when it has none.
 */
export const captionDecorator: Decorator = (story, context) => {
    const rendered = story();
    const text = (context.parameters as { caption?: string }).caption;

    if (text === undefined || !(rendered instanceof Node)) {
        return rendered;
    }

    const caption = document.createElement("p");
    caption.className = "story-caption";
    caption.style.cssText = `margin: 0; ${CAPTION_STYLE}`;
    caption.textContent = text;

    const container = document.createElement("div");
    container.append(caption, rendered);

    return container;
};

/** Where the Les Miserables data most layout stories draw comes from, for captions. */
export const LES_MIS =
    "Data: Les Miserables character co-appearances (77 characters, 254 links), from D. E. Knuth's Stanford GraphBase.";

/** What a consumer writes for a story: the element's attributes, as the HTML tag carries them. */
export interface LayoutMarkup {
    /** The layout engine name. */
    layout: string;
    /** The layout's options, written as `layout-config`. */
    layoutConfig?: Record<string, unknown>;
    /** `"2d"` or `"3d"`. */
    viewMode?: "2d" | "3d";
    /** A JSON file to load, written as `data-source="json"`. */
    dataUrl?: string;
    /** Inline nodes, written as `node-data`. */
    nodes?: readonly unknown[];
    /** Inline edges, written as `edge-data`. */
    edges?: readonly unknown[];
    /** A comment above the tag, saying where the inline data came from. */
    note?: string;
}

/**
 * The HTML a consumer writes to get a layout story's picture.
 * @param markup - The attributes.
 * @returns The snippet for the Code panel.
 */
export function layoutSource(markup: LayoutMarkup): string {
    const lines = ['<script type="module">', '    import "@graphty/graphty-element";', "</script>", ""];

    if (markup.note !== undefined) {
        lines.push(`<!-- ${markup.note} -->`);
    }

    lines.push("<graphty-element");

    if (markup.dataUrl !== undefined) {
        lines.push('    data-source="json"', `    data-source-config='${JSON.stringify({ data: markup.dataUrl })}'`);
    }

    if (markup.nodes !== undefined) {
        lines.push(`    node-data='${JSON.stringify(markup.nodes)}'`);
    }

    if (markup.edges !== undefined) {
        lines.push(`    edge-data='${JSON.stringify(markup.edges)}'`);
    }

    if (markup.viewMode !== undefined) {
        lines.push(`    view-mode="${markup.viewMode}"`);
    }

    lines.push(`    layout="${markup.layout}"`);

    if (markup.layoutConfig !== undefined) {
        lines.push(`    layout-config='${JSON.stringify(markup.layoutConfig)}'`);
    }

    lines.push("></graphty-element>");

    return lines.join("\n");
}

/**
 * The `parameters` a layout story sets: its caption and its consumer source.
 * @param caption - What the canvas caption says.
 * @param markup - What the consumer writes.
 * @returns The parameters to spread into the story's own.
 */
export function readerDocs(
    caption: string,
    markup: LayoutMarkup,
): { caption: string; docs: { source: { code: string } } } {
    return { caption, docs: { source: { code: layoutSource(markup) } } };
}
