import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { fetchSample, type SampleName, SAMPLES } from "./samples.js";
import { createViewer } from "./viewer.js";

interface Args {
    sample: SampleName;
}

const meta: Meta<Args> = {
    title: "Load a model",
    parameters: {
        docs: {
            description: {
                component:
                    "`loadModel(scene, source)` checks a model's files, loads them into an `AssetContainer` and " +
                    "reports what it found. Drag the model to turn it; scroll to zoom.",
            },
        },
    },
};
export default meta;

type Story = StoryObj<Args>;

/** One of the sample models, given as `{ files }`, a map of name to bytes. */
export const Samples: Story = {
    args: { sample: "GLB with a picture" },
    argTypes: { sample: { control: "select", options: Object.keys(SAMPLES) } },
    render: ({ sample }) => {
        const viewer = createViewer();
        void fetchSample(sample).then((files) => viewer.show({ files }));
        return viewer.element;
    },
    play: async ({ canvasElement }) => {
        const result = await within(canvasElement).findByTestId("result");
        await waitFor(() => expect(result.dataset.state).toBe("loaded"));
        await expect(result.textContent).toContain('"format": "glb"');
    },
};

/**
 * A model missing an optional part is refused with `E_MODEL_MISSING_FILE`, naming the part; passing it in
 * `skipped` loads the model without it.
 */
export const MissingPicture: Story = {
    args: { sample: "OBJ missing its picture" },
    argTypes: Samples.argTypes,
    render: ({ sample }) => {
        const viewer = createViewer();
        const button = document.createElement("button");
        button.textContent = "Load without cube.png";
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; align-items: flex-start;";
        wrapper.append(button, viewer.element);
        void fetchSample(sample).then((files) => {
            void viewer.show({ files });
            button.addEventListener("click", () => void viewer.show({ files }, { skipped: ["cube.png"] }));
        });
        return wrapper;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const result = await canvas.findByTestId("result");
        await waitFor(() => expect(result.dataset.state).toBe("refused"));
        await expect(result.textContent).toContain("E_MODEL_MISSING_FILE");
        await userEvent.click(canvas.getByRole("button", { name: "Load without cube.png" }));
        await waitFor(() => expect(result.dataset.state).toBe("loaded"));
    },
};

/** Your own files: one model, a model with its parts, or a `.zip`. */
export const YourFiles: Story = {
    render: () => {
        const viewer = createViewer();
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.setAttribute("aria-label", "Model files");
        input.addEventListener("change", () => {
            if (input.files?.length) {
                void viewer.show(input.files);
            }
        });
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
        wrapper.append(input, viewer.element);
        return wrapper;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const files = await fetchSample("OBJ with its MTL");
        const picked = [...files].map(([name, bytes]) => new File([bytes], name));
        await userEvent.upload(canvas.getByLabelText("Model files"), picked);
        const result = canvas.getByTestId("result");
        await waitFor(() => expect(result.dataset.state).toBe("loaded"));
        await expect(result.textContent).toContain('"format": "obj"');
    },
};
