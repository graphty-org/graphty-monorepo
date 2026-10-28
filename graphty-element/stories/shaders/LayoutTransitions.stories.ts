/**
 * Layout transitions (design/rendering/shader-styles.md, package E7): with `layoutTransition`
 * set, a new layout moves the nodes over the transition's duration instead of in one frame, and
 * every edge and label follows them. A click reads the new layout at once.
 *
 * - **Particles**: each node bursts into a cloud of particles that streams through curl noise and
 *   gathers again where the node lands (the shader lab's particle morph), while the node glides
 *   there with an eased, staggered move.
 * - **Glide**: the same move with no particles.
 *
 * Both transitions are registered in this file with `registerTransition`; the element's own
 * presets have stories of their own. The capture shows where the move lands; turn on `cycle` to
 * watch it switch layouts every few seconds.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { registerTransition, type TransitionRegistration } from "../../extend";
import { operationQueueOf } from "../../src/Graph";
import type { Graphty } from "../../src/graphty-element";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, isUnderRunner, waitForGraphSettled } from "../helpers";

/**
 * Ease in and out, cubic.
 * @param u - 0..1.
 * @returns The eased value.
 */
function ease(u: number): number {
    return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/** Each node leaves a little after the one before it, by its seed, so the move sweeps across. */
const staggeredGlide: TransitionRegistration["move"] = (t, from, to, node, params) => {
    const stagger = typeof params.stagger === "number" ? params.stagger : 0.35;
    const u = ease(Math.min(1, Math.max(0, (t - node.seed * stagger) / Math.max(1 - stagger, 1e-3))));
    return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u, z: from.z + (to.z - from.z) * u };
};

const STAGGER = { name: "stagger", plainName: "Stagger", type: "number", default: 0.35, min: 0, max: 0.8 } as const;

const PARTICLES: TransitionRegistration = {
    descriptor: {
        id: "demo/particles",
        plainName: "Particles",
        params: [
            { name: "particles", plainName: "Particles", type: "integer", default: 24, min: 1, max: 32 },
            { name: "curl", plainName: "Curl", type: "number", default: 1.4, min: 0, max: 3 },
            STAGGER,
        ],
    },
    drawable: "particles",
    move: staggeredGlide,
};

const GLIDE: TransitionRegistration = {
    descriptor: { id: "demo/glide", plainName: "Glide", params: [STAGGER] },
    move: staggeredGlide,
};

/** Four communities of fifteen, each a ring, joined in a ring. */
const PALETTE = ["#ff6b6b", "#ffd166", "#4ecdc4", "#a78bfa"];
const NODES = Array.from({ length: 60 }, (_, i) => ({
    id: `n${String(i)}`,
    color: PALETTE[Math.floor(i / 15)],
}));
const EDGES = [
    ...NODES.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String(Math.floor(i / 15) * 15 + ((i + 1) % 15))}` })),
    ...[0, 1, 2, 3].map((c) => ({ src: `n${String(c * 15)}`, dst: `n${String(((c + 1) % 4) * 15 + 7)}` })),
];

/** The layouts a cycle moves through. */
const CYCLE = ["circular", "grid", "spiral", "shell"];

interface Args {
    transition: "demo/particles" | "demo/glide";
    seconds: number;
    cycle: boolean;
}

/**
 * Build the element: community colors on a dark background, laid out in a circle.
 * @param args - The story's controls.
 * @returns The element.
 */
function render(args: Args): Graphty {
    registerTransition(PARTICLES);
    registerTransition(GLIDE);
    const element: Graphty = document.createElement("graphty-element");
    void element.session.styles.add({
        name: "Community colors",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 4 },
        encode: { "node.color": { by: "data.color", scale: "passthrough" } },
    });
    void element.session.styles.add({
        name: "Edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#5b6573", "edge.width": 1.2 },
    });
    void element.session.config.set({ layoutTransition: { transition: args.transition, seconds: args.seconds } });
    element.background = { backgroundType: "color", color: "#06070d" };
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "circular";
    element.viewMode = "2d";

    if (args.cycle && !isUnderRunner()) {
        let next = 1;
        const timer = setInterval(
            () => {
                if (!element.isConnected) {
                    clearInterval(timer);
                    return;
                }

                element.layout = CYCLE[next % CYCLE.length];
                next++;
            },
            (args.seconds + 1.5) * 1000,
        );
    }

    return element;
}

const meta: Meta<Args> = {
    title: "Shaders/Layout Transitions",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
    args: { transition: "demo/particles", seconds: 2.6, cycle: false },
    argTypes: {
        transition: { control: "select", options: ["demo/particles", "demo/glide"] },
        seconds: { control: { type: "range", min: 0.2, max: 8, step: 0.1 } },
        cycle: { control: "boolean" },
    },
};
export default meta;

type Story = StoryObj<Args>;

/**
 * Switch the layout once and wait until the move has landed.
 * @param canvasElement - The story's root.
 * @param story - The story's name, for a failure.
 */
async function switchAndLand(canvasElement: HTMLElement, story: string): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error(`${story}: no graphty-element`);
    }

    element.layout = "grid";
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const scene = element.graph.getScene();
    const runner = transitionsOf(element.graph.getLayoutManager());
    // The new layout is built, so the move has begun; it ends on the frame it lands.
    while (runner?.active === true) {
        await new Promise<void>((resolve) => {
            scene.onAfterRenderObservable.addOnce(() => {
                resolve();
            });
        });
    }

    await waitForGraphSettled(canvasElement);
    await assertGraphLoaded(await drawn(canvasElement, story), { nodes: NODES.length, edges: EDGES.length });
}

/** Nodes stream to the new layout as particle clouds. */
export const Particles: Story = {
    play: async ({ canvasElement }) => {
        await switchAndLand(canvasElement, "Shaders/Layout Transitions Particles");
    },
};

/** Nodes glide to the new layout, one after another. */
export const Glide: Story = {
    args: { transition: "demo/glide" },
    play: async ({ canvasElement }) => {
        await switchAndLand(canvasElement, "Shaders/Layout Transitions Glide");
    },
};
