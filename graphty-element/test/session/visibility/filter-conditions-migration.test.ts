/**
 * Saved filter steps keep opening, and meaning the same thing, now that filters are conditions.
 * The fixtures were made by the element from before conditions (`fixtures/make-master-steps.ts`,
 * which records the version that made them): a project with one step of every kind the graphty
 * app wrote, the same project with a malformed step, and the journal of the commands. New files
 * write the steps beside a versioned `conditions` field, and an older reader's view of them (the
 * steps alone) hides the same elements.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type FilterStep, type GraphSession, type SessionCommand } from "../../../session";
import EXPECTED from "./fixtures/master-steps.expected.json";
import JOURNAL from "./fixtures/master-steps.journal.json";
import PROJECT from "./fixtures/master-steps.project.json";
import MALFORMED_EXPECTED from "./fixtures/master-steps-malformed.expected.json";
import MALFORMED from "./fixtures/master-steps-malformed.project.json";

/** A project document, as far as these tests read it. */
interface Doc {
    members: { kind: string; visibility?: Record<string, unknown>; [key: string]: unknown }[];
}

function sessionMember(doc: Doc): Record<string, unknown> {
    const member = doc.members.find((each) => each.kind === "graphty-session");
    assert.isDefined(member?.visibility);
    return member.visibility;
}

function visible(session: GraphSession): { nodes: string[]; edges: string[] } {
    return {
        nodes: [...session.visibility.nodes].map(String).sort(),
        edges: [...session.visibility.edges].map(String).sort(),
    };
}

async function opened(doc: unknown): Promise<{ session: GraphSession; problems: readonly unknown[] }> {
    const session = createGraphSession();
    const report = await session.project.open(JSON.stringify(doc));
    return { session, problems: report.problems };
}

describe("saved filter steps", () => {
    it("open as one keep condition per step, with master's ids, rules, on and visible elements", async () => {
        assert.match(EXPECTED.madeBy, /^@graphty\/graphty-element 3\.31\.0/);
        const { session, problems } = await opened(PROJECT);

        assert.deepStrictEqual(problems, []);
        assert.deepStrictEqual(session.visibility.steps, EXPECTED.steps as FilterStep[]);
        assert.deepStrictEqual(
            session.visibility.conditions.map(({ id, on, effect }) => ({ id, on, effect })),
            (EXPECTED.steps as FilterStep[]).map(({ id, on }) => ({ id, on, effect: "keep" })),
        );
        assert.deepStrictEqual(visible(session), { nodes: EXPECTED.nodes, edges: EXPECTED.edges });
        // The playback settings come back with them, and the saved selection is the reader's.
        assert.strictEqual(session.time.settings.mode, "cumulative");
        assert.isTrue(session.selection.has("b") && session.selection.has("c"));
        session.dispose();
    });

    it("refuse a malformed steps list whole, as master did, and still read the playback settings", async () => {
        assert.deepStrictEqual(MALFORMED_EXPECTED.steps, []);
        const { session, problems } = await opened(MALFORMED);

        assert.deepStrictEqual(problems, MALFORMED_EXPECTED.problems);
        assert.deepStrictEqual(session.visibility.conditions, []);
        assert.deepStrictEqual(visible(session), {
            nodes: MALFORMED_EXPECTED.nodes,
            edges: MALFORMED_EXPECTED.edges,
        });
        // Master lost these with the steps; they are read on their own now.
        assert.strictEqual(session.time.settings.mode, "cumulative");
        session.dispose();
    });

    it("replay from master's journal to the same conditions and visible elements", async () => {
        // The data, with its filter cleared, then every visibility command master's journal
        // recorded, as it recorded it.
        const { session } = await opened(PROJECT);
        await session.visibility.setConditions([]);
        for (const command of JOURNAL.commands as SessionCommand[]) {
            await session.execute(command);
        }

        assert.deepStrictEqual(session.visibility.steps, EXPECTED.steps as FilterStep[]);
        assert.deepStrictEqual(visible(session), { nodes: EXPECTED.nodes, edges: EXPECTED.edges });
        session.dispose();
    });
});

describe("saved filter conditions", () => {
    async function withConditions(): Promise<GraphSession> {
        const { session } = await opened(PROJECT);
        await session.visibility.setConditions([
            { id: "keep", effect: "keep", rule: { kind: "categories", attribute: "data.type", values: ["host"] } },
            { id: "drop", effect: "exclude", rule: { kind: "range", attribute: "data.score", min: 0.85 } },
            { id: "pick", effect: "select", rule: { kind: "range", attribute: "data.score", max: 0.25 } },
        ]);
        // The reader's own selection, made after the select condition applied.
        await session.selection.apply({ nodes: ["e"] });
        return session;
    }

    it("write the steps and a versioned conditions field, and reopen with the reader's selection", async () => {
        const saved = await withConditions();
        const before = visible(saved);
        const doc = JSON.parse((await saved.project.save()).text) as Doc;
        const member = sessionMember(doc);
        assert.deepStrictEqual(member.steps, saved.visibility.steps);
        assert.deepStrictEqual(member.conditions, { version: 1, list: saved.visibility.conditions });

        const { session, problems } = await opened(doc);
        assert.deepStrictEqual(problems, []);
        assert.deepStrictEqual(session.visibility.conditions, saved.visibility.conditions);
        assert.deepStrictEqual(visible(session), before);
        // Opening never applies select conditions: the saved selection wins.
        assert.isTrue(session.selection.has("e"));
        assert.isFalse(session.selection.has("b"));
        saved.dispose();
        session.dispose();
    });

    it("hide the same elements read the way an older reader reads them, from the steps alone", async () => {
        const saved = await withConditions();
        const doc = JSON.parse((await saved.project.save()).text) as Doc;
        delete sessionMember(doc).conditions;

        const { session } = await opened(doc);
        assert.deepStrictEqual(visible(session), visible(saved));
        saved.dispose();
        session.dispose();
    });

    it("skip a condition this reader cannot read, take what is hidden from the steps, and keep the rest", async () => {
        const saved = await withConditions();
        const doc = JSON.parse((await saved.project.save()).text) as Doc;
        const conditions = sessionMember(doc).conditions as { list: unknown[] };
        conditions.list.push({ id: "later", on: true, effect: "style", rule: { kind: "isolated" } });

        const { session, problems } = await opened(doc);
        assert.deepStrictEqual(problems, [
            { code: "W_FILTER_CONDITION_SKIPPED", params: { slice: "visibility", id: "later" } },
        ]);
        assert.deepStrictEqual(visible(session), visible(saved));
        assert.deepStrictEqual(
            session.visibility.conditions.map(({ id, effect }) => [id, effect]),
            [
                ["keep", "keep"],
                ["drop", "keep"],
                ["pick", "select"],
            ],
        );
        assert.strictEqual(session.time.settings.mode, "cumulative");
        saved.dispose();
        session.dispose();
    });

    it("read the steps when the conditions are of a version this reader does not know", async () => {
        const saved = await withConditions();
        const doc = JSON.parse((await saved.project.save()).text) as Doc;
        (sessionMember(doc).conditions as { version: number }).version = 2;

        const { session, problems } = await opened(doc);
        assert.deepStrictEqual(problems, [
            { code: "W_FILTER_CONDITIONS_UNREADABLE", params: { slice: "visibility", version: 2 } },
        ]);
        assert.deepStrictEqual(visible(session), visible(saved));
        assert.isTrue(session.visibility.conditions.every((each) => each.effect === "keep"));
        saved.dispose();
        session.dispose();
    });

    it("prefer the conditions when a tool edited only the steps, and say so", async () => {
        const saved = await withConditions();
        const doc = JSON.parse((await saved.project.save()).text) as Doc;
        sessionMember(doc).steps = [];

        const { session, problems } = await opened(doc);
        assert.deepStrictEqual(problems, [{ code: "W_FILTER_STEPS_DIFFER", params: { slice: "visibility" } }]);
        assert.deepStrictEqual(session.visibility.conditions, saved.visibility.conditions);
        saved.dispose();
        session.dispose();
    });

    it("clear the previous project's conditions, select ones included, when another opens", async () => {
        const session = await withConditions();
        const plain = JSON.parse(JSON.stringify(PROJECT)) as Doc;
        delete sessionMember(plain).steps;
        await session.project.open(JSON.stringify(plain), { discard: true });
        assert.deepStrictEqual(session.visibility.conditions, []);
        session.dispose();
    });
});
