/**
 * One panel's failure stays in that panel: the panel says it could not be shown, and Reload panel,
 * clicked, draws it again.
 */
import { assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../../../test/test-utils";
import { PanelBoundary } from "../PanelBoundary";

/** Throws while `broken.now` is true. */
const broken = { now: true };

/**
 * A panel that throws while `broken.now` is set.
 * @returns the panel.
 */
function Flaky(): React.JSX.Element {
    if (broken.now) {
        throw new Error("the panel broke");
    }
    return <p>Panel content</p>;
}

describe("PanelBoundary", () => {
    it("shows the panel's failure in place, keeps its neighbor, and Reload panel draws it again", async () => {
        const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
        broken.now = true;
        render(
            <>
                <PanelBoundary name="Inspector">
                    <Flaky />
                </PanelBoundary>
                <p>Neighbor</p>
            </>,
        );
        assert.isNotNull(screen.getByText("This panel could not be shown"));
        assert.isNotNull(screen.getByText("Neighbor"));
        broken.now = false;
        await userEvent.click(screen.getByRole("button", { name: "Reload panel" }));
        assert.isNotNull(await screen.findByText("Panel content"));
        quiet.mockRestore();
    });
});
