/**
 * The force layouts with an accelerator attached, and a caption that says which path ran.
 *
 * Three stories, because "the GPU layout" is two different things to look at. Two of them attach
 * the deterministic fake accelerator, so the picture is the same picture on every machine and on
 * every run and a visual-regression service can hold a baseline for it. The third asks for a real
 * WebGPU device and is not snapshotted at all: on this file's own dev box it runs the real
 * kernels, on a machine with no device it reports `unavailable` and says why in the caption, and
 * either answer is correct -- which is exactly what makes it useless as a baseline.
 *
 * The caption is the point of all three. It is six lines of ordinary DOM listening to
 * `graphty-capabilities-change`, the event the element mirrors from its acceleration controller,
 * and it is the whole of what a consumer writes to show whether hardware is in use. No probe, no
 * device object, no GPU type named anywhere.
 * @module
 */

import "../index.ts";
import "../src/layout/index.ts"; // Ensure all layouts are registered
import "../src/data/index.ts"; // Ensure all data sources are registered
// Registers the WebGPU accelerator factory for the whole Storybook. The two fake stories are
// unaffected by it: they inject their accelerator with `setAccelerator`, and an injected
// accelerator is never replaced by a probe.
import "../webgpu";

import type { Decorator, Meta, StoryObj } from "@storybook/web-components-vite";

import type { AccelerationCapabilities, AccelerationStatus } from "../src/acceleration";
import { Graphty } from "../src/graphty-element";
import { createFakeAccelerator, type FakeAccelerator } from "../src/testing/fakeAccelerator";
import { storyGraph } from "../test/helpers/story-graph";
import { assertDistinctArrangement, drawn } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";

// The same 150 / 250 graph the real-GPU browser test lays out, so what a reader watches here and
// what the accelerator is measured on are one graph rather than two that look alike.
const { nodes: nodes150, edges: edges250 } = storyGraph(150, 250);

/** What the caption says before the element has published any status of its own. */
const CAPTION_SEED = "acceleration: --";

/** How the caption is drawn: a strip above the canvas, legible in a screenshot. */
const CAPTION_STYLE = [
    "padding: 10px 14px",
    "background: #1f2933",
    "color: #e4e7eb",
    "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
    "font-size: 13px",
    "flex-shrink: 0",
].join("; ");

/**
 * Turns an acceleration status into the one line the caption shows.
 *
 * The hardware is whichever of the three descriptions the backend actually filled in: a real
 * WebGPU adapter often reports an empty `device` description and names itself through `vendor`
 * instead, and "idle on " with nothing after it is not a caption.
 * @param status - What `capabilities.acceleration` says right now.
 * @returns The line, naming the state, the hardware when there is any, and the reason when there
 *   is one.
 */
function captionLine(status: AccelerationStatus): string {
    const hardware = [status.device, status.vendor, status.backend].find((name) => name !== undefined && name !== "");
    const where = hardware === undefined ? "" : ` on ${hardware}`;
    const why = status.reason === undefined ? "" : ` -- ${status.reason}`;

    return `acceleration: ${status.state}${where}${why}`;
}

/**
 * Wraps the element in a container with a caption that follows its capabilities.
 *
 * This is the six-line consumer: add a listener, read `detail.capabilities.acceleration`, write
 * it somewhere a person can see. The `graph-settled` listener beside it is for the case where
 * nothing transitions after the story mounts -- an accelerator injected before the element was
 * connected is already attached, so there is no transition to hear and the first reading has to
 * be taken rather than waited for.
 * @param element - The element the story rendered.
 * @returns The container to hand back to Storybook.
 */
function withCaption(element: Graphty): HTMLElement {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; flex-direction: column; height: 100vh;";

    const caption = document.createElement("div");
    caption.id = "acceleration-caption";
    caption.style.cssText = CAPTION_STYLE;
    caption.textContent = CAPTION_SEED;

    const refresh = (status: AccelerationStatus): void => {
        caption.textContent = captionLine(status);
    };

    element.addEventListener("graphty-capabilities-change", (event) => {
        const { capabilities } = (event as CustomEvent<{ capabilities: AccelerationCapabilities }>).detail;
        refresh(capabilities.acceleration);
    });
    element.addEventListener("graph-settled", () => {
        refresh(element.session.capabilities.acceleration);
    });

    element.style.cssText = "flex: 1; display: block; min-height: 0;";
    container.append(caption, element);

    return container;
}

/**
 * Builds the decorator every story here shares: configure the element, then caption it.
 *
 * The element the story function returns has its layout set but has not been connected yet, and
 * the element queues its layout until it is ready -- so an accelerator attached here is attached
 * before the layout it will drive ever runs.
 * @param configure - What this story does to the element before it is mounted.
 * @returns The decorator.
 */
function acceleratedStory(configure: (element: Graphty) => void): Decorator {
    return (story) => {
        const rendered = story();

        if (!(rendered instanceof Graphty)) {
            return rendered;
        }

        configure(rendered);

        return withCaption(rendered);
    };
}

/**
 * The sibling set the two fake stories check each other against, and how far apart they promise
 * to be.
 *
 * The real-WebGPU story is deliberately not in it: it is ForceAtlas2 with this same seed and
 * these same options, so it is MEANT to arrange the graph the way `ForceAtlas2Fake` does, and on
 * a machine with no device it is the same computation outright.
 *
 * The distance is a shape distance -- see `assertDistinctArrangement`. Measured on this graph
 * from seed 42: these two sit 0.613 apart, one model from two different seeds sits 1.5 to 1.6
 * apart, and the translating fake these stories used to run sat at 0.
 */
const FAKE_FAMILY = "Layout/GPU (fake accelerator)";

/** How far apart the two fake stories' arrangements must be. See {@link FAKE_FAMILY}. */
const FAKE_FAMILY_APART = 0.25;

/** The fake each fake-accelerator story attached, so that story's `play` can interrogate it. */
const fakes = new WeakMap<Graphty, FakeAccelerator>();

/**
 * Attaches the fake accelerator, set to compute the layout rather than to translate the graph.
 *
 * `computes: "layout"` IS WHAT MAKES THESE TWO STORIES SHOW ANYTHING. The fake's default batch
 * moves every unfixed node the same distance in the same direction, which is exact and is what
 * the unit tests assert on -- and is invisible here, because the element frames the camera on
 * whatever it is handed and a translated graph is the same picture in the same place. These
 * stories drew the seed scatter under a caption naming a layout, at any settle count, and the
 * distance everything moved was the one thing a reader could not see. Told to compute the layout
 * instead, the fake runs that layout's own simulation behind the accelerator seam, so the
 * arrangement on screen is ForceAtlas2's and Spring's, deterministic under the seed each story
 * names, and the batches the accelerator counted are the ones that produced it.
 *
 * Under Chromatic the arrangement is spent as PRE-STEPS, off the frame clock; everywhere else it
 * animates, a few iterations a frame: see the counts each story names.
 * @param element - The element to inject into.
 */
function attachFake(element: Graphty): void {
    const fake = createFakeAccelerator({ computes: "layout" });

    element.session.setAccelerator(fake);
    fakes.set(element, fake);
}

/**
 * Fails unless the settled arrangement came off the fake accelerator.
 *
 * The caption cannot say this on its own: `idle` is what an attached accelerator reads once the
 * layout has come to rest, and it is also what it reads when the layout never went near it. The
 * fake's own counters can -- it was asked to build this layout's simulation, and batches landed
 * on it -- so a story that silently stopped using the accelerator fails here rather than passing
 * on a caption that still looks right.
 * @param canvasElement - The story's root, as Storybook hands it to `play`.
 * @param builds - The counter this layout increments when its simulation is built.
 * @throws When the story attached no fake, or the fake built no simulation, or no batch landed.
 */
function assertRanOnTheFake(canvasElement: HTMLElement, builds: "forceAtlas2" | "fruchtermanReingold"): void {
    const element = canvasElement.querySelector("graphty-element");
    const fake = element instanceof Graphty ? fakes.get(element) : undefined;

    if (fake === undefined) {
        throw new Error("the story rendered no element with a fake accelerator attached");
    }

    if (fake.calls[builds] === 0 || fake.calls.resolved === 0) {
        throw new Error(
            `the layout did not run on the accelerator: ${builds} simulations built ${String(fake.calls[builds])}, batches landed ${String(fake.calls.resolved)}`,
        );
    }
}

/**
 * Asks for a real device, and takes the CPU path when there is none.
 * @param element - The element to configure.
 */
function askForWebGpu(element: Graphty): void {
    element.acceleration = "auto";
}

/**
 * Reads the caption the element's own event wrote.
 *
 * Call it after `waitForGraphSettled`, which every story here calls in its own `play` rather than
 * through a helper -- see {@link STORY_STYLES} for why the repetition is deliberate.
 * @param canvasElement - The story's root, as Storybook hands it to `play`.
 * @returns The caption text.
 * @throws When the story rendered no caption, or the caption still reads what it was seeded with
 *   -- either way the element published no status and the picture would be saying nothing.
 */
function publishedCaption(canvasElement: HTMLElement): string {
    const caption = canvasElement.querySelector("#acceleration-caption")?.textContent ?? "";

    if (caption === "" || caption === CAPTION_SEED) {
        throw new Error(`the element published no acceleration status; the caption reads "${caption}"`);
    }

    return caption;
}

/**
 * The styling all three stories draw with.
 *
 * It sits here and is named in each story's `args` rather than on the meta, and the seed and the
 * settle beside it are written out in every story for the same reason:
 * `test/integration/story-determinism.test.ts` reads one `export const X: Story = {...}` block at
 * a time, and a story on a physics layout has to carry its seed, its `storySetup()` and its
 * `waitForGraphSettled` inside that block. Meta-level defaults are invisible to it -- and to a
 * reader who opens one story to ask whether its picture is reproducible.
 */
const STORY_STYLES: Parameters<typeof storySetup>[0] = {
    edge: { "edge.color": "#666666" },
    node: { "node.color": "#5A67D8", "node.shape": "sphere", "node.size": 0.5 },
};

const meta: Meta = {
    title: "Layout/GPU",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    args: {
        nodeData: nodes150,
        edgeData: edges250,
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * ForceAtlas2 driven by the fake accelerator: the accelerated path, without a device in the
 * answer. The picture is ForceAtlas2's own arrangement of this graph, computed inside the
 * accelerator rather than beside it, so what a reader compares against the CPU stories is the
 * same layout reached the other way. The caption reads `active` while the layout is stepping and
 * `idle` once it has settled, which is where a screenshot catches it: both words mean an
 * accelerator is attached, and the story's `play` asks the fake itself whether the layout ran on
 * it.
 */
export const ForceAtlas2Fake: Story = {
    name: "ForceAtlas2 (fake accelerator)",
    /*
     * `preSteps` IS FORCEATLAS2'S OWN `maxIter`, which this story leaves at its default of 100, so
     * under Chromatic the iterations run before the first frame. Everywhere else the layout
     * animates at `stepMultiplier` iterations per RENDERED frame, and this scene renders slowly in
     * the Storybook test browser's software renderer: a frame of 150 spheres takes about 200 ms
     * to draw on a fast desktop, plus 45 to 65 ms while the layout moves, most of it the 250
     * edges intersecting their rays with the sphere meshes. The CI runner is slower still: at four
     * iterations a frame, 25 frames, both ForceAtlas2 stories were still moving when the 15 second
     * wait for a final frame gave up. Twenty a frame is 5 frames. The arrangement is the same one:
     * the simulation stops at `maxIter` whichever clock ran it.
     */
    args: {
        layout: "forceatlas2",
        layoutConfig: { seed: 42 },
        setup: storySetup({ ...STORY_STYLES, preSteps: 100, stepMultiplier: 20 }),
    },
    decorators: [acceleratedStory(attachFake)],
    play: async ({ canvasElement }): Promise<void> => {
        await waitForGraphSettled(canvasElement);

        const caption = publishedCaption(canvasElement);

        if (!caption.includes("active") && !caption.includes("idle")) {
            throw new Error(`the fake accelerator was injected but the caption reads "${caption}"`);
        }

        assertRanOnTheFake(canvasElement, "forceAtlas2");
        await assertDistinctArrangement(
            await drawn(canvasElement, "Layout/GPU ForceAtlas2 (fake accelerator)"),
            FAKE_FAMILY,
            FAKE_FAMILY_APART,
        );
    },
};

/**
 * Spring (Fruchterman-Reingold) on the same fake, so the second accelerated layout has a picture
 * of its own rather than being taken on trust from the first.
 */
export const SpringFake: Story = {
    name: "Spring (fake accelerator)",
    // `preSteps` is Spring's own `iterations`, which this story leaves at its default of 50, and
    // `stepMultiplier` keeps the animation outside Chromatic to 5 frames. See ForceAtlas2Fake
    // above.
    args: {
        layout: "spring",
        layoutConfig: { seed: 42 },
        setup: storySetup({ ...STORY_STYLES, preSteps: 50, stepMultiplier: 10 }),
    },
    decorators: [acceleratedStory(attachFake)],
    play: async ({ canvasElement }): Promise<void> => {
        await waitForGraphSettled(canvasElement);

        const caption = publishedCaption(canvasElement);

        if (!caption.includes("active") && !caption.includes("idle")) {
            throw new Error(`the fake accelerator was injected but the caption reads "${caption}"`);
        }

        assertRanOnTheFake(canvasElement, "fruchtermanReingold");
        await assertDistinctArrangement(
            await drawn(canvasElement, "Layout/GPU Spring (fake accelerator)"),
            FAKE_FAMILY,
            FAKE_FAMILY_APART,
        );
    },
};

/**
 * ForceAtlas2 on whatever WebGPU this machine has.
 *
 * Not snapshotted: with a device it is the real kernels in single precision, and without one it
 * is the CPU simulation, and a baseline that means two different pictures depending on the
 * machine is a baseline that fails for the wrong reason. Its `play` asserts only that the
 * element said where the work ran.
 */
export const ForceAtlas2WebGpu: Story = {
    name: "ForceAtlas2 (WebGPU)",
    // `preSteps` is ForceAtlas2's own `maxIter`, left at its default of 100, and `stepMultiplier`
    // keeps the animation outside Chromatic to 5 frames. See ForceAtlas2Fake above.
    args: {
        layout: "forceatlas2",
        layoutConfig: { seed: 42 },
        setup: storySetup({ ...STORY_STYLES, preSteps: 100, stepMultiplier: 20 }),
    },
    decorators: [acceleratedStory(askForWebGpu)],
    parameters: {
        chromatic: {
            disableSnapshot: true,
        },
    },
    play: async ({ canvasElement }): Promise<void> => {
        await waitForGraphSettled(canvasElement);

        publishedCaption(canvasElement);
    },
};
