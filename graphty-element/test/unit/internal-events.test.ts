/**
 * Which graph events leave the element as DOM CustomEvents.
 *
 * `<graphty-element>` subscribes to the internal graph observable and re-dispatches what it sees
 * on itself, so the internal event name becomes the DOM event name and the internal event object
 * becomes the `detail`. That is deliberate for the events consumers are meant to have, and wrong
 * for the ones the element's own managers talk to each other with: an unprefixed name consumers
 * should not build against, carrying a payload of typed arrays and a live `Graph` reference that
 * no listener can structured-clone, post to a worker or serialise.
 *
 * `snapshot-replaced` is the first such event, and it is inert only until something emits it --
 * which is why the exclusion is tested before there is anything to see.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore, type SnapshotReplacement } from "../../src/data/GraphStore";
import { type GraphEvent, INTERNAL_EVENT_TYPES, isDomForwardableEvent } from "../../src/events";
import type { Graph } from "../../src/Graph";
import { EventManager } from "../../src/managers/EventManager";

/** The element's own source, read rather than imported: importing it constructs a Babylon engine. */
function readElementSource(): string {
    // fileURLToPath, not import.meta.dirname: the workspace engines floor is node >=18.19.0 and
    // import.meta.dirname only exists from 20.11. test/data/no-transfer.test.ts uses the same form.
    const here = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(here, "..", "..", "src", "graphty-element.ts"), "utf8");
}

/**
 * Freeze a one-node graph, which is the cheapest REAL `snapshot-replaced` payload there is.
 * @returns the snapshot and the freeze report a live emit would carry
 */
function freezeOnce(): { snapshot: GraphSnapshot; report: FreezeReport } {
    let replacement: SnapshotReplacement | null = null;
    const store = new GraphStore({
        directed: "auto",
        positionScale: () => 1,
        onReplaced: (r) => {
            replacement = r;
        },
        onNodeRemap: () => {
            // nothing to renumber on a first freeze
        },
        onEdgeRemap: () => {
            // nothing to renumber on a first freeze
        },
    });

    store.builder.addNode("a");
    const snapshot = store.getSnapshot();
    assert.isNotNull(replacement, "the store publishes a replacement on every freeze");

    return { snapshot, report: (replacement as SnapshotReplacement).report };
}

describe("element-internal events", () => {
    it("lists exactly the events that must not reach the DOM", () => {
        // Asserting the whole set, not just membership: adding an event here means deciding that
        // consumers must never see it, and that decision should have to be written down twice.
        assert.deepStrictEqual([...INTERNAL_EVENT_TYPES], ["snapshot-replaced", "snapshot-dropped"]);
    });

    it("refuses to forward snapshot-replaced and forwards the public events", () => {
        const { snapshot, report } = freezeOnce();
        // The forwarder never reads `graph`; the event only has to be a real, fully typed
        // GraphSnapshotReplacedEvent for the type name under test to be the real one.
        const graph = {} as unknown as Graph;
        const internal: GraphEvent = {
            type: "snapshot-replaced",
            graph,
            previous: null,
            next: snapshot,
            report,
        };

        assert.strictEqual(isDomForwardableEvent(internal), false, "a snapshot of typed arrays is not a DOM detail");
        assert.strictEqual(isDomForwardableEvent({ type: "graph-settled", graph }), true);
        assert.strictEqual(
            isDomForwardableEvent({
                type: "data-added",
                dataType: "nodes",
                count: 1,
                shouldStartLayout: true,
                shouldZoomToFit: true,
            }),
            true,
        );
    });

    it("still delivers snapshot-replaced to the element's own listeners", () => {
        // The event is internal, not disabled: whatever releases a superseded snapshot's GPU
        // buffers subscribes to it the ordinary way.
        const { snapshot, report } = freezeOnce();
        const eventManager = new EventManager();
        const seen: GraphEvent[] = [];
        eventManager.addListener("snapshot-replaced", (event) => {
            seen.push(event as GraphEvent);
        });

        eventManager.emitSnapshotReplaced({} as unknown as Graph, null, snapshot, report);

        assert.strictEqual(seen.length, 1, "an internal listener receives it");
        assert.strictEqual(seen[0]?.type, "snapshot-replaced");
        eventManager.dispose();
    });

    it("guards the blanket DOM forwarder with the internal-event list", () => {
        // The forwarder is eight lines inside asyncFirstUpdated and cannot be exercised without a
        // WebGL context, so this reads it. The failure it exists to catch is someone reinstating
        // an unguarded dispatch: every graph event would go out again, and the leak would be
        // invisible until a consumer's listener received a snapshot.
        const source = readElementSource();
        const subscribe = source.indexOf("onGraphEvent.add(");
        assert.isAbove(subscribe, -1, "the element still forwards graph events from one place");

        const dispatch = source.indexOf("dispatchEvent(", subscribe);
        assert.isAbove(dispatch, subscribe, "and it still dispatches inside that subscription");
        assert.include(
            source.slice(subscribe, dispatch),
            "isDomForwardableEvent",
            "the forwarder must consult events.ts's internal-event list before dispatching",
        );
    });
});
