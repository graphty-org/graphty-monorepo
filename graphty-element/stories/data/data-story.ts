/**
 * What the Data stories share: a caption drawn above the canvas, the markup a consumer would
 * write to get the same picture (shown in the Code panel), and the check that a file was read
 * whole.
 *
 * The caption is on the canvas rather than in a per-story `docs.description` because the Docs
 * page renders only the first story, so a per-story description is shown nowhere; the caption is
 * seen by a reader and by the screenshot alike.
 */
import type { Decorator } from "@storybook/web-components-vite";

import { assertGraphLoaded, assertLayoutPlaced, drawn } from "../assertions";
import { waitForGraphSettled } from "../helpers";

/** How a caption is drawn: one strip above the canvas, legible at 1200 x 900. */
const CAPTION_STYLE = [
    "margin: 0",
    // The right padding keeps the text clear of the console button the preview draws in the corner.
    "padding: 10px 64px 10px 14px",
    "background: #1f2933",
    "color: #f5f7fa",
    "font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    "font-size: 15px",
    "line-height: 1.4",
].join("; ");

/** A caption: fixed text, or text written from the story's current args. */
export type Caption = string | ((args: Record<string, unknown>) => string);

/**
 * Draws `parameters.caption` above the story, when the story has one.
 * @param story - The story to wrap.
 * @param context - The story's context, whose parameters carry the caption.
 * @returns The story, captioned.
 */
export const captioned: Decorator = (story, context) => {
    const rendered = story();
    const caption = context.parameters.caption as Caption | undefined;
    const text = typeof caption === "function" ? caption(context.args) : caption;

    if (text === undefined || !(rendered instanceof Node)) {
        return rendered;
    }

    const strip = document.createElement("p");
    strip.className = "story-caption";
    strip.style.cssText = CAPTION_STYLE;
    strip.textContent = text;

    const container = document.createElement("div");
    container.append(strip, rendered);

    return container;
};

/**
 * The `<graphty-element>` markup a consumer writes to load a file of one format, for the Code
 * panel.
 * @param dataSource - The format id, as the `data-source` attribute takes it.
 * @param config - The `data-source-config` the consumer passes: usually `{ url }`.
 * @param attributes - Any other attributes the picture needs, such as a layout.
 * @returns The markup.
 */
export function elementSource(
    dataSource: string,
    config: Record<string, unknown>,
    attributes: Record<string, string> = {},
): string {
    const lines = [
        `<graphty-element`,
        `    data-source="${dataSource}"`,
        `    data-source-config='${JSON.stringify(config)}'`,
        ...Object.entries(attributes).map(([name, value]) => `    ${name}="${value}"`),
        `></graphty-element>`,
    ];

    return lines.join("\n");
}

/**
 * The parameters every Data story sets: its caption, and its consumer source.
 * @param caption - What the canvas shows and how to get it.
 * @param code - What a consumer writes.
 * @returns The parameters.
 */
export function readerText(caption: Caption, code: string): Record<string, unknown> {
    return { caption, docs: { source: { code, language: "html" } } };
}

/**
 * Checks that one importer produced the graph its own document declares.
 *
 * WHY THE NUMBERS ARE THE WHOLE POINT. Nothing here used to check them. `waitForDataLoaded`
 * resolves on a five-second timer with the comment "Data may already be loaded (e.g., inline
 * data) or failed", and the project-level check asks only whether any node arrived -- so a GraphML
 * fetch that returned three nodes of thirty-four, or a CSV importer that quietly dropped every row
 * with a quoted field, rendered a picture and passed. The importer's own report is read beside
 * them, because an edge whose endpoints the store would not take is a dropped row the counts alone
 * cannot always show.
 * @param canvasElement - Where the story was rendered.
 * @param story - Which importer this is, for the failure message.
 * @param nodes - The nodes the story's document declares.
 * @param edges - The edges it declares.
 * @param distinct - Whether every node must sit at its own place; false for a saved drawing that
 *     puts two nodes at one point.
 */
export async function imported(
    canvasElement: HTMLElement,
    story: string,
    nodes: number,
    edges: number,
    distinct = nodes > 1 && edges > 0,
): Promise<void> {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Data ${story}`);

    await assertGraphLoaded(scene, { nodes, edges });
    await assertLayoutPlaced(scene, { distinct });
}
