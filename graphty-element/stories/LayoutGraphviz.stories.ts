/**
 * The eight Graphviz layouts, run by Graphviz itself compiled to WebAssembly (the optional package
 * `@hpcc-js/wasm-graphviz`), on one small fixed DOT graph. Graphviz is deterministic, so each
 * story draws the same picture every time.
 *
 * Two more stories show how a DOT file picks its own engine: loaded with `layout: "recommended"`,
 * a file with no coordinates is drawn by the engine its `layout` attribute names, and where the
 * package is missing the recommendation says so with `recommend.graphviz-unavailable` and uses the
 * arrangement the ordinary rules choose.
 */

import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { recommendLayout } from "../src/session/layout";
import { assertGraphLoaded, assertLayoutPlaced, assertViewMode, drawn, holds } from "./assertions";
import { eventWaitingDecorator, renderFn, storySetup, waitForGraphSettled } from "./helpers";

/** The graph every engine story draws: 12 nodes, 16 edges, one cycle through most of them. */
const SAMPLE_DOT = `digraph sample {
    a -> b; a -> c; b -> d; c -> d; d -> e; e -> f; e -> g; f -> h;
    g -> h; h -> a; c -> i; i -> j; j -> h; b -> k; k -> l; l -> f;
}`;

/** A DOT file that names its engine and its rank direction, with no coordinates. */
const NAMED_ENGINE_DOT = `digraph named {
    layout=dot; rankdir=LR;
    start -> parse; parse -> check; check -> plan; plan -> run;
    check -> report; run -> report; parse -> report;
}`;

const SAMPLE_COUNTS = { nodes: 12, edges: 16 };

const meta: Meta = {
    title: "Layout/Graphviz",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    args: {
        dataSource: "dot",
        dataSourceConfig: { data: SAMPLE_DOT },
    },
};
export default meta;

type Story = StoryObj;

/**
 * One engine's story.
 * @param engine - the Graphviz engine
 * @param title - the story's name, for failure messages
 * @param layoutConfig - the layout's options
 * @returns the story
 */
function engineStory(engine: string, title: string, layoutConfig: Record<string, unknown> = {}): Story {
    return {
        args: { setup: storySetup({ viewMode: "2d" }), layout: `graphviz-${engine}`, layoutConfig },
        play: async ({ canvasElement }) => {
            await waitForGraphSettled(canvasElement);
            const scene = await drawn(canvasElement, `Layout/Graphviz ${title}`);
            await assertGraphLoaded(scene, SAMPLE_COUNTS);
            await assertLayoutPlaced(scene, { dim: 2 });
            await assertViewMode(scene, "2d");
            await holds(
                scene.session.layout.id === `graphviz-${engine}`,
                `${title}: the element is laying out with graphviz-${engine}, not ${scene.session.layout.id}`,
            );
        },
    };
}

export const Dot = engineStory("dot", "Dot");
// neato and sfdp let nodes overlap by default; these two ask Graphviz to remove the overlaps.
export const Neato = engineStory("neato", "Neato", { overlap: "false" });
export const Fdp = engineStory("fdp", "Fdp");
export const Sfdp = engineStory("sfdp", "Sfdp", { overlap: "false" });
export const Circo = engineStory("circo", "Circo");
export const Twopi = engineStory("twopi", "Twopi");
export const Osage = engineStory("osage", "Osage");
export const Patchwork = engineStory("patchwork", "Patchwork");

/**
 * A DOT file loaded with `layout: "recommended"`: drawn by the engine it names, left to right as
 * its `rankdir` says.
 */
export const DotFileRecommended: Story = {
    render: () => {
        const element = document.createElement("graphty-element");
        element.viewMode = "2d";
        void element.session.data.import(
            { type: "dot", config: { data: NAMED_ENGINE_DOT } },
            { layout: "recommended" },
        );
        return element;
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Layout/Graphviz DotFileRecommended");
        await assertGraphLoaded(scene, { nodes: 6, edges: 7 });
        await assertLayoutPlaced(scene, { dim: 2 });
        await holds(
            scene.session.layout.id === "graphviz-dot",
            `DotFileRecommended: the file names dot, and the element chose ${scene.session.layout.id}`,
        );
        const x = (id: string): number => scene.nodes.find((node) => node.id === id)?.position[0] ?? Number.NaN;
        await holds(
            x("start") < x("parse") && x("parse") < x("check"),
            "DotFileRecommended: rankdir=LR runs left to right",
        );
    },
};

/**
 * What the recommendation says for the same file where `@hpcc-js/wasm-graphviz` is not installed:
 * the fact `recommend.graphviz-unavailable`, naming the engine the file asked for, and the
 * arrangement the ordinary rules choose. The package is installed here, so the story asks the
 * recommendation as an element without it would, and draws what it answers.
 */
export const PeerMissing: Story = {
    render: () => {
        const wrapper = document.createElement("div");
        const caption = document.createElement("p");
        caption.dataset.testid = "fact";
        caption.style.font = "14px monospace";
        caption.style.margin = "8px";
        const element = document.createElement("graphty-element");
        element.viewMode = "2d";
        element.style.display = "block";
        element.style.height = "820px";
        wrapper.append(caption, element);
        void (async () => {
            const { session } = element;
            await session.data.import({ type: "dot", config: { data: NAMED_ENGINE_DOT } });
            const advice = recommendLayout(session.data.statistics(), {
                file: { format: "dot", attributes: { layout: "dot", rankdir: "LR" } },
                graphvizAvailable: false,
            });
            if (advice !== undefined) {
                caption.textContent = `${advice.fact.code} (engine: ${String(advice.fact.params.engine)}) -> ${advice.layout.id}`;
                // Seeded, so the force drawing is the same picture on every capture.
                await element.setLayout(advice.layout.id, { seed: 7 });
            }
        })();
        return wrapper;
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const fact = canvasElement.querySelector("[data-testid=fact]")?.textContent ?? "";
        await holds(
            fact.startsWith("recommend.graphviz-unavailable (engine: dot) -> force"),
            `PeerMissing: the caption reads "${fact}"`,
        );
    },
};
