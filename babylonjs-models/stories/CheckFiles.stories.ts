import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor, within } from "storybook/test";

import { checkModelFiles, DEFAULT_MODEL_LIMITS, listParts, ModelError } from "../src/files/index.js";
import { createOutput, fetchSample, type SampleName, SAMPLES } from "./samples.js";

interface Args {
    sample: SampleName;
}

const meta: Meta<Args> = {
    title: "Check files without Babylon.js",
    parameters: {
        docs: {
            description: {
                component:
                    "`babylonjs-models/files` never loads Babylon.js: `listParts` names every file a model needs " +
                    "and whether the set holds it, and `checkModelFiles` checks the set and summarizes the model.",
            },
        },
    },
};
export default meta;

/** The parts a sample's model needs, and what checking its files reports. */
export const Parts: StoryObj<Args> = {
    args: { sample: "OBJ missing its picture" },
    argTypes: { sample: { control: "select", options: Object.keys(SAMPLES) } },
    render: ({ sample }) => {
        const output = createOutput("result");
        void (async () => {
            const files = await fetchSample(sample);
            const parts = listParts(files, {}, DEFAULT_MODEL_LIMITS);
            let checked: unknown;
            try {
                const { format, summary, warnings } = await checkModelFiles(files, {}, DEFAULT_MODEL_LIMITS);
                checked = { format, triangles: summary.triangles, warnings };
            } catch (error) {
                if (!(error instanceof ModelError)) {
                    throw error;
                }
                checked = { error: error.facts };
            }
            output.textContent = JSON.stringify({ parts, checked }, null, 2);
            output.dataset.state = "done";
        })();
        return output;
    },
    play: async ({ canvasElement }) => {
        const result = await within(canvasElement).findByTestId("result");
        await waitFor(() => expect(result.dataset.state).toBe("done"));
        await expect(result.textContent).toContain('"name": "cube.png"');
    },
};
