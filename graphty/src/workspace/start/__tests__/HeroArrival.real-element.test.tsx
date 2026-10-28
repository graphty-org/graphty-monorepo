/**
 * How the start page's graph arrives on the REAL graphty-element: a page whose graph starts still
 * (a reader who asked for less motion, or Storybook) draws it already arranged, so its first drawn
 * positions are its final ones and a picture of the page is final as soon as the graph is up
 * (issue #4041). Every assertion reads the element.
 */

// Registers the real <graphty-element>, as the app's loader does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, waitFor } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { HeroTurns } from "../heroTurns";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

type ElementUnderTest = HTMLElementTagNameMap["graphty-element"];

/**
 * Every node's position, row by row.
 * @param element - the hero's element.
 * @returns x, y and z of each row in turn.
 */
function positionsOf(element: ElementUnderTest): number[] {
    const { positions } = element.session;
    const out = { x: 0, y: 0, z: 0 };
    const all: number[] = [];
    for (let i = 0; i < positions.count; i++) {
        positions.read(i, out);
        all.push(out.x, out.y, out.z);
    }
    return all;
}

beforeAll(async () => {
    await page.viewport(1440, 900);
});

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
});

afterEach(async () => {
    await clearRecent();
});

describe("the start page's graph, starting still", () => {
    it("is drawn already arranged: its first placed positions are its final ones", async () => {
        const { unmount } = render(
            <HeroTurns.Provider value={false}>
                <Workspace store={createWorkspaceStore()} />
            </HeroTurns.Provider>,
        );
        try {
            // As soon as the element has placed every node of the sample.
            const hero = await waitFor(
                () => {
                    const found = document.querySelector<ElementUnderTest>("graphty-element[data-start-page]");
                    const positions = found?.session?.positions;
                    assert.isAbove(positions?.count ?? 0, 0);
                    assert.equal(positions?.placedCount, positions?.count);
                    return found as ElementUnderTest;
                },
                { timeout: TIMEOUT_MS },
            );
            const first = positionsOf(hero);
            await hero.waitForStableFrame();
            const final = positionsOf(hero);
            assert.equal(final.length, first.length);
            // Drawn one step a frame, the nodes fly for seconds after they are first placed.
            const moved = Math.max(...final.map((v, i) => Math.abs(v - first[i])));
            assert.isBelow(moved, 1e-6, "a node moved after the graph was first drawn");
        } finally {
            unmount();
        }
    });
});
