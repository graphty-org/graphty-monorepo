import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { detectLocationFormat, LOCATION_FORMATS, type LocationFormat, parseLocation } from "../src/location/index.js";
import { createOutput } from "./scene.js";

const meta: Meta = {
    title: "Read a location",
    parameters: {
        docs: {
            description: {
                component:
                    "`babylonjs-map/location` never loads Babylon.js. `parseLocation` reads a decimal pair, " +
                    "degrees-minutes-seconds, WKT, GeoJSON, ISO 6709, a geohash, a plus code, MGRS or UTM, and " +
                    "returns `{ lat, lon }` or an error `{ code, params }`; it never throws. " +
                    "`detectLocationFormat` picks one format for a column of values.",
            },
        },
    },
};
export default meta;

/**
 * A text field and its label.
 * @param label - The label.
 * @param field - The field.
 * @returns The label wrapping the field.
 */
function labeled(label: string, field: HTMLElement): HTMLLabelElement {
    const element = document.createElement("label");
    element.style.cssText = "display: flex; flex-direction: column; gap: 4px; font-size: 12px;";
    element.append(label, field);
    return element;
}

/** Type a location and see what `parseLocation` reads, in any format or in one. */
export const ParseLocation: StoryObj<{ value: string }> = {
    args: { value: "40 38 23 N, 73 46 44 W" },
    render: ({ value }) => {
        const element = document.createElement("div");
        element.style.cssText = "display: flex; flex-direction: column; gap: 8px; width: 420px;";
        const input = document.createElement("input");
        input.value = value;
        const format = document.createElement("select");
        for (const id of ["auto", ...LOCATION_FORMATS]) {
            format.add(new Option(id, id));
        }
        const output = createOutput("result");
        const show = (): void => {
            output.textContent = JSON.stringify(parseLocation(input.value, format.value as LocationFormat | "auto"));
        };
        input.addEventListener("input", show);
        format.addEventListener("change", show);
        show();
        element.append(labeled("Location", input), labeled("Format", format), output);
        return element;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText("Location");
        await userEvent.clear(input);
        await userEvent.type(input, "POINT(-73.78 40.64)");
        await waitFor(() => expect(canvas.getByTestId("result").textContent).toBe('{"lat":40.64,"lon":-73.78}'));
        await userEvent.clear(input);
        await userEvent.type(input, "95, 10");
        await waitFor(() => expect(canvas.getByTestId("result").textContent).toContain('"code":"range"'));
    },
};

/** One value per line: the format `detectLocationFormat` picks for the column, and each value read in it. */
export const DetectColumnFormat: StoryObj<{ column: string }> = {
    args: { column: ["dr5x1n7", "gcpvj0d", "u09tvw0", "xn76cyd"].join("\n") },
    render: ({ column }) => {
        const element = document.createElement("div");
        element.style.cssText = "display: flex; gap: 16px; align-items: flex-start;";
        const values = document.createElement("textarea");
        values.rows = 8;
        values.value = column;
        const output = createOutput("result");
        output.style.width = "420px";
        const show = (): void => {
            const lines = values.value.split("\n").filter((line) => line.trim() !== "");
            const detection = detectLocationFormat(lines);
            output.textContent = JSON.stringify(
                { ...detection, points: lines.map((line) => parseLocation(line, detection.format ?? "decimal")) },
                null,
                2,
            );
        };
        values.addEventListener("input", show);
        show();
        element.append(labeled("Column", values), output);
        return element;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId("result").textContent).toContain('"format": "geohash"');
        await userEvent.clear(canvas.getByLabelText("Column"));
        await userEvent.type(canvas.getByLabelText("Column"), "51.5074 N, 0.1278 W{enter}48.8566, 2.3522");
        await waitFor(() => expect(canvas.getByTestId("result").textContent).toContain('"format": "dms"'));
    },
};
