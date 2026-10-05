/**
 * Tier 1 tasks T1 (first launch) and T2 (pick a sample), from an empty app on the REAL
 * graphty-element: the usage data card is answered, then each of the four samples opens from the
 * start screen through the element's ordinary import, with nothing run and no style layer, and
 * the element's counts match the sample's source. Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

const { initSentry, stopSentry } = vi.hoisted(() => ({ initSentry: vi.fn(), stopSentry: vi.fn() }));
vi.mock("../../../lib/sentry", () => ({ initSentry, stopSentry, captureUserFeedback: vi.fn() }));

import { render, screen, waitFor } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Each sample's counts, from its source (graph-samples' metadata, public/samples/SOURCES.md). */
const SAMPLES = [
    { name: "Les Miserables", nodes: 77, edges: 254 },
    { name: "Zachary's karate club", nodes: 34, edges: 78 },
    { name: "College football", nodes: 115, edges: 613 },
    { name: "Florentine families", nodes: 15, edges: 20 },
];

/**
 * Waits for the open project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The style layers beyond the element's own locked base layers (node and edge defaults).
 * @param session - the element's session.
 * @returns the names of the added layers.
 */
function addedLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.kind !== "base")
        .map((layer) => layer.name);
}

afterEach(() => {
    forgetUsageAnswer();
});

describe("T1 and T2: first launch and pick a sample, on the real element", () => {
    it(
        "answers the usage data card, then opens Les Miserables with nothing run",
        async () => {
            forgetUsageAnswer();
            const store = createWorkspaceStore();
            render(<Workspace store={store} />);

            // T1: the card is at the foot of the start screen until it is answered.
            assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }));
            await userEvent.click(screen.getByRole("button", { name: "Share usage data" }));
            assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
            assert.equal(initSentry.mock.calls.length, 1);

            // T2: a sample opens as a project on the Graph place.
            await userEvent.click(screen.getByRole("button", { name: "Open the Les Miserables sample" }));
            const session = await elementSession();
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 77);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.statistics().edgeCount, 254);
            assert.equal(session.data.source()?.name, "Les Miserables");
            assert.deepEqual(session.runs.list(), []);
            assert.deepEqual(addedLayers(session), []);
            assert.isNull(store.get().opening);
            // The privacy chip in the project's header still shows the answer.
            assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
            // Each character carries its readable name, and its id is the dataset's own, not the
            // number GML had to write.
            const attributes = session.data.attributes().map((attribute) => attribute.name);
            assert.include(attributes, "name");
            assert.notInclude(attributes, "graphty_originalId");
        },
        TIMEOUT_MS,
    );

    for (const sample of SAMPLES) {
        it(
            `opens ${sample.name} with the source's counts, nothing run and no style layer`,
            async () => {
                const store = createWorkspaceStore();
                const { unmount } = render(<Workspace store={store} />);

                await userEvent.click(screen.getByRole("button", { name: `Open the ${sample.name} sample` }));
                const session = await elementSession();
                await waitFor(
                    () => {
                        assert.equal(session.data.statistics().nodeCount, sample.nodes);
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.equal(session.data.statistics().edgeCount, sample.edges);
                assert.equal(store.get().project?.name, sample.name);
                assert.deepEqual(session.runs.list(), []);
                assert.deepEqual(addedLayers(session), []);
                assert.isNull(store.get().notice);
                unmount();
            },
            TIMEOUT_MS,
        );
    }
});
