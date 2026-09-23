import { describe, expect, it } from "vitest";

/**
 * Storybook does not run `src/main.tsx`, so the App story has to define `<graphty-element>`
 * itself. When it does not, the tag stays an unknown element: no canvas is drawn and the
 * canvas region shows the page behind it -- black in the dark theme -- instead of the
 * element's whitesmoke background.
 */
describe("App story", () => {
    it("defines <graphty-element> so the canvas is drawn", async () => {
        await import("./App.stories");
        expect(customElements.get("graphty-element")).toBeDefined();
    });
});
