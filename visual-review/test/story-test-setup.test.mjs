import { describe, expect, it } from "vitest";

import { modeGlobals, shotsDisagreed } from "../capture/story-test-setup.mjs";

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

describe("shotsDisagreed", () => {
    it("fails a story whose second shot matched the baseline after a first that did not (#3389)", () => {
        expect(shotsDisagreed({ status: "unchanged", flaky: true })).toBe(true);
    });

    it("fails an unstable story and passes a changed or unchanged one", () => {
        expect(shotsDisagreed({ status: "unstable" })).toBe(true);
        expect(shotsDisagreed({ status: "changed" })).toBe(false);
        expect(shotsDisagreed({ status: "unchanged" })).toBe(false);
    });
});
