import { describe, expect, it } from "vitest";

import { modeGlobals } from "../capture/story-test-setup.mjs";

describe("modeGlobals", () => {
    it("lets a story's own global win over the capture mode's, as iframe.html does (#5836)", () => {
        const globals = { colorScheme: "light", locale: "en" };
        expect(modeGlobals(globals, { colorScheme: "light" }, { colorScheme: "dark" })).toEqual(globals);
    });

    it("lets the mode win over the story's defaults when the story forces nothing", () => {
        expect(modeGlobals({ colorScheme: "light", locale: "en" }, {}, { colorScheme: "dark" })).toEqual({
            colorScheme: "dark",
            locale: "en",
        });
    });

    it("renders with the story's globals when there is no mode", () => {
        expect(modeGlobals({ colorScheme: "light" }, {}, null)).toEqual({ colorScheme: "light" });
    });
});
