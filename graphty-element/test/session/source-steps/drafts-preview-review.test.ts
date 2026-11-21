/**
 * @file A draft's preview names the right committed step, reports only what the draft makes, and
 * holds the same filters its commit holds, also after a filter changes while the draft is open.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type SourceDraftPreview } from "../../../src/session";
import { full, phase2, phase6 } from "./scenario";

/** The outcomes each step's counts report. */
const STEP_CODES = new Set([
    "W_EDGE_END_MISSING",
    "W_ROWS_DIFFER",
    "W_UNMATCHED",
    "W_UNTOUCHED",
    "W_FAN_OUT",
    "W_PARALLEL_EDGES",
    "W_SELF_LOOPS",
    "W_NODE_NAMED_ONLY",
]);

/**
 * A preview's W_FILTER_HELD outcomes.
 * @param pv - The preview.
 * @returns Them.
 */
function held(pv: SourceDraftPreview): SourceDraftPreview["issues"][number][] {
    return pv.issues.filter((i) => i.code === "W_FILTER_HELD");
}

describe("source-steps drafts: the preview's review fixes", () => {
    it("a merge that folds an edge onto a pair another edge joins counts a parallel edge", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "p1" }, { id: "p2" }],
                    edges: [{ source: "p1", target: "p2" }],
                }),
            },
            name: "people.json",
        });
        const s1 = session.data.sources().at(-1)?.key ?? "";
        const d = session.data.draft();
        const s2 = await d.stage({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "q1", pid: "p1" },
                        { id: "q2", pid: "p2" },
                    ],
                    edges: [{ source: "q1", target: "q2" }],
                }),
            },
            name: "badges.json",
        });
        d.merge({ from: { source: s2, field: "pid" }, into: { source: s1 } });
        const pv = d.preview();
        assert.strictEqual(
            pv.steps.reduce((n, s) => n + (s.buckets?.parallelPairs ?? 0), 0),
            1,
        );
        assert.isTrue(pv.issues.some((i) => i.code === "W_PARALLEL_EDGES"));
        await d.commit();
        assert.lengthOf(session.data.edges(), 2);
        session.dispose();
    });

    it("a merge that folds both ends of an edge into one node counts a self-loop", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "p1" }], edges: [] }) },
            name: "people.json",
        });
        const s1 = session.data.sources().at(-1)?.key ?? "";
        const d = session.data.draft();
        const s2 = await d.stage({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "q1", pid: "p1" },
                        { id: "q2", pid: "p1" },
                    ],
                    edges: [{ source: "q1", target: "q2" }],
                }),
            },
            name: "badges.json",
        });
        d.merge({ from: { source: s2, field: "pid" }, into: { source: s1 } });
        const pv = d.preview();
        assert.strictEqual(
            pv.steps.reduce((n, s) => n + (s.buckets?.selfLoops ?? 0), 0),
            1,
        );
        assert.isTrue(pv.issues.some((i) => i.code === "W_SELF_LOOPS"));
        await d.commit();
        const [loop] = session.data.edges();
        assert.strictEqual(loop.source, loop.target);
        session.dispose();
    });

    it("removing the first of one source's steps names that step removed and keeps the others", async () => {
        const { session } = await phase2();
        const rows = session.data.steps();
        const values = rows.flatMap((r, i) => (r.op === "join.node-values" ? [i] : []));
        assert.isAtLeast(values.length, 2, "phase 2 has several join.node-values steps of one source");
        const [first] = values;
        const d = session.data.draft();
        d.removeStep(first);
        const pv = d.preview();
        const removed = pv.issues.filter((i) => i.code === "W_STEP_REMOVED");
        assert.deepStrictEqual(removed, [
            { code: "W_STEP_REMOVED", params: { step: first, reason: "step-removed", source: rows[first].source } },
        ]);
        const others = pv.steps.filter((s) => s.op === "join.node-values");
        assert.deepStrictEqual(
            others.map((s): [string, number | null] => [s.state, s.committed]),
            values.slice(1).map((i): [string, number | null] => ["kept", i]),
        );
        for (const s of pv.steps) {
            if (s.change !== null) {
                assert.isTrue(
                    Object.values(s.change).every((v) =>
                        typeof v === "number" ? v === 0 : Object.keys(v as object).length === 0,
                    ),
                    `step ${String(s.index)} changes nothing`,
                );
            }
        }
        d.dispose();
        session.dispose();
    });

    it("an empty draft's preview reports no step outcomes", async () => {
        const { session } = await phase6();
        const pv = session.data.draft().preview();
        assert.deepStrictEqual(
            pv.issues.filter((i) => STEP_CODES.has(i.code)),
            [],
        );
        session.dispose();
    });

    it("a filter on a computed column is held in the preview exactly when the commit holds it", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,amt\nc1,5\nc2,10" }, name: "crm.csv" },
            { key: "id", type: "client" },
        );
        await session.data.derive("double", "data.amt * `2`");
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "range", attribute: "data.double", min: 0, max: 30 },
        });
        assert.deepStrictEqual(session.visibility.held, []);
        const d = session.data.draft();
        const b = await d.stage(
            { type: "csv", config: { data: "id,region\nc1,North\nc3,South" }, name: "erp.csv" },
            { key: "id", type: "client" },
        );
        d.add(b, { overlap: "merge" });
        const said = held(d.preview());
        await d.commit();
        assert.deepStrictEqual<unknown>(said, session.visibility.held);
        session.dispose();
    });

    it("a filter on a computed column whose only input source the draft removes is held in its preview", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,amt\nc1,5\nc2,10" }, name: "crm.csv" },
            { key: "id", type: "client" },
        );
        const crm = session.data.sources().at(-1)?.key ?? "";
        const stage = session.data.draft();
        const erp = await stage.stage(
            { type: "csv", config: { data: "id,region\nr1,North\nr2,South" }, name: "erp.csv" },
            { key: "id", type: "region" },
        );
        stage.add(erp);
        await stage.commit();
        await session.data.derive("double", "data.amt * `2`");
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "range", attribute: "data.double", min: 0, max: 30 },
        });
        assert.deepStrictEqual(session.visibility.held, []);
        const d = session.data.draft();
        d.removeSource(crm);
        const said = held(d.preview());
        await d.commit();
        assert.lengthOf(said, 1);
        assert.deepStrictEqual<unknown>(said, session.visibility.held);
        session.dispose();
    });

    it("a filter added after the first preview shows in the next one, as the commit holds it", async () => {
        const { session, m } = await full();
        const d = session.data.draft();
        d.removeSource(m);
        assert.deepStrictEqual(held(d.preview()), []);
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "categories", attribute: "data.city", values: ["Oslo"] },
        });
        const second = held(d.preview());
        await d.commit();
        assert.deepStrictEqual<unknown>(session.visibility.held, second);
        assert.lengthOf(second, 1);
        session.dispose();
    });

    it("a note added after the first preview shows its unbound reference in the next one", async () => {
        const { session, a } = await phase6();
        const d = session.data.draft();
        d.removeSource(a);
        const first = d.preview();
        const unbound = (pv: SourceDraftPreview): number =>
            pv.issues.filter((i) => i.code === "W_REFERENCE_UNBOUND").length;
        session.notes.add({ text: "watch", targets: [{ node: "A-9" }] });
        assert.strictEqual(unbound(d.preview()), unbound(first) + 1);
        assert.strictEqual(d.preview(), d.preview(), "unchanged context keeps the same preview");
        d.dispose();
        session.dispose();
    });
});
