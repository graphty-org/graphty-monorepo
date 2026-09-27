/**
 * @file Change notification (design/sets/sets-design.md section 11): a live user of a set is told
 * when an input it reads moved, from each of the six hooks -- the sets store's committed diff, a
 * selection change, a visibility change, a run moving its result, an attribute write and a
 * snapshot replacement. It is told which inputs moved, before the public event of the change, and
 * a watch whose signature did not move is never asked to resolve.
 */

import { assert, describe, it } from "vitest";

import type { Scope } from "../../../src/catalog/types";
import { inputCountersOf, writeUpdates } from "../../../src/session/attributes";
import { scopeResolverOfSession, setsNotifierOfSession } from "../../../src/session/GraphSession";
import type { MovedInput, SetWatch } from "../../../src/session/sets/notify";
import { scopeSignature } from "../../../src/session/sets/signature";
import { type Harness, makeSession } from "../helpers";
import { finishAtOnce } from "../runs/harness";

/** A watch over one scope, recording what it was handed and when. */
interface Probe {
    readonly watch: SetWatch<number>;
    /** Each `ready`, in order: the node count resolved and the inputs that moved. */
    readonly readies: { count: number; moved: readonly MovedInput[] }[];
    resolves: number;
}

/**
 * A watch over one scope through the session's own resolver.
 * @param h - The harness.
 * @param scope - What it watches.
 * @param log - Where `ready` writes a line, beside the public events.
 * @returns The probe.
 */
function probe(h: Harness, scope: Scope, log: string[] = []): Probe {
    const resolver = scopeResolverOfSession(h.session);
    const found: Probe = {
        readies: [],
        resolves: 0,
        watch: {
            signature: () => scopeSignature(scope, resolver.contextNow()),
            resolve: () => {
                found.resolves++;
                return resolver.resolveNow(scope).nodeCount;
            },
            ready: (count, moved) => {
                found.readies.push({ count, moved });
                log.push("ready");
            },
            cost: () => 1,
        },
    };
    setsNotifierOfSession(h.session).subscribe(found.watch);

    return found;
}

/**
 * Five nodes a..e with weights 1..5, a path of edges, runs finishing at once.
 * @returns The harness, frozen.
 */
function graph(): Harness {
    const h = makeSession({ directed: false, runs: { execute: finishAtOnce } });
    h.add(
        ["a", "b", "c", "d", "e"].map((id, index) => ({ id, weight: index + 1 })),
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );
    h.session.data.snapshot();

    return h;
}

describe("change notification", () => {
    it("the store's committed diff: told the ids, before set:changed, and a bystander is not asked", () => {
        const h = graph();
        const log: string[] = [];
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "S" });
        const watched = probe(h, { set: id }, log);
        const bystander = probe(h, "graph");
        h.session.on("set:changed", () => log.push("set:changed"));

        h.session.sets.redefine(id, { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" });

        assert.deepStrictEqual(log, ["ready", "set:changed"]);
        assert.deepStrictEqual(watched.readies, [{ count: 3, moved: [{ kind: "sets", ids: [id] }] }]);
        assert.strictEqual(bystander.resolves, 0);

        // A rename keeps the definition: told, but nothing it reads moved.
        h.session.sets.rename(id, "T");
        assert.strictEqual(watched.resolves, 1);
    });

    it("a selection change, before selection:changed", async () => {
        const h = graph();
        const log: string[] = [];
        const watched = probe(h, "selection", log);
        const bystander = probe(h, "graph");
        h.session.on("selection:changed", () => log.push("selection:changed"));

        await h.session.selection.apply({ nodes: ["a", "b"] });

        assert.deepStrictEqual(log, ["ready", "selection:changed"]);
        assert.deepStrictEqual(watched.readies, [{ count: 2, moved: [{ kind: "selection" }] }]);
        assert.strictEqual(bystander.resolves, 0);
    });

    it("a visibility change, before visibility:changed", async () => {
        const h = graph();
        const log: string[] = [];
        const watched = probe(h, "visible", log);
        const bystander = probe(h, "graph");
        h.session.on("visibility:changed", () => log.push("visibility:changed"));

        await h.session.visibility.set({ kind: "range", attribute: "data.weight", max: 2 });

        assert.deepStrictEqual(log.slice(0, 2), ["ready", "visibility:changed"]);
        assert.deepStrictEqual(watched.readies.at(-1), { count: 2, moved: [{ kind: "visibility" }] });
        assert.strictEqual(bystander.resolves, 0);
    });

    it("a run moving its result: the end of a run, a re-run and a removal, before run:changed", async () => {
        const h = graph();
        const log: string[] = [];
        const watched = probe(h, { where: "results.pr.value > `2`" }, log);
        const bystander = probe(h, "graph");
        h.session.on("run:changed", (change) => log.push(`run:${change.phase}`));

        const run = h.session.runs.start("degree", undefined, { as: "pr", scope: "graph", style: false });
        await run;
        assert.deepStrictEqual(log.slice(-2), ["ready", "run:end"]);
        assert.deepStrictEqual(watched.readies.at(-1)?.moved, [{ kind: "run", run: "pr" }]);
        const afterFirst = watched.resolves;

        await run.rerun();
        // The re-run cleared the result when it queued and published a new one at its end.
        assert.strictEqual(watched.resolves, afterFirst + 2);

        h.session.runs.remove("pr");
        assert.strictEqual(watched.resolves, afterFirst + 3);
        assert.deepStrictEqual(watched.readies.at(-1)?.moved, [{ kind: "run", run: "pr" }]);
        assert.strictEqual(bystander.resolves, 0);
    });

    it("an attribute write, once per batch and only for a watch reading the field", () => {
        const h = graph();
        const heavy = probe(h, { where: "data.weight > `3`" });
        const labelled = probe(h, { where: "data.label == 'x'" });
        const indexOf = (id: string | number): number => h.session.data.snapshot().ids.indexOf(id);

        writeUpdates(
            inputCountersOf(h.store),
            "node",
            [
                { id: "a", weight: 10 },
                { id: "b", weight: 10 },
                { id: "zz", weight: 10 },
            ],
            (id) => h.nodeAttributes.get(indexOf(id)) as Record<string, unknown> | undefined,
        );

        assert.deepStrictEqual(heavy.readies, [{ count: 4, moved: [{ kind: "attributes", element: "node", fields: ["weight"] }] }]);
        assert.strictEqual(labelled.resolves, 0);
    });

    it("a snapshot replacement queues every watch for a frame instead of resolving at once", () => {
        const h = graph();
        const watched = probe(h, { nodes: ["a", "f"] });
        const notifier = setsNotifierOfSession(h.session);

        h.add([{ id: "f" }]);
        h.session.data.snapshot();

        assert.strictEqual(watched.resolves, 0);
        assert.strictEqual(notifier.pending, 1);
        notifier.dispose();
    });

    it("a snapshot replacement is handed over with every input since, on the frame", async () => {
        const h = graph();
        const watched = probe(h, { where: "data.weight > `3`" });
        let frame: (() => void) | null = null;
        setsNotifierOfSession(h.session).useFrames((callback) => {
            frame = callback;
            return () => {
                frame = null;
            };
        });

        h.add([{ id: "f", weight: 9 }]);
        const { serial } = h.session.data.snapshot();
        await h.session.selection.apply({ nodes: ["a"] });
        assert.strictEqual(watched.resolves, 0, "queued: a selection change does not jump the frame");

        assert.isNotNull(frame);
        (frame as unknown as () => void)();
        assert.deepStrictEqual(watched.readies, [{ count: 3, moved: [{ kind: "snapshot", serial }, { kind: "selection" }] }]);
    });
});
