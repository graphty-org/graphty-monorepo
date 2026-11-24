/**
 * @file A join step read back as the act that made it (`SourceStepRow.act`, design
 * design/data/multiple-data-sources-design.md sections 5.2 and 7.13): an application reopens a
 * committed Merge or Make an edge on its fields and choices, and makes it again with a field or the
 * act changed by removing the step and making the new act in the same draft.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its lines.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, ...data: string[]): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data: data.join("\n") }, name };
}

const PEOPLE = csv("people.csv", "badge,name,dept", "B1,Ann,Ops", "B2,Bo,Lab", "B3,Cy,Sales");
const ENTRIES = csv("entries.csv", "entry,badge,door", "E1,B1,D1", "E2,B1,D2", "E3,B2,D1", "E4,B9,D1");
const HR = csv("hr.csv", "badge,dept", "B1,Operations", "B2,Research", "B7,Ops");

/**
 * People in the graph as type person.
 * @returns The session and people's key.
 */
async function people(): Promise<{ session: GraphSession; people: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(PEOPLE, { key: "badge", type: "person" });
    return { session, people: session.data.sources()[0]?.key ?? "" };
}

describe("source-steps: a join step's act", () => {
    it("reads a merge back with its fields and choices, and null for an add", async () => {
        const { session } = await people();
        const hr = await session.data.stage(HR, { key: "badge" });
        const draft = session.data.draft();
        draft.merge({
            from: { source: hr, field: "badge" },
            into: { space: "person" },
            ignoreCase: true,
            repeated: "last",
            unmatchedFrom: "drop",
        });
        await draft.commit();
        const steps = session.data.steps();
        const merge = steps.find((s) => s.op === "join.merge");
        assert.deepStrictEqual(merge?.act, {
            act: "merge",
            from: { source: hr, field: "badge" },
            into: { space: "person" },
            ignoreCase: true,
            ignoreSpaces: false,
            repeated: "last",
            aggregate: null,
            unmatchedFrom: "drop",
        });
        for (const add of steps.filter((s) => s.op === "join.add")) {
            assert.isNull(add.act, "an add is no join act");
        }
    });

    it("reads Make an edge back with its direction and edge type, either way round", async () => {
        for (const direction of ["into-from", "from-into"] as const) {
            const { session } = await people();
            const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
            const draft = session.data.draft();
            draft.connect({
                from: { source: entries, field: "badge" },
                into: { space: "person" },
                direction,
                edgeType: "entered",
            });
            await draft.commit();
            const edges = session.data.steps().find((s) => s.op === "join.edges");
            assert.deepStrictEqual(edges?.act, {
                act: "connect",
                from: { source: entries, field: "badge" },
                into: { space: "person" },
                direction,
                edgeType: "entered",
                ignoreCase: false,
                ignoreSpaces: false,
                repeated: null,
                aggregate: null,
            });
        }
    });

    it("names the source and column a merge on a non-key column translates through", async () => {
        const { session, people: ppl } = await people();
        const hr = await session.data.stage(csv("hr.csv", "who,dept", "Ann,Operations", "Bo,Research"), {
            key: "who",
        });
        const draft = session.data.draft();
        draft.merge({ from: { source: hr, field: "who" }, into: { source: ppl, field: "name" } });
        await draft.commit();
        const merge = session.data.steps().find((s) => s.op === "join.merge");
        assert.deepStrictEqual(merge?.act?.into, { space: "person", source: ppl, field: "name" });
        assert.strictEqual(session.data.node("B1")?.dept, "Ops", "the merge met Ann by name");
    });

    it("makes the act again from what it reads back: the same graph", async () => {
        const { session } = await people();
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const first = session.data.draft();
        first.connect({ from: { source: entries, field: "badge" }, into: { space: "person" }, edgeType: "entered" });
        await first.commit();
        const edges = (): string[] =>
            session.data
                .edges()
                .map((e) => `${String(e.source)}->${String(e.target)}`)
                .sort();
        const made = edges();
        const step = session.data.steps().find((s) => s.op === "join.edges");
        const act = step?.act;
        assert.isDefined(step);
        assert.isNotNull(act);
        if (step === undefined || act === null || act === undefined) {
            return;
        }
        const again = session.data.draft();
        again.removeStep(step.index);
        again.connect({
            from: act.from,
            into: act.into,
            ...(act.direction === undefined ? {} : { direction: act.direction }),
            ...(act.edgeType === undefined ? {} : { edgeType: act.edgeType }),
        });
        assert.strictEqual(again.preview().after.edges, made.length);
        await again.commit();
        assert.deepStrictEqual(edges(), made);
    });

    it("is null for the one step of a plain import", async () => {
        const { session } = await people();
        assert.deepStrictEqual(
            session.data.steps().map((s) => s.act),
            [null],
        );
    });
});
