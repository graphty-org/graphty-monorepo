/**
 * @file What the "Network sources/" stories share: the element with a line of facts under it, the
 * story shape that loads in its play function, the third party's `people` sources, and a global
 * fetch replay for loads that pass no `fetch` option (a click-triggered expansion).
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

/**
 * The element and the line of facts under it.
 * @param layout - The element's layout.
 * @returns The story's root.
 */
export function render(layout = "circular"): HTMLElement {
    const root = document.createElement("div");
    root.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 860px; font: 13px monospace;";
    const element = document.createElement("graphty-element");
    element.setAttribute("layout", layout);
    element.style.cssText = "display: block; width: 100%; flex: 1; min-height: 0;";
    const facts = document.createElement("pre");
    facts.dataset.role = "facts";
    facts.style.cssText = "margin: 0; padding: 8px; white-space: pre-wrap; min-height: 60px;";
    root.append(element, facts);
    return root;
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
    const { code, details, name } = error as Partial<GraphtyError>;
    // a DOMException has a numeric legacy `code`; only a GraphtyError's is a string
    if (typeof code !== "string") {
        return `${name ?? "Error"} (no code)`;
    }
    return `${code} ${JSON.stringify(details)}`;
}

/** One story: what it loads, from where, and what it prints under the graph. */
export interface SourceStory {
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
        play: async ({ canvasElement, args }) => {
            const { element, facts } = await parts(canvasElement);
            const options: SourceLoadOptions = args.live ? {} : { fetch: replayFetch(story.recordings) };
            try {
                await story.load(element, options, args.live);
                facts.textContent = (story.facts ?? loadFacts)(element);
            } catch (error) {
                facts.textContent = errorFacts(error);
            }
            await element.waitForStableFrame();
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
