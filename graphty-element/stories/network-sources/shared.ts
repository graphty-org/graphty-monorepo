/**
 * @file What the "Data/Network sources/" stories share: the element under a one-line caption saying what
 * the data is, with a line of facts under it; the labels and the seeded 2D force layout that make
 * each graph readable; the story shape that loads in its play function; the third party's
 * `people` sources; and a global fetch replay for loads that pass no `fetch` option (a
 * click-triggered expansion).
 *
 * Every story replays responses recorded from the real public services (`../fixtures/sources/`),
 * so nothing touches the network and every picture is the same every time. The `live` control (off
 * by default) sends the same requests to the real service instead.
 *
 * The facts under the graph are the story's own words, not the element's: the element hands back
 * coded facts (`data.loads()`, an error's `code` and `details`), and the story prints them, as an
 * application would.
 */

import type { StoryObj } from "@storybook/web-components-vite";

import {
    defineSource,
    type GraphSource,
    type Graphty,
    type GraphtyError,
    listSources,
    registerSource,
    replayFetch,
    type SourceLoadOptions,
} from "../../index.ts";
import type { LayerSpec } from "../../src/catalog/types";
import { setLayoutPreSteps } from "../helpers";

/** The recordings `replayFetch` takes. */
export type Recordings = Parameters<typeof replayFetch>[0];

/**
 * Register a source once, however often Storybook evaluates the stories.
 * @param source - The source.
 */
function registerOnce<P>(source: GraphSource<P>): void {
    if (!listSources().some((info) => info.id === source.id)) {
        registerSource(source);
    }
}

// A third party's first source (design section 4.1): fifteen lines, no snapshot, no sink.
registerOnce(
    defineSource({
        id: "people",
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
                `/api/people?team=${encodeURIComponent(params.team)}`,
            );
            return {
                nodes: rows.map((r) => ({ id: r.id, name: r.name })),
                edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
            };
        },
    }),
);

// The same, behind a login, so a load with no credential is refused before any request.
registerOnce(
    defineSource({
        id: "people-private",
        descriptor: { plainName: "People (private)", authRequired: "required", auth: ["bearer"], params: [] },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${encodeURIComponent(params.team)}`);
            return { nodes: rows.map((r) => ({ id: r.id })) };
        },
    }),
);

/** The people service's address: example.com, which only the recordings answer. */
export const PEOPLE = "https://people.example.com";

/** The Neo4j demo server's Query API. */
export const NEO4J_DEMO = "https://demo.neo4jlabs.com:7473";

/** The stories' controls. */
export interface SourceArgs {
    /** Ask the real service instead of replaying its recorded answers. */
    live: boolean;
}

/** The meta fields every network-source story file shares. */
export const sourceMeta = {
    component: "graphty-element",
    argTypes: { live: { control: "boolean", description: "Ask the real service instead of its recordings" } },
    parameters: { controls: { include: ["live"] } },
} as const;

/** What a story says about itself: one line on the canvas and a paragraph in the docs. */
export interface StoryText {
    /** One line drawn above the graph: what the data is, where it came from, what to look at. */
    readonly caption: string;
    /** What the story shows, on its docs page. */
    readonly description: string;
    /** When a reader would do what the story does. */
    readonly use: string;
    /** The least code that does it on a page of the reader's own. */
    readonly code: string;
    /** Which controls to try, and what they change; the `live` control unless the story says otherwise. */
    readonly controls?: string;
}

/** What the `live` control does, for every story that has only that control. */
export const LIVE_CONTROL =
    "`live`: off, the story answers every request from recorded responses, so the story gives the same result " +
    "offline; on, it asks the real service, whose answer may have changed since the recording.";

/**
 * A story's parameters carrying its caption, its docs description and its code.
 * @param text - What the story says about itself.
 * @returns The parameters.
 */
export function storyText(text: StoryText): {
    caption: string;
    docs: { description: { story: string }; source: { code: string; language: string } };
} {
    const story = [
        text.description,
        `**When to use it:** ${text.use}`,
        `**Do it yourself:**\n\n\`\`\`js\n${text.code}\n\`\`\``,
        `**Controls to try:** ${text.controls ?? LIVE_CONTROL}`,
    ].join("\n\n");
    return {
        caption: text.caption,
        docs: { description: { story }, source: { code: text.code, language: "js" } },
    };
}

/** How the stories draw a label: dark letters on a pale panel, readable over edges. */
export const LABEL_STYLE = { sizePx: 64, color: "#1f2933", background: "#ffffffcc" } as const;

/** The seed every force layout here starts from, so each story draws the same picture every load. */
export const LAYOUT_SEED = 42;

/**
 * The element under a one-line caption, and the line of facts under it. The layout is a seeded
 * force layout unless the story names another.
 * @param caption - What the graph is, in one line.
 * @param layout - The element's layout.
 * @returns The story's root.
 */
export function render(caption = "", layout = "ngraph"): HTMLElement {
    const root = document.createElement("div");
    root.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 860px; font: 13px monospace;";
    const title = document.createElement("p");
    title.dataset.role = "caption";
    title.textContent = caption;
    title.style.cssText =
        "margin: 0; padding: 8px 56px 8px 12px; font: 600 15px/1.35 system-ui, sans-serif; color: #1f2933;";
    const element = document.createElement<"graphty-element">("graphty-element");
    element.setAttribute("layout", layout);
    element.viewMode = "2d";
    if (layout === "ngraph") {
        element.layoutConfig = { seed: LAYOUT_SEED, dim: 2 };
        setLayoutPreSteps(element, 2000);
    }
    element.style.cssText = "display: block; width: 100%; flex: 1; min-height: 0;";
    const facts = document.createElement("pre");
    facts.dataset.role = "facts";
    facts.style.cssText = "margin: 0; padding: 8px 12px; white-space: pre-wrap; min-height: 60px; color: #52606d;";
    root.append(title, element, facts);
    return root;
}

/**
 * The meta `render` of a story file: the caption comes from the story's own parameters.
 * @param layout - The element's layout.
 * @returns The render function.
 */
export function renderWithCaption(
    layout?: string,
): (args: unknown, context: { parameters: Record<string, unknown> }) => HTMLElement {
    return (_args, { parameters }) => render(typeof parameters.caption === "string" ? parameters.caption : "", layout);
}

/**
 * A layer writing each node's label from one of its attributes, on the nodes that have it.
 * @param field - The attribute.
 * @param sizePx - How tall the letters are.
 * @returns The layer.
 */
export function labelLayer(field: string, sizePx: number = LABEL_STYLE.sizePx): LayerSpec {
    return {
        name: `Label: ${field}`,
        target: "node",
        selector: { match: "has", path: `data.${field}` },
        encode: { "node.label": { by: `data.${field}`, scale: "passthrough" } },
        set: { "node.labelStyle": { ...LABEL_STYLE, sizePx } },
    };
}

/**
 * Once the graph has settled, step the camera back a little from the element's own fit, which
 * frames the nodes' centres: the labels above the outermost nodes then fit on the canvas too.
 * @param element - The element.
 * @returns Settles once the new frame is drawn.
 */
export async function frameWithLabels(element: Graphty): Promise<void> {
    await element.waitForStableFrame();
    const state = element.getCameraState();
    if (typeof state.zoom === "number") {
        element.autoFrame = false;
        await element.setCameraState({ ...state, zoom: state.zoom * 0.85 });
    }
    await element.waitForStableFrame();
}

/**
 * The element and the facts line a story rendered.
 * @param canvasElement - The story's root.
 * @returns Both, once the element is ready.
 */
export async function parts(canvasElement: HTMLElement): Promise<{ element: Graphty; facts: HTMLElement }> {
    const element = canvasElement.querySelector<Graphty>("graphty-element");
    const facts = canvasElement.querySelector<HTMLElement>("[data-role=facts]");
    if (element === null || facts === null) {
        throw new Error("the story rendered no element");
    }
    await element.updateComplete;
    return { element, facts };
}

/**
 * The record of the newest load, as plain facts.
 * @param element - The element.
 * @returns The text.
 */
export function loadFacts(element: Graphty): string {
    const { data } = element.session;
    const record = data.loads().at(-1);
    return [
        `nodes ${String(data.nodes().length)}, edges ${String(data.edges().length)}`,
        record === undefined
            ? "no load"
            : `source ${record.source} v${String(record.version)} at ${record.endpoint ?? "(none)"}, ` +
              `credential ${record.credential === null ? "none" : `${record.credential.kind} for ${record.credential.origin}`}`,
    ].join("\n");
}

/**
 * A failure as plain facts: its code and details, or the name of an error that has no code.
 * @param error - What the load rejected with.
 * @returns The text.
 */
export function errorFacts(error: unknown): string {
    const { code, details, name, message } = error as Partial<GraphtyError>;
    // a DOMException has a numeric legacy `code`; only a GraphtyError's is a string
    if (typeof code !== "string") {
        return `${name ?? "Error"} (no code): ${message ?? ""}`;
    }
    return `${code} ${JSON.stringify(details)}`;
}

/** One story: what it loads, from where, and what it prints under the graph. */
export interface SourceStory {
    /** What the story says about itself. */
    readonly text: StoryText;
    /** A layout other than the seeded force layout, run with the same seed in 2D. */
    readonly layout?: string;
    /** Layout settings beside the seed. */
    readonly layoutConfig?: Readonly<Record<string, unknown>>;
    /** The story's own layers, added before the load: labels, sizes, colors. */
    readonly layers?: readonly LayerSpec[];
    readonly recordings: Recordings;
    /**
     * Load into the element.
     * @param element - The element.
     * @param options - The fetch to use (absent when live).
     * @param live - Whether the story asks the real service.
     * @returns Settles once loaded.
     */
    readonly load: (element: Graphty, options: SourceLoadOptions, live: boolean) => Promise<void>;
    /**
     * What to print once it loaded; the load's record by default.
     * @param element - The element.
     * @returns The text.
     */
    readonly facts?: (element: Graphty) => string;
}

/**
 * Run a story's load in its play function, so the capture waits for it, and print the outcome.
 * @param story - The story.
 * @returns The Storybook story.
 */
export function sourceStory(story: SourceStory): StoryObj<SourceArgs> {
    return {
        args: { live: false },
        parameters: storyText(story.text),
        play: async ({ canvasElement, args }) => {
            const { element, facts } = await parts(canvasElement);
            if (story.layout !== undefined || story.layoutConfig !== undefined) {
                await element.setLayout(story.layout ?? "ngraph", { seed: LAYOUT_SEED, dim: 2, ...story.layoutConfig });
            }
            for (const layer of story.layers ?? []) {
                await element.session.styles.add(layer);
            }
            const options: SourceLoadOptions = args.live ? {} : { fetch: replayFetch(story.recordings) };
            try {
                await story.load(element, options, args.live);
                facts.textContent = (story.facts ?? loadFacts)(element);
            } catch (error) {
                facts.textContent = errorFacts(error);
            }
            await frameWithLabels(element);
        },
    };
}

/**
 * Answer every request to an origin the recordings name from the recordings, through the global
 * fetch, for a load that takes no `fetch` option (an expansion a click starts). Requests to any
 * other origin go to the real fetch, so Storybook itself keeps working.
 * @param recordings - The recordings.
 * @returns Puts the real fetch back.
 */
export function installFetchReplay(recordings: Recordings): () => void {
    const real = globalThis.fetch;
    const replay = replayFetch(recordings);
    const origins = new Set(recordings.map((r) => new URL(r.url).origin));
    globalThis.fetch = (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        return origins.has(new URL(url, location.href).origin) ? replay(input, init) : real(input, init);
    };
    return () => {
        globalThis.fetch = real;
    };
}

/** Movies-database layers: people labelled by name in blue, films by title in orange. */
export const MOVIE_LAYERS: readonly LayerSpec[] = [
    { ...labelLayer("name"), set: { "node.color": "#3b6fd4", "node.labelStyle": LABEL_STYLE } },
    { ...labelLayer("title"), set: { "node.color": "#e8890c", "node.labelStyle": LABEL_STYLE } },
];

/** People-service layers: each person labelled by name. */
export const PEOPLE_LAYERS: readonly LayerSpec[] = [labelLayer("name")];
