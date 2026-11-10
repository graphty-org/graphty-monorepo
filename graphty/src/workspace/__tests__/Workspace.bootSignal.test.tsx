/**
 * The workspace's half of the loading screen: it holds the screen while it asks what is kept, says
 * where the load landed, and lets the screen go. No reader input exists for this: it happens on mount.
 */
import { afterEach, assert, it, vi } from "vitest";

import { render } from "../../test/test-utils";
import { Workspace } from "../Workspace";

const signals: Record<string, unknown>[] = [];
const hear = (event: Event): void => {
    signals.push((event as CustomEvent<Record<string, unknown>>).detail);
};

afterEach(() => {
    document.removeEventListener("graphty-boot", hear);
    signals.length = 0;
});

it("holds the loading screen, says where it landed, then lets it go", async () => {
    document.addEventListener("graphty-boot", hear);

    render(<Workspace initialState={{ autosave: true }} />);

    assert.deepEqual(signals[0], { hold: true });
    await vi.waitFor(() => {
        assert.deepInclude(signals, { done: true });
    });
    assert.deepInclude(signals, { line: "kept work checked: landing on start screen, nothing kept" });
});
