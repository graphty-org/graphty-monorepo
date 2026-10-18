// Import algorithms to trigger side-effect registration
import "../../src/algorithms";

import type { Decorator, Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import type { LegendBlock } from "../../src/session/styles/legend";
import {
    assertAlgorithmPainted,
    assertDistinctPicture,
    assertDrawnVariety,
    assertEdgeVariety,
    assertGraphLoaded,
    type Drawn,
    drawn,
    holds,
    renderedElement,
} from "../assertions";
import { catSocialNetwork2Url } from "../datasets";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";

export type Story = StoryObj<StoryArgs>;

/**
 * Base meta configuration for algorithm stories (without title)
 * Each story file should spread this and add the title property
 */
export const algorithmMetaBase: Omit<Meta, "title"> = {
    component: "graphty-element",
    // REQUIRED, not decoration. `setup` is a convention understood by exactly one function --
    // `renderFn`, which turns it into element properties and style layers -- and it is not an
    // element property. Storybook's default web-components renderer assigns every arg as a
    // property, so without this line `element.setup = {...}` lands on the element and is ignored:
    // no algorithm runs, no layer is added, and the layout runs with the element's default of
    // zero pre-steps, which is an unsettled physics layout and a different picture every frame.
    // The argument this replaced -- `styleTemplate` -- WAS a real element property, which is why
    // these stories worked before the migration with no render function at all.
    render: renderFn,
    // The caption and legend wrap the element from the outside, so the event decorator, which
    // finds the element anywhere under what it is handed, still sees it.
    decorators: [eventWaitingDecorator, (story, context) => captionAndLegend(story, context)],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: catSocialNetwork2Url,
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for ngraph physics layout
        }),
    },
};

/**
 * Helper function for algorithm stories
 * Creates a story that runs an algorithm and applies its suggested styles
 *
 * `readerLayers` are the story's OWN layers, sitting beneath the algorithm's. Muting what an
 * algorithm did not select is a reader's choice and must not ship in suggestedStyles -- see
 * CLAUDE.md "### Algorithm Styles" -- so a story that wants the rest dimmed asks for it here.
 *
 * ORDER IS EVERYTHING HERE. The reader's layers are added first and the algorithm's suggestion
 * after them, because a layer later in the stack paints over a layer earlier in it -- so a story
 * that dims every edge and then runs a route algorithm shows the route over the dimmed rest,
 * which is the picture it is asking for.
 */
interface AlgorithmStoryExpectations {
    /** The nodes the story's data declares, when it is not the cat network's twenty. */
    readonly nodes?: number;
    /** The edges the story's data declares, when it is not the cat network's twenty-nine. */
    readonly edges?: number;
    /** Which drawn property the algorithm's picture varies, when it varies one. */
    readonly varies?: "hex" | "radius";
    /** How many different values of it the picture must hold. */
    readonly atLeast?: number;
    /** Which kind of element this algorithm's own layer paints: a route and a tree paint edges. */
    readonly paints?: "node" | "edge" | "either";
    /** How many of them it must paint. */
    readonly paintsAtLeast?: number;
    /** How many different edge appearances the picture must hold, for a story that dims the rest. */
    readonly edgeVariety?: number;
    /**
     * Whether this story's picture must differ from its siblings'.
     *
     * False for a pair that draws the same picture BY DEFINITION: Kruskal and Prim compute the
     * same minimum spanning tree of the same graph, so two identical pictures there is the
     * correct answer rather than two stories that have collapsed onto each other.
     */
    readonly distinct?: boolean;
    /** The reader's own layers, beneath the algorithm's. */
    readonly readerLayers?: readonly LayerSpec[];
    /**
     * Size the nodes by the run as well as colour them, over this node size range.
     *
     * A node metric suggests a colour and no size, so a story that wants both asks for it the way
     * a consumer does: `{ algorithm, style: { size: [min, max] } }` in the load-time list.
     */
    readonly size?: readonly [min: number, max: number];
}

export const createAlgorithmStory = (
    algorithmId: string,
    expectations: AlgorithmStoryExpectations | readonly LayerSpec[] = {},
): Story => {
    const asked: AlgorithmStoryExpectations = Array.isArray(expectations)
        ? { readerLayers: expectations as readonly LayerSpec[] }
        : (expectations as AlgorithmStoryExpectations);
    const { readerLayers, size } = asked;

    return {
        args: {
            setup: storySetup({
                algorithms: [size === undefined ? algorithmId : { algorithm: algorithmId, style: { size } }],
                preSteps: 8000, // Extra preSteps for ngraph physics layout
            }),
            runAlgorithmsOnLoad: true,
        },
        play: async ({ canvasElement }) => {
            // Wait for the graph to fully settle before applying algorithm styles
            await waitForGraphSettled(canvasElement);

            // Get the graphty-element
            const { graph, session } = await renderedElement(
                canvasElement,
                `${algorithmId}: the story rendered no <graphty-element> at all`,
            );

            // The reader's layers go in first, so the algorithm's layer paints over them.
            for (const layer of readerLayers ?? []) {
                await session.styles.add(layer);
            }

            // ASSERTED, NOT DISCARDED. Graph.applySuggestedStyles returns false when no finished
            // run of this algorithm has anything per element to paint -- which is to say, when
            // this story is a picture of the element's own defaults with no algorithm in it. All
            // twenty-seven of these stories called it as a bare statement and passed either way.
            // A run started with `style: { size }` suggests its size as well as its colour, so
            // this puts both back on top of the reader's layers.
            const applied = graph.applySuggestedStyles(algorithmId);

            await holds(
                applied,
                `${algorithmId}: applySuggestedStyles returned false, so no finished run of this algorithm ` +
                    "had anything to paint and this story is a picture of the element's defaults",
            );

            const scene = await drawn(canvasElement, `Algorithms ${algorithmId}`);

            await assertGraphLoaded(scene, { nodes: asked.nodes ?? 20, edges: asked.edges ?? 29 });
            await assertAlgorithmPainted(scene, algorithmId, {
                paints: asked.paints,
                atLeast: asked.paintsAtLeast,
            });

            if (asked.varies !== undefined) {
                await assertDrawnVariety(scene, asked.varies, asked.atLeast ?? 3);
            }

            if (size !== undefined) {
                await assertSizedBy(scene, algorithmKey(algorithmId), size);
            }

            if (asked.edgeVariety !== undefined) {
                await assertEdgeVariety(scene, asked.edgeVariety);
            }

            if (asked.distinct !== false) {
                await assertDistinctPicture(scene, "Algorithms");
            }
        },
    };
};

/**
 * The catalogue key a `namespace:type` story address names, such as "hits" for "graphty:hits".
 * @param algorithmId - The story's address.
 * @returns The key `session.runs.start` takes.
 */
function algorithmKey(algorithmId: string): string {
    return algorithmId.replace(/^graphty:/, "");
}

/**
 * The nodes are drawn at a range of sizes set by one run, read off the meshes the renderer draws.
 *
 * At least four distinct sizes, the node the run ranks first drawn the largest, and the largest
 * about `max / min` times the smallest -- so a size layer the style model holds and the renderer
 * never applies fails here, and so does a size that follows some other field.
 * @param scene - What the story drew.
 * @param algorithm - The catalogue key of the run the sizes follow, such as "pagerank".
 * @param range - The node size range the story asked for.
 */
export async function assertSizedBy(
    scene: Drawn,
    algorithm: string,
    range: readonly [min: number, max: number],
): Promise<void> {
    const run = scene.session.runs
        .list()
        .find((entry) => entry.algorithm === algorithm && entry.status === "succeeded");
    const top = run?.result?.ranking("value", 1)[0];

    await holds(top !== undefined, `${scene.story}: no ${algorithm} run succeeded, so nothing sizes the nodes`);
    await assertDrawnVariety(scene, "radius", 4);

    const radii = scene.nodes.map((node) => node.radius);
    const largest = Math.max(...radii);
    const smallest = Math.min(...radii);
    const topNode = scene.nodes.find((node) => node.id === String(top?.id));

    await holds(
        topNode?.radius === largest,
        `${scene.story}: ${algorithm} ranks ${String(top?.id)} first, which is drawn at radius ` +
            `${String(topNode?.radius)} while the largest node is ${String(largest)}`,
    );
    await holds(
        largest / smallest >= 0.9 * (range[1] / range[0]),
        `${scene.story}: asked for sizes ${String(range[0])} to ${String(range[1])} and the largest node is ` +
            `only ${(largest / smallest).toFixed(2)} times the smallest`,
    );
}

/** What a reader is told about one algorithm story. */
export interface StoryDoc {
    /** One or two sentences drawn above the canvas: what the picture shows and how to get it. */
    readonly caption: string;
    /** The page a consumer writes to get the same picture, shown in the Code panel. */
    readonly code: string;
}

/**
 * Give a story its caption and the consumer code that draws the same picture.
 *
 * A display name is NOT taken here: Storybook reads a story's `name` off the source without running
 * it, so it has to be written in the exported object itself, as `{ name: "...", ...documented() }`.
 *
 * The Docs page shows only the first story of a file, so a story's own reader text is its
 * caption, drawn above the canvas where both a reader and the screenshot see it. The code goes in
 * `docs.source.code`, so the Code panel shows the markup a consumer writes rather than this
 * package's render function.
 * @param story - The story.
 * @param doc - Its caption and consumer code.
 * @returns The story, documented.
 */
export function documented(story: Story, doc: StoryDoc): Story {
    return {
        ...story,
        parameters: {
            ...story.parameters,
            caption: doc.caption,
            docs: { ...story.parameters?.docs, source: { code: doc.code, language: "html" } },
        },
    };
}

/** The dataset most of these stories draw, named the way a caption names it. */
export const CAT_NETWORK = "a small made-up social network of 20 neighborhood cats and 29 friendships";

/** The layout and data lines every cat-network page shares. */
const CAT_NETWORK_SETUP = [
    '    graph.layout = "ngraph";',
    "    graph.layoutConfig = { seed: 42 };",
    '    graph.dataSource = "json";',
    '    graph.dataSourceConfig = { data: "https://example.com/cat-social-network.json" };',
];

/**
 * The page a consumer writes to run algorithms on the cat network once it loads.
 *
 * The element applies each run's suggested style itself, so the list and the switch are all it
 * takes.
 * @param algorithmsOnLoad - The `algorithmsOnLoad` value, written as source.
 * @param before - Lines that go before the data, such as a layer of the reader's own.
 * @returns The page.
 */
export function onLoadSource(algorithmsOnLoad: string, before: readonly string[] = []): string {
    return page([
        ...before,
        `    graph.algorithmsOnLoad = ${algorithmsOnLoad};`,
        "    graph.runAlgorithmsOnLoad = true;",
        ...CAT_NETWORK_SETUP,
    ]);
}

/**
 * The page a consumer writes to load the cat network and then run something with the session.
 * @param after - The lines that run once the graph has settled.
 * @returns The page.
 */
export function afterLoadSource(after: readonly string[]): string {
    return page([
        ...CAT_NETWORK_SETUP,
        "",
        '    graph.addEventListener("graph-settled", async () => {',
        "        const { session } = graph;",
        ...after.map((line) => (line === "" ? "" : `        ${line}`)),
        "    }, { once: true });",
    ]);
}

/**
 * One self-contained HTML page around a script body.
 * @param body - The script's lines, indented four spaces.
 * @returns The page.
 */
export function page(body: readonly string[]): string {
    return [
        '<graphty-element id="graph"></graphty-element>',
        "",
        '<script type="module">',
        '    import "@graphty/graphty-element";',
        "",
        '    const graph = document.getElementById("graph");',
        ...body,
        "</script>",
    ].join("\n");
}

/** How the caption strip is drawn: legible at the 1200-wide capture. */
const CAPTION_STYLE = [
    "margin: 0",
    "padding: 10px 14px",
    "background: #f4f5f7",
    "color: #1f2933",
    "font: 15px/1.4 system-ui, sans-serif",
    "border-bottom: 1px solid #d9dde3",
].join("; ");

/** How the legend card is drawn: over the canvas's top-right corner. */
const LEGEND_STYLE = [
    "position: absolute",
    "top: 12px",
    "right: 12px",
    "max-width: 300px",
    "padding: 10px 12px",
    "background: rgba(255, 255, 255, 0.94)",
    "color: #1f2933",
    "border: 1px solid #d9dde3",
    "border-radius: 6px",
    "font: 13px/1.35 system-ui, sans-serif",
    "pointer-events: none",
].join("; ");

/**
 * A number short enough for a legend: three significant figures.
 * @param value - The number.
 * @returns Its text.
 */
function short(value: number): string {
    return Math.abs(value) < 1e-9 ? "0" : String(Number(value.toPrecision(3)));
}

/**
 * "node.color" as "Node color", "edge.arrowHeadSize" as "Edge arrow head size".
 * @param channel - The channel.
 * @returns Its words.
 */
function channelWords(channel: string): string {
    const words = channel
        .replace(".", " ")
        .replaceAll(/([A-Z])/g, " $1")
        .toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The text of one row of a list legend.
 * @param block - The block the row is in.
 * @param value - The swatch's value.
 * @param role - The swatch's role, "other" for the row that gathers what the palette ran out for.
 * @returns The row's text.
 */
function rowText(block: LegendBlock, value: unknown, role: string | undefined): string {
    if (role === "other") {
        return `other (${String(Array.isArray(value) ? value.length : "")} groups)`;
    }

    const text = String(value);

    // A bare number names a group or a level, so say which: "group 2", "level 0".
    return /^\d+$/.test(text) ? `${block.field?.technicalName ?? "value"} ${text}` : text;
}

/**
 * Build one legend element from the element's own legend blocks.
 *
 * This is presentation, so it lives here and not in the element: the element answers
 * `session.styles.legend()` with neutral facts and a page draws them however it likes.
 * @param graph - The element.
 * @returns The legend's rows as HTML, or "" when nothing is painted from the data.
 */
function legendHtml(graph: Graphty): string {
    const { styles } = graph.session;
    const seen = new Set<string>();
    const rows: string[] = [];
    // A fixed-paint row after a section gets a gap, so it does not read as one of that section's rows.
    let afterSection = false;
    const escape = (text: string): string =>
        text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const chip = (color: string): string =>
        `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;` +
        `vertical-align:-1px;border:1px solid rgba(0,0,0,0.2);background:${color}"></span>`;

    // The element lists the stack bottom first; a legend reads the winning layer first.
    for (const block of [...styles.legend()].reverse()) {
        // A block a layer above covers completely shows nowhere on the canvas, and an arrow head
        // follows its line, so neither gets a row of its own.
        if (block.facts.some((fact) => fact.code === "legend.painted-over") || block.channel.includes("arrowHead")) {
            continue;
        }

        const colored = block.swatches.some((swatch) => swatch.color !== undefined);
        const target = block.channel.split(".")[0];

        if (block.kind === "literal" || block.kind === "highlight") {
            // A fixed paint says "these are the ones": one row per layer and color, named after
            // the layer. A fixed width beside it adds nothing a reader needs.
            const color = block.swatches[0]?.color;
            const name = (styles.get(block.layerId)?.name ?? block.layerId).replace(/ \((nodes|edges)\)$/, "");
            const key = `literal|${name}|${String(color)}`;

            if (color !== undefined && !seen.has(key)) {
                seen.add(key);
                rows.push(`<div${afterSection ? ' style="margin-top:6px"' : ""}>${chip(color)}${escape(name)}</div>`);
                afterSection = false;
            }

            continue;
        }

        if (!colored && block.swatches.every((swatch) => swatch.size === undefined)) {
            continue; // labels and other non-visual channels
        }

        const key = `${target}|${block.field?.path ?? block.layerId}|${colored ? "color" : "size"}`;

        if (seen.has(key)) {
            continue; // a second channel reading the same field the same way
        }

        seen.add(key);
        afterSection = true;

        const technical = block.field?.technicalName ?? "value";
        const named = technical.charAt(0).toUpperCase() + technical.slice(1);
        const heading = `<div style="font-weight:600;margin-top:6px">${escape(
            `${channelWords(colored ? `${target}.color` : block.channel)}: ${named}`,
        )}</div>`;

        if (block.kind === "categorical") {
            rows.push(heading);

            // Levels and numbered groups read in number order; everything else keeps the element's.
            const order = (swatch: (typeof block.swatches)[number]): number =>
                swatch.role === "other" ? Number.POSITIVE_INFINITY : Number(swatch.value);
            const numbered = block.swatches.every(
                (swatch) => swatch.role === "other" || typeof swatch.value === "number",
            );
            const swatches = numbered ? [...block.swatches].sort((a, b) => order(a) - order(b)) : block.swatches;

            for (const swatch of swatches) {
                if (swatch.color !== undefined && swatch.hidden !== true) {
                    rows.push(`<div>${chip(swatch.color)}${escape(rowText(block, swatch.value, swatch.role))}</div>`);
                }
            }

            continue;
        }

        const min = block.domain === undefined ? "" : short(block.domain.min);
        const max = block.domain === undefined ? "" : short(block.domain.max);

        if (colored) {
            const colors = block.swatches.flatMap((swatch) => (swatch.color === undefined ? [] : [swatch.color]));
            rows.push(
                heading,
                `<div style="height:12px;border-radius:3px;margin:3px 0;background:linear-gradient(to right, ${colors.join(", ")})"></div>`,
                `<div style="display:flex;justify-content:space-between"><span>${min}</span><span>${max}</span></div>`,
            );
        } else {
            const word = target === "edge" ? "thinnest" : "smallest";
            const big = target === "edge" ? "widest" : "largest";
            rows.push(heading, `<div>${word} ${min}, ${big} ${max}</div>`);
        }
    }

    return rows.length === 0 ? "" : `<div style="font-weight:700;margin-bottom:2px">Legend</div>${rows.join("")}`;
}

/**
 * Wrap a story's element in a caption strip above it and a legend over its top-right corner.
 *
 * The legend is read from `session.styles.legend()` every time the style stack changes, so it
 * shows exactly what the canvas paints, whichever layers the story or the reader adds.
 * @param story - The story.
 * @param context - Its context, whose parameters carry the caption.
 * @returns The wrapped story.
 */
const captionAndLegend: Decorator = (story, { parameters }) => {
    const rendered = story();

    if (!(rendered instanceof HTMLElement)) {
        return rendered;
    }

    const graph =
        rendered.tagName === "GRAPHTY-ELEMENT"
            ? (rendered as Graphty)
            : rendered.querySelector<Graphty>("graphty-element");
    const container = document.createElement("div");
    const frame = document.createElement("div");

    frame.style.position = "relative";

    if (typeof parameters.caption === "string") {
        const caption = document.createElement("p");
        caption.dataset.storyCaption = "";
        caption.style.cssText = CAPTION_STYLE;
        caption.textContent = parameters.caption;
        container.append(caption);
    }

    frame.append(rendered);
    container.append(frame);

    if (graph !== null) {
        const legend = document.createElement("div");
        legend.dataset.storyLegend = "";
        legend.setAttribute("role", "group");
        legend.setAttribute("aria-label", "Legend");
        legend.style.cssText = LEGEND_STYLE;
        legend.hidden = true;
        frame.append(legend);

        let queued = false;
        const refresh = (): void => {
            if (queued) {
                return;
            }

            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                const html = legendHtml(graph);
                legend.innerHTML = html;
                legend.hidden = html === "";
            });
        };

        graph.session.on("style:changed", refresh);
        graph.addEventListener("graph-settled", refresh);
    }

    return container;
};

// Re-export helpers for convenience
export { storySetup, waitForGraphSettled } from "../helpers";
