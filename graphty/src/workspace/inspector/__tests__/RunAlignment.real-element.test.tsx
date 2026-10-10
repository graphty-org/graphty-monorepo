/**
 * The run inspector's left edges on the REAL graphty-element: the "Advanced run settings" fold's
 * chevron hangs in the section gutter with the section chevrons, and the line under the Values
 * histogram starts where the histogram's min label does.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { act, render, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
    { source: "a", target: "e" },
    { source: "e", target: "d" },
];

/**
 * Opens a fresh workspace, loads the line, runs one algorithm and inspects the run on Values.
 * @param algorithm - The algorithm's key
 * @param options - Its options
 * @returns The inspector, queried
 */
async function inspectRun(algorithm: string, options: Record<string, unknown>): Promise<ReturnType<typeof within>> {
    const store = createWorkspaceStore({ project: { name: "Line", id: 1 } });
    const view = render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    const run = session.runs.start(algorithm, options);
    await act(async () => {
        await run;
        await session?.styles.settled();
    });
    act(() => {
        store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "values" } });
    });
    return within(view.getByRole("complementary", { name: "Inspector" }));
}

/**
 * Where an element's drawn content starts: its text's left edge, past any padding, or its box's
 * left edge when it holds no text.
 * @param element - The element
 * @returns Its left x in pixels
 */
function left(element: Element): number {
    if (element.textContent === "") {
        return element.getBoundingClientRect().left;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().left;
}

describe("the run inspector's left edges", () => {
    it("hangs the Advanced run settings chevron in the gutter with the section chevrons", async () => {
        const inspector = await inspectRun("shortest-path", { source: "b", target: "d" });
        const fold = await inspector.findByRole("button", { name: /Advanced run settings/ });
        const made = inspector.getByRole("button", { name: /Made with/ });
        const foldChevron = fold.querySelector(".cm-subgroup-chevron");
        const sectionChevron = made.querySelector(".cm-section-chevron");
        assert.isNotNull(foldChevron);
        assert.isNotNull(sectionChevron);
        if (foldChevron === null || sectionChevron === null) {
            return;
        }
        assert.closeTo(left(foldChevron), left(sectionChevron), 0.5);
    });

    it("starts the histogram's summary line at the min label", async () => {
        const inspector = await inspectRun("pagerank", {});
        const line = await inspector.findByText(/have a value/);
        const min = inspector.getByTestId("histogram-row").querySelector("[data-testid='chart-axis-min']");
        assert.isNotNull(min);
        if (min === null) {
            return;
        }
        assert.closeTo(left(line), left(min), 0.5);
    });
});
