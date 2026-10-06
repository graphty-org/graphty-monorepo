// import "@storybook/addon-console";
import "../src/algorithms/index";
import "../src/data/index";
import "../src/layout/index";

import { Preview, setCustomElementsManifest } from "@storybook/web-components-vite";
// @ts-expect-error TS doesn't recognize virtual imports?
import manifest from "virtual:vite-plugin-cem/custom-elements-manifest";

import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";

import { pinLabelFont } from "../test/helpers/pin-label-font";

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

const preview: Preview = {
    // Label text is drawn in a font this repository ships, registered under the element's default
    // family, so a snapshot does not depend on which fonts the capturing machine has installed. A
    // loader finishes before the story renders, so no frame is ever drawn in a fallback font.
    loaders: [
        async () => {
            await pinLabelFont();
            return {};
        },
    ],
    parameters: {
        // actions: { argTypesRegex: "^on[A-Z].*" },
        controls: {
            expanded: true,
            matchers: {
                // Only names that end in "color": the element's own `background` property is a
                // background config object (a color or a skybox), not a color string, and a story
                // that wants a color picker for it says so in its argTypes (GraphStyles does).
                color: /color$/i,
                date: /Date$/i,
            },
        },
        docs: {
            page: DocumentationTemplate,
        },
        chromatic: {
            delay: 500, // Initial delay for graph setup
            pauseAnimationAtEnd: true,
            // Pinned rather than left to Chromatic's default, so the size of every snapshot is a
            // decision recorded here.
            viewports: [1200],
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
