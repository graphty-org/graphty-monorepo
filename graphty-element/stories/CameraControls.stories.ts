import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import { ref } from "lit/directives/ref.js";

import { Graphty } from "../src/graphty-element";
import { assertGraphLoaded, assertLayoutPlaced, assertViewMode, drawn, holds } from "./assertions";
import { edgeData, eventWaitingDecorator, nodeData, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

/**
 * Settle a camera story, then press one of its own buttons and check the camera moved.
 *
 * WHAT THIS STORY IS FOR is the buttons: every one of them asks the element to fly the camera
 * somewhere, and nothing checked that any of them did. A story whose buttons are all inert draws
 * exactly the same picture as one whose buttons work.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @param mode - The view mode this variant is drawn in.
 */
const flies = async (canvasElement: HTMLElement, story: string, mode: "2d" | "3d"): Promise<void> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Camera Controls ${story}`);

    await assertGraphLoaded(scene, { nodes: 6, edges: 6 });
    await assertLayoutPlaced(scene, {});
    await assertViewMode(scene, mode);

    const buttons = [...canvasElement.querySelectorAll("button")];

    await holds(
        buttons.length >= 5,
        `Camera Controls ${story}: the presets are the story and it put ${String(buttons.length)} buttons on ` +
            "the page",
    );

    // WHERE THE CAMERA IS, in whichever of the two senses this variant uses. A perspective camera
    // zooms by moving; an orthographic one zooms by changing the box it projects, and its position
    // does not move at all -- so reading only the position would report the 2D presets as inert
    // when they are working.
    const where = (): string => {
        const camera = scene.graph.scene.activeCamera as
            | { position: { x: number; y: number; z: number }; orthoLeft?: number | null; orthoTop?: number | null }
            | null;

        return [camera?.position.x, camera?.position.y, camera?.position.z, camera?.orthoLeft, camera?.orthoTop]
            .map((value) => (typeof value === "number" ? value.toFixed(3) : "-"))
            .join(",");
    };

    const before = where();

    buttons[0].click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const afterPreset = where();

    await holds(
        afterPreset !== before,
        `Camera Controls ${story}: pressing "${String(buttons[0].textContent).trim()}" left the camera at ` +
            `(${before}), where it already was`,
    );

    // The last button is Reset, which must bring it back somewhere else again.
    buttons[buttons.length - 1].click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await holds(
        where() !== afterPreset,
        `Camera Controls ${story}: pressing "${String(buttons[buttons.length - 1].textContent).trim()}" left ` +
            `the camera where the preset put it (${afterPreset})`,
    );
};

const meta: Meta = {
    title: "Camera Controls",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
    parameters: {
        layout: "fullscreen",
    },
    argTypes: {
        duration: {
            control: { type: "range", min: 100, max: 3000, step: 100 },
            description: "Animation duration in milliseconds",
        },
        easing: {
            control: { type: "select" },
            options: ["linear", "easeIn", "easeOut", "easeInOut"],
            description: "Animation easing function",
        },
    },
    args: {
        nodeData,
        edgeData,
        duration: 800,
        easing: "easeInOut",
    },
};
export default meta;

type Story = StoryObj<Graphty & { duration: number; easing: string }>;

/**
 * 3D camera controls with animated transitions.
 */
export const ThreeD: Story = {
    name: "3D",
    args: {
        layoutConfig: { seed: 42 },
    },
    render: (args) => html`
        <div style="display: flex; flex-direction: column; height: 100vh;">
            <div style="flex: 1; min-height: 0;">
                <graphty-element
                    id="graph-animation"
                    style="width: 100%; height: 100%; display: block;"
                    .nodeData=${args.nodeData}
                    .edgeData=${args.edgeData}
                    .layoutConfig=${args.layoutConfig}
                    ${ref((el) => {
                        if (el instanceof Graphty) {
                            setLayoutPreSteps(el, 2000);
                        }
                    })}
                ></graphty-element>
            </div>

            <div style="padding: 16px; background: #f5f5f5; border-top: 1px solid #ddd;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPosition(
                                { x: 30, y: 30, z: 30 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Close
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPosition(
                                { x: 150, y: 150, z: 150 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Far
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPosition(
                                { x: 0, y: 100, z: 0 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Top
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPosition(
                                { x: 100, y: 0, z: 0 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Side
                    </button>

                    <span style="border-left: 1px solid #ccc; height: 24px; margin: 0 8px;"></span>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.resetCamera({
                                animate: true,
                                duration: args.duration,
                                easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                            });
                        }}
                        style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    `,
    play: async ({ canvasElement }) => {
        await flies(canvasElement, "3D", "3d");
    },
};

/**
 * 2D camera with zoom and pan controls.
 */
export const TwoD: Story = {
    name: "2D",
    args: {
        layoutConfig: { seed: 42 },
    },
    render: (args) => html`
        <div style="display: flex; flex-direction: column; height: 100vh;">
            <div style="flex: 1; min-height: 0;">
                <graphty-element
                    id="graph-animation-2d"
                    style="width: 100%; height: 100%; display: block;"
                    .nodeData=${args.nodeData}
                    .edgeData=${args.edgeData}
                    .layoutConfig=${args.layoutConfig}
                    ${ref((el) => {
                        if (el instanceof Graphty) {
                            // The 2D story's own setup: the view mode and the background it is
                            // drawn against, beside the pre-steps every story needs.
                            el.viewMode = "2d";
                            el.background = { backgroundType: "color", color: "#f0f0f0" };
                            setLayoutPreSteps(el, 2000);
                        }
                    })}
                ></graphty-element>
            </div>

            <div style="padding: 16px; background: #f5f5f5; border-top: 1px solid #ddd;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            const state = el.getCameraState();

                            void el.setCameraZoom((state.zoom ?? 1) * 1.5, {
                                animate: true,
                                duration: args.duration,
                                easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                            });
                        }}
                        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Zoom In
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            const state = el.getCameraState();

                            void el.setCameraZoom((state.zoom ?? 1) / 1.5, {
                                animate: true,
                                duration: args.duration,
                                easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                            });
                        }}
                        style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Zoom Out
                    </button>

                    <span style="border-left: 1px solid #ccc; height: 24px; margin: 0 8px;"></span>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPan(
                                { x: -50, y: 0 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Left
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPan(
                                { x: 50, y: 0 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Right
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPan(
                                { x: 0, y: 50 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Up
                    </button>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.setCameraPan(
                                { x: 0, y: -50 },
                                {
                                    animate: true,
                                    duration: args.duration,
                                    easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                                },
                            );
                        }}
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Down
                    </button>

                    <span style="border-left: 1px solid #ccc; height: 24px; margin: 0 8px;"></span>

                    <button
                        @click=${() => {
                            const el = document.querySelector("#graph-animation-2d");
                            if (!(el instanceof Graphty)) {
                                return;
                            }

                            void el.resetCamera({
                                animate: true,
                                duration: args.duration,
                                easing: args.easing as "linear" | "easeIn" | "easeOut" | "easeInOut",
                            });
                        }}
                        style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    `,
    play: async ({ canvasElement }) => {
        await flies(canvasElement, "2D", "2d");
    },
};
