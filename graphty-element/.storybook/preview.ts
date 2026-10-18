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
    // `setup` is how a story hands its own fixture (styles, pre-steps, view mode) to the render
    // function. It is not an element property, so it stays out of the Controls and Docs tables.
    argTypes: {
        setup: { table: { disable: true } },
    },
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
            // The Docs page shows the primary story only: every story starts its own WebGL engine,
            // and a page with ten of them hits the browser's limit on live contexts.
            page: DocumentationTemplate,
            // The code a consumer writes, beside every story's canvas (stories/helpers.ts,
            // consumerSource), rather than only on the Docs page.
            codePanel: true,
        },
        chromatic: {
            delay: 500, // Initial delay for graph setup
            pauseAnimationAtEnd: true,
            // Pinned rather than left to the capture tool's default, so the size of every snapshot is a
            // decision recorded here.
            viewports: [1200],
        },
        // The accessibility addon checks every story when the storybook test project runs it. At
        // this level a violation is reported without failing the story; it moves to "error" once
        // the package's count, recorded in tools/storybook-taxonomy.json, reaches zero.
        a11y: {
            test: "todo",
        },
        options: {
            // The sidebar follows reader tasks (design/storybook/strategy.md, section 2). The section
            // list lives in tools/storybook-taxonomy.json, but Storybook reads storySort only as a
            // literal written here -- it parses this file rather than running it -- so the list is
            // repeated and test/contracts/story-sort-order.test.ts fails when the two differ.
            // Within a component the stories keep their file's export order: Default, Playground,
            // then one per feature.
            storySort: {
                order: [
                    "Introduction",
                    ["Welcome", "Getting started", "First graph", "Concepts", "Using with React"],
                    "Data",
                    ["Overview", "*"],
                    "Layout",
                    ["Overview", "*"],
                    "Styling",
                    ["Overview", "*"],
                    "Algorithms",
                    ["Overview", "*"],
                    "Interaction",
                    ["Overview", "*"],
                    "XR",
                    ["Overview", "*"],
                    "Configuration",
                    ["Overview", "*"],
                    "Extending",
                    ["Overview", "*"],
                    "Performance",
                    ["Overview", "*"],
                    "Examples",
                    ["Overview", "*"],
                ],
            },
        },
    },
};

export default preview;
