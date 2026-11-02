import { describe, expect, it } from "vitest";

import { modeGlobals } from "../capture/story-test-setup.mjs";

const project = { globalTypes: { colorScheme: {} }, initialGlobals: { theme: "dark" } };

describe("modeGlobals", () => {
    it("lets a mode set a global the story leaves to the project", () => {
        expect(modeGlobals({ theme: "dark" }, { colorScheme: "dark", theme: "light" }, project)).toEqual({
            theme: "light",
            colorScheme: "dark",
        });
    });

    it("keeps a global the story sets itself, as Storybook does for a mode in the URL", () => {
        expect(modeGlobals({ theme: "dark", colorScheme: "light" }, { colorScheme: "dark" }, project)).toEqual({
            theme: "dark",
            colorScheme: "light",
        });
    });
});
