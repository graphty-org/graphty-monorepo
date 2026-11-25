/**
 * A refusal while a load applies a file's styles (its background) is reported with the refusal's
 * own code, never as a value graphty-element has no counterpart for.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, GraphtyError } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

describe("refusals while a file's styles are applied", () => {
    it("refuses a background color it cannot parse with E_BAD_COMMAND", async () => {
        const session = createGraphSession();
        let caught: unknown;
        try {
            await session.config.set({ background: { backgroundType: "color", color: "notacolor" } });
        } catch (error) {
            caught = error;
        }

        assert.instanceOf(caught, GraphtyError);
        assert.strictEqual(caught.code, "E_BAD_COMMAND");
        session.dispose();
    });
});
