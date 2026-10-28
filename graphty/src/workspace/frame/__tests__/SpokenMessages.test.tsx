/**
 * Every status message is spoken from the workspace's one status line, a region on the page,
 * empty, before anything is written to it: a region that arrives already holding its words is
 * not read by many screen readers. A failure stays an alert.
 */
import userEvent from "@testing-library/user-event";
import { assert, beforeEach, describe, it } from "vitest";

import { act, render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

/** Every live region on the page now. */
function liveRegions(): Element[] {
    return [...document.querySelectorAll("[role=status], [role=alert], [role=log], [aria-live]")];
}

/**
 * The live regions holding exactly these words.
 * @param words - the words.
 * @returns the regions.
 */
function regionsSaying(words: string): Element[] {
    return liveRegions().filter((region) => region.textContent === words);
}

beforeEach(() => {
    localStorage.removeItem("graphty.usageData.v1");
});

describe("spoken messages", () => {
    it("says the usage data answer from a status line that was already on the page", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        const before = new Set(liveRegions());

        await userEvent.click(screen.getByRole("button", { name: "No thanks" }));

        const words = "Usage data stays off. Change this in Settings > Privacy";
        await waitFor(() => {
            assert.lengthOf(regionsSaying(words), 1);
        });
        const [region] = regionsSaying(words);
        assert.isTrue(before.has(region), "the answer is written into a region that was on the page");
        assert.equal(region.getAttribute("role"), "status");
        // The line on screen is not a second region speaking the same answer.
        assert.isFalse(liveRegions().some((each) => each !== region && each.textContent?.includes("stays off")));
    });

    it("speaks a notice once, politely, from the standing status line", () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);
        const before = new Set(liveRegions());
        const words = "Undid changing shape";

        act(() => {
            store.set({ notice: { message: words } });
        });

        assert.isNotNull(screen.getByText(words, { selector: ".cm-toast-message" }));
        const regions = regionsSaying(words);
        assert.lengthOf(regions, 1, "said once, not as an alert and a status both");
        assert.isTrue(before.has(regions[0]));
        assert.equal(regions[0].getAttribute("aria-live"), "polite");
        assert.isNull(screen.queryByRole("alert"));
    });

    it("keeps a failure an alert, said once", () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);
        const words = "The project could not be saved.";

        act(() => {
            store.set({ notice: { message: words, error: true } });
        });

        assert.lengthOf(regionsSaying(words), 1);
        assert.equal(regionsSaying(words)[0].getAttribute("role"), "alert");
    });
});
