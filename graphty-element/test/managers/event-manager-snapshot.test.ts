import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { EventManager } from "../../src/managers/EventManager";
import type { GraphContext } from "../../src/managers/GraphContext";

describe("EventManager snapshot-replaced", () => {
    it("is subscribable, which layout-changed is not", () => {
        const em = new EventManager();
        assert.throws(() => em.addListener("layout-changed" as never, () => undefined), /Unknown event type/);
        assert.doesNotThrow(() => em.addListener("snapshot-replaced", () => undefined));
    });

    it("delivers the graph, previous, next and report", () => {
        const em = new EventManager();
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const { snapshot, report } = builder.freezeWithReport({ label: "t" });
        // A sentinel, not null: `graph` is how a DOM forwarder tells two elements on the same page
        // apart, and typing alone only forces the key to be PRESENT.
        const graph = {} as unknown as Graph;
        let seen = 0;
        em.addListener("snapshot-replaced", (evt) => {
            if (evt.type !== "snapshot-replaced") {
                return;
            }

            seen++;
            assert.strictEqual(evt.graph, graph);
            assert.strictEqual(evt.previous, null);
            assert.strictEqual(evt.next, snapshot);
            assert.strictEqual(evt.report, report);
        });
        em.emitSnapshotReplaced(graph, null, snapshot, report);
        assert.strictEqual(seen, 1);
    });

    it("passes a GraphContext through untouched, which is what DataManager holds", () => {
        // The union on emitSnapshotReplaced and its single `graph as Graph` cast exist for exactly
        // one caller: DataManager.onReplaced, which has a GraphContext and no Graph. If the cast
        // ever becomes a conversion, this is what catches it.
        const em = new EventManager();
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addNode("a");
        const { snapshot, report } = builder.freezeWithReport({ label: "t" });
        const context = {} as unknown as GraphContext;
        const seen: unknown[] = [];
        em.addListener("snapshot-replaced", (evt) => {
            if (evt.type !== "snapshot-replaced") {
                return;
            }

            seen.push(evt.graph);
        });
        em.emitSnapshotReplaced(context, snapshot, snapshot, report);
        assert.deepStrictEqual(seen.length, 1);
        assert.strictEqual(seen[0], context, "the context arrives as the graph, not a copy of it");
    });
});
