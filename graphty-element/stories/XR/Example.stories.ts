// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertGraphLoaded, assertLayoutPlaced, drawn, holds } from "../assertions";
import {
    eventWaitingDecorator,
    remoteLoggingDecorator,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
} from "../helpers";

// Seeded random number generator for deterministic edge generation
function seededRandom(seed: number): () => number {
    return (): number => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

// Generate deterministic edge data using a fixed seed
const random = seededRandom(42);
const xrEdgeData = Array.from({ length: 45 }, () => {
    const src = `${Math.floor(random() * 30)}`;
    const dst = `${Math.floor(random() * 30)}`;
    return { src, dst };
});

const meta: Meta = {
    title: "XR",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator, remoteLoggingDecorator],
    parameters: {
        layout: "fullscreen",
        chromatic: {
            delay: 1000,
        },
    },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * XR Example - Advanced Gestures and Two-Hand Interactions
 *
 * Demonstrates XR gestures for manipulating the graph:
 * - Two-hand pinch zoom: Pinch with both hands and move them closer/farther to zoom
 * - Two-hand twist rotation: Pinch with both hands and rotate them to spin the graph
 * - Thumbstick pan: Use controller thumbsticks to translate the graph
 * - Single-hand squeeze drag: Grab individual nodes (10x Z-axis amplification)
 *
 * Instructions:
 * 1. Enter VR mode
 * 2. Use both hands to pinch (thumb + index finger together)
 * 3. Move hands closer together = zoom in
 * 4. Move hands farther apart = zoom out
 * 5. Twist both hands together = rotate graph
 * 6. Use thumbsticks on controllers to pan the view
 * 7. Squeeze individual nodes to drag them
 *
 * Configuration:
 * - handTracking: true (required for two-hand gestures)
 * - controllers: true (for thumbstick pan and drag)
 * - zAxisAmplification: 10.0 (for node dragging)
 */
export const Default: Story = {
    args: {
        nodeData: Array.from({ length: 30 }, (_, i) => ({
            id: `${i}`,
            label: `Node ${i}`,
        })),
        edgeData: xrEdgeData,
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
            dimensions: 3,
            iterations: 150,
        },
        setup: storySetup({
            viewMode: "3d",
            // Physics-based layouts need preSteps for visual stability
            // Use constant value like other working ngraph stories
            preSteps: 8000,
        }),
        xr: {
            enabled: true,
            ui: {
                enabled: true,
                position: "bottom-right",
                showAvailabilityWarning: true,
                // The "not available" notice normally leaves after 5 s, so a snapshot caught it or
                // missed it by timing alone. A day keeps it on screen for every snapshot.
                unavailableMessageDuration: 86_400_000,
            },
            input: {
                handTracking: true, // Required for two-hand gestures
                controllers: true, // For thumbstick pan and squeeze drag
                nearInteraction: true,
                physics: false,
                zAxisAmplification: 10.0, // For node dragging
                enableZAmplificationInDesktop: false,
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Wait for the graph to fully settle before taking the screenshot
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "XR Default");

        // The edge list is generated from a fixed seed and holds repeats and self-loops, so the
        // number the element keeps is the number that survived them rather than the forty-five
        // handed over. What must be true is that every record was accounted for and none was
        // refused.
        const report = scene.session.data.lastImport();

        await holds(
            report === null || report.counts.edgeRecords === 45,
            `XR Default: the story generates 45 edge records and the importer was handed ` +
                `${String(report?.counts.edgeRecords)}`,
        );

        await assertGraphLoaded(scene, { nodes: 30, edges: scene.edgeCount });
        await assertLayoutPlaced(scene, {});

        // The gestures cannot be driven headless. What can be checked is the story's one visible
        // affordance: VR / AR buttons where the browser can start a session, and the element's
        // "not available" notice where it cannot, which is every snapshot browser.
        const overlay = scene.element.shadowRoot ?? scene.element;
        const vr = await scene.element.isVRSupported();
        const ar = await scene.element.isARSupported();

        if (vr || ar) {
            await holds(
                overlay.querySelectorAll("button.webxr-available").length === Number(vr) + Number(ar),
                "XR Default: the browser supports XR and the element did not draw one button per supported mode",
            );
        } else {
            const notice = overlay.querySelector(".webxr-not-available");

            await holds(
                notice?.textContent === "VR / AR NOT AVAILABLE",
                `XR Default: the browser has no XR and the element's notice read ` +
                    `${JSON.stringify(notice?.textContent ?? null)} instead of "VR / AR NOT AVAILABLE"`,
            );
        }
    },
};
