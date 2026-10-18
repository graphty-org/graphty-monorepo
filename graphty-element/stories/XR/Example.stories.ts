// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertGraphLoaded, assertLayoutPlaced, drawn, holds } from "../assertions";
import { captioned } from "../caption";
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

/** What a consumer writes: turn XR on, with hand tracking and controllers. */
const XR_SOURCE = `const graph = document.querySelector("graphty-element");

graph.xr = {
    enabled: true,
    // The VR and AR buttons, or a notice when the browser has no headset.
    ui: { enabled: true, position: "bottom-right", showAvailabilityWarning: true },
    input: {
        handTracking: true, // two-hand pinch to zoom, twist to rotate
        controllers: true, // thumbstick to pan, squeeze a node to drag it
        nearInteraction: true,
        zAxisAmplification: 10, // how far a node moves toward or away from you as you drag
    },
};`;

const meta: Meta = {
    title: "XR/Gestures",
    id: "xr",
    component: "graphty-element",
    tags: ["autodocs"],
    render: renderFn,
    decorators: [eventWaitingDecorator, remoteLoggingDecorator],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Look at the graph in a VR headset or in AR. Needs a VR or AR device and a WebXR " +
                    "browser; set `xr.enabled` and the element draws a VR and an AR button in the " +
                    "corner of the canvas, or a 'VR / AR NOT AVAILABLE' notice when the browser has no " +
                    "headset. In the headset: pinch with both hands and move them apart or together to " +
                    "zoom, twist both hands to rotate the graph, push a controller thumbstick to pan, " +
                    "and squeeze a node to drag it. To select nodes in a headset, see XR / Selection.",
            },
            source: { code: XR_SOURCE },
        },
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
    name: "Gestures in a headset",
    decorators: [
        captioned(
            "Needs a VR or AR device. In the headset: pinch with both hands to zoom, twist them to " +
                "rotate, push a thumbstick to pan, squeeze a node to drag it.",
        ),
    ],
    args: {
        nodeData: Array.from({ length: 30 }, (_, i) => ({
            id: `${i}`,
            label: `Node ${i}`,
        })),
        edgeData: xrEdgeData,
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
            dim: 3,
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
            `XR Default: the story generates 45 edge records and the importer was handed ${String(
                report?.counts.edgeRecords,
            )}`,
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
