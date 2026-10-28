/**
 * @file Click-to-expand from a real database: Keanu Reeves alone from the Neo4j demo server's
 * movies database, double-clicked twice (three neighbors an expansion, the second continuing where
 * the first stopped), then collapsed from a button. The element turns the double-click into an
 * expansion because the story switched it on (`behavior.expand.trigger`, "none" by default), asks
 * the source that loaded the node, and finds the login the story remembered for that server.
 *
 * The red marks a node with more neighbors still to fetch: the story's own layer on the neutral
 * `_source.expansion` fact, since the element styles nothing. Recorded, every request to the demo
 * server is answered from `fixtures/sources/neo4j-expand.json` through the global fetch, because a
 * click passes no fetch of its own.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { userEvent } from "storybook/test";

import { credentials, type Graphty } from "../../index.ts";
import { operationQueueOf } from "../../src/Graph";
import type { SourceExpanded } from "../../src/session/sources/types";
import { holds } from "../assertions";
import expandRecordings from "../fixtures/sources/neo4j-expand.json";
import {
    installFetchReplay,
    LABEL_STYLE,
    MOVIE_LAYERS,
    NEO4J_DEMO,
    parts,
    render,
    type SourceArgs,
    sourceMeta,
    storyText,
} from "./shared";

/** The login the demo server publishes for its movies database. */
const LOGIN = credentials.basic("movies", "movies");

/** The story's own layer: a node with more neighbors still to fetch. */
const MORE_TO_FETCH_LAYER = {
    name: "More to fetch",
    target: "node",
    selector: { match: "expression", where: "data._source.expansion == 'partial'" },
    set: { "node.color": "#d64545" },
} as const;

/**
 * The element under the story's caption, with a collapse button beside the facts.
 * @param _args - The story's args.
 * @param context - The story's context.
 * @param context.parameters - The story's parameters, which carry its caption.
 * @returns The story's root.
 */
function renderWithCollapse(_args: unknown, { parameters }: { parameters: Record<string, unknown> }): HTMLElement {
    const root = render(typeof parameters.caption === "string" ? parameters.caption : "", "fixed");
    const button = document.createElement("button");
    button.textContent = "Collapse the seed";
    button.dataset.role = "collapse";
    button.style.cssText = "align-self: flex-start; margin: 0 8px 8px; font: 13px monospace;";
    root.append(button);
    return root;
}

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Data/Network sources/Click to expand",
    id: "network-sources-click-to-expand",
    // Storybook reads tags from the meta itself, not from a spread
    tags: ["autodocs"],
    parameters: {
        ...sourceMeta.parameters,
        docs: {
            description: {
                component:
                    'Start from one node and let the reader fetch more: with `layoutBehavior.expand.trigger` set to `"double-click"` (it is `"none"` by default), a double-click asks the source that loaded a node for its neighbors and merges them as one undoable step; `session.data.collapse(id)` takes them away again. Each node carries neutral `_source.` facts (such as `_source.expansion`) for a style layer to paint.',
            },
        },
    },
    render: renderWithCollapse,
};
export default meta;

type Story = StoryObj<SourceArgs>;

/**
 * Load the seed in 2D at the origin, remember the login, and switch double-click expansion on.
 * @param element - The element.
 * @returns The seed's id.
 */
async function loadSeed(element: Graphty): Promise<string> {
    const { session } = element;
    await operationQueueOf(element.graph).waitForCompletion();
    // smaller words than the other stories: an expansion places its nodes close to the seed
    for (const layer of MOVIE_LAYERS) {
        await session.styles.add({
            ...layer,
            set: { ...layer.set, "node.labelStyle": { ...LABEL_STYLE, sizePx: 34 } },
        });
    }
    await session.styles.add(MORE_TO_FETCH_LAYER);
    await session.data.import(
        {
            source: "neo4j",
            config: {
                query: "MATCH (p:Person {name: $name}) RETURN p",
                parameters: { name: "Keanu Reeves" },
                database: "movies",
            },
        },
        { endpoint: NEO4J_DEMO, credential: LOGIN },
    );
    await element.credentials.remember({ source: "neo4j", endpoint: NEO4J_DEMO }, LOGIN);
    const [seed] = session.data.nodes();
    await session.data.updateNodes([{ id: seed.id, values: { position: { x: 0, y: 0, z: 0 } } }]);
    element.layoutBehavior = { expand: { trigger: "double-click", limit: 3 } };
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    // One view for every step: a lone seed framed to fit would fill the screen.
    element.autoFrame = false;
    await element.setCameraState({ zoom: 0.35, pan: { x: 0, y: 0 } });
    await element.waitForStableFrame();
    return String(seed.id);
}

/**
 * Double-click a node the way a mouse does: two presses and releases on the canvas, at the spot
 * the element says the node is drawn. Settles once the expansion the click started has landed.
 * @param element - The element.
 * @param id - The node.
 * @returns What the expansion added.
 */
async function doubleClickNode(element: Graphty, id: string): Promise<SourceExpanded> {
    const expanded = new Promise<SourceExpanded>((resolve, reject) => {
        const offDone = element.session.on("source:expanded", (detail) => {
            offDone();
            offFailed();
            resolve(detail);
        });
        const offFailed = element.session.on("source:expand-failed", (detail) => {
            offDone();
            offFailed();
            reject(new Error(`the expansion failed: ${JSON.stringify(detail)}`));
        });
    });
    const at = element.nodeScreenPosition(id);
    await holds(at?.visible === true, `Click to expand: node "${id}" is not on screen to be double-clicked`);
    const { canvas } = element.graph;
    const box = canvas.getBoundingClientRect();
    const pointer = {
        clientX: box.left + (at?.x ?? 0),
        clientY: box.top + (at?.y ?? 0),
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
    };
    canvas.dispatchEvent(new PointerEvent("pointermove", { ...pointer, button: -1, buttons: 0 }));
    for (let press = 0; press < 2; press++) {
        canvas.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, button: 0, buttons: 1 }));
        canvas.dispatchEvent(new PointerEvent("pointerup", { ...pointer, button: 0, buttons: 0 }));
    }
    const detail = await expanded;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return detail;
}

/**
 * The seed's expansion facts and the graph's size, as plain text.
 * @param element - The element.
 * @param seed - The seed's id.
 * @returns The text.
 */
function seedFacts(element: Graphty, seed: string): string {
    const { data } = element.session;
    const node = data.node(seed);
    const fact = (name: string): string => {
        const value = node?.[name];
        if (value === undefined) {
            return "(not set)";
        }
        return typeof value === "string" ? value : JSON.stringify(value);
    };
    return [
        `nodes ${String(data.nodes().length)}, edges ${String(data.edges().length)}`,
        `seed: expansion ${fact("_source.expansion")}, degree ${fact("_source.degree")}, ` +
            `not loaded yet ${fact("_source.hidden")}`,
    ].join("\n");
}

/**
 * Run a story's steps with the demo server answered from its recordings (unless live), and print
 * the seed's facts after them.
 * @param steps - What the story does after the seed is loaded.
 * @returns The play function.
 */
function play(steps: (element: Graphty, seed: string, canvasElement: HTMLElement) => Promise<void>): Story["play"] {
    return async ({ canvasElement, args }) => {
        const { element, facts } = await parts(canvasElement);
        const restore = args.live ? () => undefined : installFetchReplay(expandRecordings);
        try {
            const seed = await loadSeed(element);
            await steps(element, seed, canvasElement);
            facts.textContent = seedFacts(element, seed);
        } finally {
            restore();
        }
    };
}

/** The seed alone: one node from the database, with more behind it. */
export const StartFromOneNode: Story = {
    args: { live: false },
    parameters: storyText({
        caption:
            "Click to expand: Keanu Reeves alone, from the Neo4j demo movies database; his 7 films are not loaded yet.",
        description:
            "Click to expand, on the movies database of Neo4j's public demo server: the graph starts from one " +
            "node, Keanu Reeves, and a double-click on a node asks the source that loaded it for that node's " +
            "neighbors, three at a time (the story switches expansion on with `behavior.expand`; it is off by " +
            "default). People are blue, films orange, and a node turns red when an expansion stopped at its " +
            "limit with neighbors still to fetch (the `_source.expansion` fact, painted by the story's own " +
            "layer). " +
            "The start: one node, with 7 neighbors behind it that are not loaded.",
        use:
            "To let a reader explore a large database from one node, fetching neighbors only where they " +
            "look, instead of loading the whole graph.",
        code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
const login = credentials.basic("movies", "movies");
const endpoint = "https://demo.neo4jlabs.com:7473";
await graph.session.data.import(
    {
        source: "neo4j",
        config: { query: "MATCH (p:Person {name: $name}) RETURN p", parameters: { name: "Keanu Reeves" }, database: "movies" },
    },
    { endpoint, credential: login },
);
// a double-click expands a node from the source that loaded it, with this login
await graph.credentials.remember({ source: "neo4j", endpoint }, login);
graph.layoutBehavior = { expand: { trigger: "double-click", limit: 3 } };`,
        controls:
            "`live`: off, every request is answered from recorded responses; on, the double-clicks reach the " +
            "real demo server. Double-click a node on the canvas yourself to expand it again.",
    }),
    play: play(async (element) => {
        await holds(element.session.data.nodes().length === 1, "the seed is the only node");
    }),
};

/** The seed double-clicked twice: two capped expansions, the second continuing from the first. */
export const ExpandTwice: Story = {
    args: { live: false },
    parameters: storyText({
        caption:
            "Click to expand: Keanu Reeves double-clicked twice, each time fetching 3 more of his 7 films. Still red: 1 left.",
        description:
            "Click to expand, on the movies database of Neo4j's public demo server: the graph starts from one " +
            "node, Keanu Reeves, and a double-click on a node asks the source that loaded it for that node's " +
            "neighbors, three at a time (the story switches expansion on with `behavior.expand`; it is off by " +
            "default). People are blue, films orange, and a node turns red when an expansion stopped at its " +
            "limit with neighbors still to fetch (the `_source.expansion` fact, painted by the story's own " +
            "layer). " +
            "The play function double-clicks the node twice with real pointer events: the second expansion " +
            "continues where the first stopped, so 6 of his 7 films are on screen.",
        use:
            "To let a reader explore a large database from one node, fetching neighbors only where they " +
            "look, instead of loading the whole graph.",
        code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
const login = credentials.basic("movies", "movies");
const endpoint = "https://demo.neo4jlabs.com:7473";
await graph.session.data.import(
    {
        source: "neo4j",
        config: { query: "MATCH (p:Person {name: $name}) RETURN p", parameters: { name: "Keanu Reeves" }, database: "movies" },
    },
    { endpoint, credential: login },
);
// a double-click expands a node from the source that loaded it, with this login
await graph.credentials.remember({ source: "neo4j", endpoint }, login);
graph.layoutBehavior = { expand: { trigger: "double-click", limit: 3 } };
// or expand from code, as a double-click does
const [seed] = graph.session.data.nodes();
await graph.session.data.expand([seed.id]);`,
        controls:
            "`live`: off, every request is answered from recorded responses; on, the double-clicks reach the " +
            "real demo server. Double-click a node on the canvas yourself to expand it again.",
    }),
    play: play(async (element, seed) => {
        const first = await doubleClickNode(element, seed);
        await holds(first.params.partial === true, "the first expansion stopped at its limit");
        await doubleClickNode(element, seed);
        await holds(
            element.session.data.nodes().length === 7,
            `two expansions of three brought six neighbors; the graph holds ${String(element.session.data.nodes().length)} nodes`,
        );
        // Each expansion starts its nodes on a ring at an angle its key decides; two expansions
        // of one seed must not draw their nodes on top of each other.
        const drawn = element.session.data.nodes().map((node) => element.nodeScreenPosition(String(node.id)));
        for (const [i, a] of drawn.entries()) {
            for (const b of drawn.slice(i + 1)) {
                const apart =
                    a !== undefined &&
                    a !== null &&
                    b !== undefined &&
                    b !== null &&
                    Math.hypot(a.x - b.x, a.y - b.y) > a.radius;
                await holds(apart, "two expanded neighbors are drawn on top of each other");
            }
        }
    }),
};

/** Expanded twice, then collapsed from the button: only the seed is left. */
export const Collapse: Story = {
    args: { live: false },
    parameters: storyText({
        caption: "Click to expand, then collapse: Keanu Reeves expanded twice, then collapsed with the button below.",
        description:
            "Click to expand, on the movies database of Neo4j's public demo server: the graph starts from one " +
            "node, Keanu Reeves, and a double-click on a node asks the source that loaded it for that node's " +
            "neighbors, three at a time (the story switches expansion on with `behavior.expand`; it is off by " +
            "default). People are blue, films orange, and a node turns red when an expansion stopped at its " +
            "limit with neighbors still to fetch (the `_source.expansion` fact, painted by the story's own " +
            "layer). " +
            "The play function expands the node twice, then clicks the Collapse button, which calls " +
            "`session.data.collapse()`: what the expansions brought is removed, and only the seed is left.",
        use: "To give the reader a way back: collapsing a node removes what its expansions brought.",
        code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
const login = credentials.basic("movies", "movies");
const endpoint = "https://demo.neo4jlabs.com:7473";
await graph.session.data.import(
    {
        source: "neo4j",
        config: { query: "MATCH (p:Person {name: $name}) RETURN p", parameters: { name: "Keanu Reeves" }, database: "movies" },
    },
    { endpoint, credential: login },
);
// a double-click expands a node from the source that loaded it, with this login
await graph.credentials.remember({ source: "neo4j", endpoint }, login);
graph.layoutBehavior = { expand: { trigger: "double-click", limit: 3 } };
// remove what the expansions of a node brought
const [seed] = graph.session.data.nodes();
await graph.session.data.collapse(seed.id);`,
        controls:
            "`live`: off, every request is answered from recorded responses; on, the double-clicks reach the " +
            "real demo server. Double-click a node on the canvas yourself to expand it again.",
    }),
    play: play(async (element, seed, canvasElement) => {
        await doubleClickNode(element, seed);
        await doubleClickNode(element, seed);
        const button = canvasElement.querySelector<HTMLButtonElement>("[data-role=collapse]");
        await holds(button !== null, "the story rendered no collapse button");
        const collapsed = new Promise<void>((resolve) => {
            button?.addEventListener(
                "click",
                () => {
                    void element.session.data.collapse(seed).then(() => {
                        resolve();
                    });
                },
                { once: true },
            );
        });
        if (button !== null) {
            await userEvent.click(button);
        }
        await collapsed;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        await holds(element.session.data.nodes().length === 1, "the collapse left only the seed");
    }),
};
