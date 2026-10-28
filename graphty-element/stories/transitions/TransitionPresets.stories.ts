/**
 * The element's layout transitions (design/rendering/shader-styles.md section 7.6): with
 * `layoutTransition` set, a new layout moves the nodes over the transition's duration instead of
 * in one frame, and every edge and label follows them.
 *
 * Each story switches a grid of four communities to a ring. The capture holds the move at the
 * story's `pose` (half way by default) so the shape of each transition is what is compared; clear
 * `pose` in the controls to watch it run, and turn on `cycle` to switch layouts every few seconds.
 * (A held particle preset shows where its nodes are; its particle cloud plays only while it runs.)
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { registerTransition, type TransitionRegistration } from "../../extend";
import { operationQueueOf } from "../../src/Graph";
import type { Graphty } from "../../src/graphty-element";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { ARC_MOVE } from "../../src/transitions/presets/arc-move";
import { COLLAPSE_BLOOM } from "../../src/transitions/presets/collapse-bloom";
import { FADE_THROUGH } from "../../src/transitions/presets/fade-through";
import { GLIDE } from "../../src/transitions/presets/glide";
import { PARTICLE_MORPH } from "../../src/transitions/presets/particle-morph";
import { STAGGERED_GLIDE } from "../../src/transitions/presets/staggered-glide";
import { SWIRL } from "../../src/transitions/presets/swirl";
import { transitionById } from "../../src/transitions/registry";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, isUnderRunner, waitForGraphSettled } from "../helpers";

const PRESETS: Readonly<Record<string, TransitionRegistration>> = {
    glide: GLIDE,
    "staggered-glide": STAGGERED_GLIDE,
    "arc-move": ARC_MOVE,
    swirl: SWIRL,
    "fade-through": FADE_THROUGH,
    "collapse-bloom": COLLAPSE_BLOOM,
    "particle-morph": PARTICLE_MORPH,
};

/**
 * The id to name a preset by, registering it under a story id when the catalog does not list it
 * yet. With `pose` set, the registered copy holds every node at that progress and draws no particles.
 * @param id - The preset's id.
 * @param pose - The progress to hold at, or undefined to run.
 * @returns The id `layoutTransition` names.
 */
function idFor(id: string, pose: number | undefined): string {
    if (pose === undefined && transitionById(id) !== undefined) {
        return id;
    }

    const preset = PRESETS[id];
    const named = `story/${id}${pose === undefined ? "" : `-held-${String(Math.round(pose * 100))}`}`;
    registerTransition(
        pose === undefined
            ? { ...preset, descriptor: { ...preset.descriptor, id: named } }
            : {
                  // Held: no particle cloud, whose picture depends on the clock, so a capture is
                  // the same picture every time.
                  descriptor: { ...preset.descriptor, id: named },
                  move: (_t, from, to, node, params) => preset.move(pose, from, to, node, params),
              },
    );
    return named;
}

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
const CYCLE = ["grid", "circular", "spiral", "shell"];

/** A held move lasts this long (the setting's most), so it is still held when the capture is taken. */
const HELD_SECONDS = 30;

interface Args {
    transition: keyof typeof PRESETS;
    seconds: number;
    pose?: number;
    cycle: boolean;
}

/**
 * Build the element: community colors on a dark background, laid out in a grid.
 * @param args - The story's controls.
 * @returns The element.
 */
function render(args: Args): Graphty {
    const pose = typeof args.pose === "number" ? args.pose : undefined;
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
        set: { "edge.color": "#8a96a8", "edge.width": 2 },
    });
    void element.session.config.set({
        layoutTransition: {
            transition: idFor(args.transition, pose),
            seconds: pose === undefined ? args.seconds : HELD_SECONDS,
        },
    });
    element.background = { backgroundType: "color", color: "#06070d" };
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "grid";
    element.viewMode = "2d";

    if (args.cycle && pose === undefined && !isUnderRunner()) {
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
    title: "Shaders/Transitions",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
    args: { transition: "glide", seconds: 1.6, pose: 0.5, cycle: false },
    argTypes: {
        transition: { control: "select", options: Object.keys(PRESETS) },
        seconds: { control: { type: "range", min: 0.2, max: 8, step: 0.1 } },
        pose: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
        cycle: { control: "boolean" },
    },
};
export default meta;

type Story = StoryObj<Args>;

/**
 * Switch the layout to a ring and wait until the move is under way (held) or has landed.
 * @param canvasElement - The story's root.
 * @param story - The story's name, for a failure.
 * @param held - Whether the story holds the move at its pose.
 */
async function switchLayout(canvasElement: HTMLElement, story: string, held: boolean): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error(`${story}: no graphty-element`);
    }

    await assertGraphLoaded(await drawn(canvasElement, story), { nodes: NODES.length, edges: EDGES.length });
    element.layout = "circular";
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const scene = element.graph.getScene();
    const runner = transitionsOf(element.graph.getLayoutManager());
    const frame = (): Promise<void> =>
        new Promise<void>((resolve) => {
            scene.onAfterRenderObservable.addOnce(() => {
                resolve();
            });
        });
    if (held) {
        // Two frames: the first starts the move's clock, the second draws every node at the pose;
        // a third draws the edges after them.
        await frame();
        await frame();
        if (runner?.active !== true) {
            throw new Error(`${story}: the transition did not start`);
        }

        await frame();
        // Every edge is drawn between its nodes where they are drawn, not where the layout has
        // them: the middle of its line lies on the segment between them (not at its midpoint,
        // since the arrowhead trims the target end).
        for (const edge of element.graph.getDataManager().edges.values()) {
            const a = edge.srcNode.mesh.position;
            const b = edge.dstNode.mesh.position;
            const middle = edge.drawnCentre;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.max(Math.hypot(dx, dy), 1e-9);
            const along = ((middle.x - a.x) * dx + (middle.y - a.y) * dy) / (length * length);
            const across = Math.abs((middle.x - a.x) * dy - (middle.y - a.y) * dx) / length;
            if (across > 0.05 || along <= 0 || along >= 1) {
                throw new Error(`${story}: an edge did not follow its nodes`);
            }
        }

        return;
    }

    while (runner?.active === true) {
        await frame();
    }

    await waitForGraphSettled(canvasElement);
    // Landed exactly on the new layout's places.
    const at = { x: 0, y: 0, z: 0 };
    for (const node of element.graph.getDataManager().nodes.values()) {
        element.session.positions.read(node.index, at);
        const drawnAt = node.mesh.position;
        if (Math.hypot(drawnAt.x - at.x, drawnAt.y - at.y, drawnAt.z - at.z) > 1e-6) {
            throw new Error(`${story}: node ${String(node.id)} did not land on its layout place`);
        }
    }
}

/**
 * A story for one preset.
 * @param transition - The preset's id.
 * @param name - The story's name, for a failure.
 * @param pose - The progress the capture holds at.
 * @returns The story.
 */
function storyOf(transition: keyof typeof PRESETS, name: string, pose = 0.5): Story {
    return {
        args: { transition, pose },
        play: async ({ canvasElement, args }) => {
            await switchLayout(canvasElement, `Shaders/Transitions ${name}`, typeof args.pose === "number");
        },
    };
}

/** Every node travels straight to its new place, eased. */
export const Glide: Story = storyOf("glide", "Glide");

/** Nodes glide in a wave that starts at the middle of the graph (or the selection). */
export const StaggeredGlide: Story = storyOf("staggered-glide", "StaggeredGlide");

/** Every node travels on an arc, bowing to the left of its direction of travel. */
export const ArcMove: Story = storyOf("arc-move", "ArcMove");

/** Every node turns about the middle as it travels. */
export const Swirl: Story = storyOf("swirl", "Swirl");

/** Each node dissolves into a puff of particles, slips to its new place and forms again. */
export const FadeThrough: Story = storyOf("fade-through", "FadeThrough");

/** The old layout shrinks into a knot at the middle; the new one blooms out of it. */
export const CollapseBloom: Story = storyOf("collapse-bloom", "CollapseBloom", 0.3);

/** Nodes burst into particle clouds that stream through curl noise and gather where they land. */
export const ParticleMorph: Story = storyOf("particle-morph", "ParticleMorph");
