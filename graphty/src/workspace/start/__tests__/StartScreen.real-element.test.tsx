/**
 * Tier 1 tasks T1 (first launch) and T2 (pick a sample), from an empty app on the REAL
 * graphty-element: the usage data card is answered, then each of the four samples opens from the
 * start screen through the element's ordinary import, with nothing run and only the starting rows, and
 * the element's counts match the sample's source. Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen } from "../../../test/test-utils";
import { forgetUsageAnswer, setUsageSenderForTests } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Where Sentry would start and stop: the usage data card's Share and No call these instead. */
const initSentry = vi.fn();
const stopSentry = vi.fn();
setUsageSenderForTests({ start: initSentry, stop: stopSentry });

/** Each sample's counts, from its source (graph-samples' metadata, public/samples/SOURCES.md). */
const SAMPLES = [
    { name: "Les Miserables", nodes: 77, edges: 254 },
    { name: "Zachary's karate club", nodes: 34, edges: 78 },
    { name: "College football", nodes: 115, edges: 613 },
    { name: "Florentine families", nodes: 15, edges: 20 },
];

/**
 * The style layers beyond the element's own locked base layers (node and edge defaults), which
 * every project starts with.
 * @param session - the element's session.
 * @returns the names of the added layers.
 */
function addedLayers(session: GraphSession): string[] {
    return [
        ...new Set(
            session.styles
                .list()
                .filter((layer) => layer.kind !== "base")
                .map((layer) => layer.name),
        ),
    ];
}

/** What the app starts every project it opens with: the four starting rows, and nothing else. */
const STARTING_ROWS = ["Everything", "Selected", "Pinned", "Hovered"];

afterEach(() => {
    forgetUsageAnswer();
});

describe("T1 and T2: first launch and pick a sample, on the real element", () => {
    it("answers the usage data card, then opens Les Miserables with nothing run", async () => {
        forgetUsageAnswer();
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);

        // T1: the card is at the foot of the start screen until it is answered.
        assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }));
        await userEvent.click(screen.getByRole("button", { name: "Share usage data" }));
        assert.isNotNull(
            screen.getByText(/Thank you\. Usage data is on, with content masked\./, { selector: ".ws-start-answer" }),
        );
        assert.equal(initSentry.mock.calls.length, 1);

        // T2: a sample opens as a project on the Graph place.
        const session = await openBy(store, () => pickSample("Les Miserables"));
        assert.equal(session.data.statistics().nodeCount, 77);
        assert.equal(session.data.statistics().edgeCount, 254);
        assert.equal(session.data.source()?.name, "Les Miserables");
        assert.deepEqual(session.runs.list(), []);
        assert.sameMembers(addedLayers(session), STARTING_ROWS);
        assert.isNull(store.get().opening);
        // The privacy chip in the project's header still shows the answer.
        assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
        // Each character carries its readable name, and its id is the dataset's own, not the
        // number GML had to write.
        const attributes = session.data.attributes().map((attribute) => attribute.name);
        assert.include(attributes, "name");
        assert.notInclude(attributes, "graphty_originalId");
    });

    for (const sample of SAMPLES) {
        it(`opens ${sample.name} with the source's counts, nothing run and only the starting rows`, async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);

            const session = await openBy(store, () => pickSample(sample.name));
            assert.equal(session.data.statistics().nodeCount, sample.nodes);
            assert.equal(session.data.statistics().edgeCount, sample.edges);
            assert.equal(store.get().project?.name, sample.name);
            assert.deepEqual(session.runs.list(), []);
            assert.sameMembers(addedLayers(session), STARTING_ROWS);
            assert.isNull(store.get().notice);
            unmount();
        });
    }
});
