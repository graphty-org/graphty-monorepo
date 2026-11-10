/**
 * A project reopened by a reload stays open, so nothing but its opening settling lets a held loading
 * screen go. It happens on mount, with the real element: no reader input exists for it.
 */
import "@graphty/graphty-element";

import { afterEach, assert, it, vi } from "vitest";

import { render } from "../../test/test-utils";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

const signals: Record<string, unknown>[] = [];
const hear = (event: Event): void => {
    signals.push((event as CustomEvent<Record<string, unknown>>).detail);
};

afterEach(() => {
    document.removeEventListener("graphty-boot", hear);
    signals.length = 0;
});

it("lets the loading screen go once a reopened project has opened", async () => {
    document.addEventListener("graphty-boot", hear);
    const opening = { name: "Kept", load: (): Promise<void> => Promise.resolve(), settle: vi.fn() };

    render(<Workspace store={createWorkspaceStore({ project: { name: "Kept", id: 1 }, opening })} />);

    await vi.waitFor(() => {
        assert.deepInclude(signals, { done: true });
    });
    assert.deepInclude(signals, { line: "project opened" });
});
