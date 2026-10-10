/**
 * @file Counted-work scaling of one derivation pass: a pass after a one-key write may visit no
 * more elements on a state holding four times as many untouched entries (issue #1906). Counted
 * with `visitsDuring`, never timed. Also checks that the copies a pass hands its hooks hold what
 * live state held when the pass began, across passes that write different slices.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { DerivationLane } from "../../../src/session/project/derive";
import { nodeKey } from "../../../src/session/project/graphOps";
import { createProjectState, type ProjectState } from "../../../src/session/project/state";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";

/** The keyed slices, as their live maps. */
interface LiveMaps {
    readonly pins: Set<NodeId>;
    readonly config: Map<string, unknown>;
    readonly runs: Map<string, unknown>;
    readonly sets: Map<string, unknown>;
    readonly views: Map<string, unknown>;
    readonly notes: Map<string, unknown>;
    readonly attributes: Map<string, unknown>;
}

/**
 * A state holding `size` entries in every keyed slice, with its maps writable.
 * @param size - Entries per slice.
 * @returns The state and its maps.
 */
function stateOf(size: number): { state: ProjectState; live: LiveMaps } {
    const keys = Array.from({ length: size }, (_, at) => `k${String(at)}`);
    const entries = keys.map((key): [string, never] => [key, { key } as never]);
    const state = createProjectState({
        pins: new Set(keys),
        config: new Map(entries),
        runs: new Map(entries),
        sets: new Map(entries),
        views: new Map(entries),
        notes: new Map(entries),
        attributes: new Map(entries),
    });
    return { state, live: state as unknown as LiveMaps };
}

describe("derivation pass cost", () => {
    it("copies only the keys a write changed, however much the state holds", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { state, live } = stateOf(size);
                const lane = new DerivationLane(state);
                lane.register("notes", (rendered, target, dirty) => {
                    for (const key of dirty) {
                        assert.notStrictEqual(rendered.notes.get(key), target.notes.get(key));
                    }
                });
                // Two passes first, so each of the lane's copies has been through one.
                for (const round of [1, 2]) {
                    live.config.set("k0", round);
                    lane.touch("config", "k0");
                    await lane.settled();
                }

                return visitsDuring(async () => {
                    live.notes.set("k1", { note: "edited" });
                    lane.touch("notes", "k1");
                    await lane.settled();
                });
            },
            { sizes: [200, 800], growth: "constant", counter: "elements visited by one note write's pass" },
        );
    });

    it("hands each pass the state live held when it began, slice by slice", async () => {
        const { state, live } = stateOf(3);
        const lane = new DerivationLane(state);
        const seen: string[] = [];
        let late = true;
        lane.register("config", (rendered, target) => {
            seen.push(`config ${String(rendered.config.get("k0"))}->${String(target.config.get("k0"))}`);
            if (late) {
                // A write while the pass runs reaches neither copy, and gets a pass of its own.
                late = false;
                live.config.set("k0", "late");
                lane.touch("config", "k0");
                assert.strictEqual(target.config.get("k0"), "a");
            }
        });
        lane.register("pins", (rendered, target) => {
            seen.push(`pins ${String(rendered.pins.has("k1"))}->${String(target.pins.has("k1"))}`);
        });
        lane.register("notes", (rendered, target) => {
            seen.push(`notes ${String(rendered.notes.has("k2"))}->${String(target.notes.has("k2"))}`);
        });

        live.config.set("k0", "a");
        lane.touch("config", "k0");
        await lane.settled();
        await lane.settled();
        live.pins.delete("k1");
        lane.touch("pins", nodeKey("k1"));
        await lane.settled();
        live.notes.delete("k2");
        lane.touch("notes", "k2");
        await lane.settled();
        live.pins.add("k1");
        lane.touch("pins", nodeKey("k1"));
        live.config.set("k0", "b");
        lane.touch("config", "k0");
        await lane.settled();

        assert.deepEqual(seen, [
            "config [object Object]->a",
            "config a->late",
            "pins true->false",
            "notes true->false",
            "pins false->true",
            "config late->b",
        ]);
        assert.deepEqual([...lane.rendered.config.keys()].sort(), ["k0", "k1", "k2"]);
        assert.strictEqual(lane.rendered.config.get("k0"), "b");
        assert.isFalse(lane.rendered.notes.has("k2"));
        assert.isTrue(lane.rendered.pins.has("k1"));
    });
});
