/**
 * A refusal while a load applies a file's styles (its hidden elements, its background) is reported
 * with the refusal's own code, never as a value graphty-element has no counterpart for.
 */
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, FILE_STYLE_ISSUE, GraphtyError } from "../../session";
import { dispatcherOf } from "../../src/session/GraphSession";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

afterEach(() => {
    vi.restoreAllMocks();
});

describe("refusals while a file's styles are applied", () => {
    it("reports a refused hide with the refusal's own code, never as a value with no counterpart", async () => {
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }],
            style: [{ selector: "#b", style: { display: "none" } }],
        });
        const session = createGraphSession();
        const { visibility } = dispatcherOf(session).services;
        assert.isDefined(visibility);
        vi.spyOn(visibility, "check").mockImplementation(() => {
            throw new GraphtyError({ code: "E_BAD_COMMAND", message: "refused", source: "visibility" });
        });
        let caught: unknown;
        try {
            await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        } catch (error) {
            caught = error;
        }

        assert.instanceOf(caught, GraphtyError);
        assert.strictEqual(caught.code, "E_BAD_COMMAND");
        const notes = session.data.lastImport()?.styles?.notes ?? [];
        assert.isFalse(notes.some((note) => note.code === FILE_STYLE_ISSUE.NO_COUNTERPART));
        session.dispose();
    });

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
