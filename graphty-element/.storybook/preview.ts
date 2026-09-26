// import "@storybook/addon-console";
import "../src/algorithms/index";
import "../src/data/index";
import "../src/layout/index";

import { Preview, setCustomElementsManifest } from "@storybook/web-components-vite";
import isChromatic from "chromatic/isChromatic";
// @ts-expect-error TS doesn't recognize virtual imports?
import manifest from "virtual:vite-plugin-cem/custom-elements-manifest";

import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Force import and registration of graphty-element and all its dependencies
import { Graphty } from "../src/graphty-element";
// @ts-expect-error MDX files are handled by Storybook's build system
import DocumentationTemplate from "./DocumentationTemplate.mdx";

// Ensure custom element is registered
if (!customElements.get("graphty-element")) {
    // console.log("[preview] Registering graphty-element...");
    customElements.define("graphty-element", Graphty);
}

// Initialize console capture with UI
initConsoleCaptureUI();

// eruda.init();
// eruda.show("console");
// eruda.position({x: window.innerWidth - 60, y: 20});

setCustomElementsManifest(manifest);

// Global play function to wait for graph to settle
async function waitForGraphSettled({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
    const graphtyElement = canvasElement.querySelector("graphty-element");
    if (!graphtyElement) {
        // No graphty-element in this story
        return;
    }

    // Wait for the graph-settled event
    await new Promise<void>((resolve) => {
        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                console.warn("Graph settled timeout - proceeding anyway");
                settled = true;
                resolve();
            }
        }, 10000); // 10 second timeout

        const handleSettled = (): void => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve();
            }
        };

        // Add the event listener
        graphtyElement.addEventListener("graph-settled", handleSettled, { once: true });
    });
}

/**
 * How many simulation steps a story runs before its first frame.
 *
 * PRE-STEPS ARE WHY A SNAPSHOT IS THE SAME PICTURE TWICE: an unstepped force layout is a graph
 * in mid-flight, and how far it has flown depends on when the picture was taken.
 */
const CHROMATIC_PRE_STEPS = 1000;

const preview: Preview = {
    decorators: [
        (Story) => {
            // Ensure all stories have a minimum preSteps configuration
            // This decorator runs before the story renders
            const originalStory = Story();

            // If the story returns a graphty-element, ensure it has preSteps
            if (
                originalStory &&
                typeof originalStory === "object" &&
                "tagName" in originalStory &&
                originalStory.tagName === "GRAPHTY-ELEMENT"
            ) {
                const graphty = originalStory as Graphty;

                // PRE-STEPS ARE WHY A CHROMATIC SNAPSHOT IS THE SAME PICTURE TWICE. A physics
                // layout that has not been stepped is a graph flying apart, and how far apart
                // depends on when the screenshot was taken.
                //
                // Only when the story has not asked for something else. A story that wants an
                // unsettled graph -- one demonstrating the layout running, say -- must be able
                // to have one, so a pre-step count the story set is left alone. Outside Chromatic
                // nothing is pre-stepped, so the reader watches the layout settle.
                if (isChromatic() && graphty.layoutBehavior === undefined) {
                    graphty.layoutBehavior = { layout: { preSteps: CHROMATIC_PRE_STEPS } };
                }
            }

            return originalStory;
        },
    ],
    parameters: {
        // actions: { argTypesRegex: "^on[A-Z].*" },
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            page: DocumentationTemplate,
        },
        chromatic: {
            delay: 500, // Initial delay for graph setup
            pauseAnimationAtEnd: true,
        },
        // Add play function to all stories to wait for graph settling
        play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
            await waitForGraphSettled({ canvasElement });
        },
        options: {
            storySort: {
                method: "alphabetical",
                order: [
                    // Graphty stories first
                    "Graphty",
                    ["Default", "*"],
                    // Then other top-level stories
                    "Data",
                    ["Default", "*"],
                    "Calculated",
                    ["Default", "*"],
                    // Layout stories
                    "Layout",
                    ["3D", ["Default", "*"], "2D", ["Default", "*"]],
                    // Style stories
                    "Styles",
                    [
                        "Node",
                        ["Default", "*"],
                        "Edge",
                        ["Default", "*"],
                        "Graph",
                        ["Default", "*"],
                        "Label",
                        ["Default", "*"],
                    ],
                ],
                includeNames: true,
            },
        },
    },
};

export default preview;

// Export the play function for use in stories
export { waitForGraphSettled };
