/**
 * The inspector's heading, where focus lands after a graph opens or a find pick, draws a focus
 * ring a keyboard reader can see: 3:1 or better against what it is drawn on, in both color
 * schemes (WCAG 2.4.7 and 1.4.11), on the REAL graphty-element, reached with real keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { inBothSchemes, insetRing } from "../../test/focus-ring";
import { render, screen, waitFor } from "../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../frame/focus";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, label: `Node ${String(i)}` }));
const EDGES = NODES.map((_, i) => ({ source: `n${String(i)}`, target: `n${String((i + 1) % 6)}` }));

describe("the inspector's heading draws a focus ring", () => {
    it("a find pick made with keys puts focus on the heading, which rings 3:1 in dark and light", async () => {
        const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "graph" } });
        render(<Workspace store={store} />);
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);

        await userEvent.click(screen.getByRole("combobox", { name: "Find" }));
        await userEvent.keyboard("Node 0");
        await screen.findAllByRole("option", { name: /Node 0/ });
        await userEvent.keyboard("{Enter}");
        const title = await waitFor(() => {
            const found = document.getElementById(INSPECTOR_TITLE_ID);
            assert.isNotNull(found);
            assert.equal(document.activeElement, found);
            return found;
        });
        if (title === null) {
            throw new Error("no heading");
        }

        const ring = inBothSchemes(() => insetRing(title));
        for (const [scheme, { width, offset, contrast }] of Object.entries(ring)) {
            assert.isAtLeast(width, 1, `${scheme}: the heading draws a ring`);
            // Inside its box, so a truncating parent never clips it.
            assert.isAtMost(offset, 0, `${scheme}: the ring is inset`);
            assert.isAtLeast(contrast, 3, `${scheme}: the ring is 3:1 against the panel`);
        }
    });
});
