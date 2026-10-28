/**
 * @file `session.data.issues()`, `data.fix()` and `data.ignoreIssue()`: what is wrong with the
 * loaded data as neutral facts, each fix one undo step, an ignored issue kept through a reload.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type DataIssue, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { accountsCsv, transfersCsv } from "../helpers/fraud-fixture";

/**
 * A session holding the fraud fixture, loaded the way a reader drops both files.
 * @returns The session.
 */
async function fraud(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({
        config: {
            nodeFile: new File([accountsCsv()], "accounts.csv"),
            edgeFile: new File([transfersCsv()], "transfers.csv"),
        },
    });
    await draft.load();
    return session;
}

/**
 * One issue by id.
 * @param session - The session.
 * @param id - The issue's id.
 * @returns The issue.
 */
function issue(session: GraphSession, id: string): DataIssue | undefined {
    return session.data.issues({ includeIgnored: true }).find((each) => each.id === id);
}

/**
 * Every edge's value of one column.
 * @param session - The session.
 * @param name - The column.
 * @returns The values, in edge order.
 */
function edgeValues(session: GraphSession, name: string): unknown[] {
    return session.data.edges().map((edge) => edge[name]);
}

describe("session.data.issues", () => {
    it("reports exactly what is wrong with the fraud fixture", async () => {
        const session = await fraud();
        const issues = session.data.issues();
        const counts = Object.fromEntries(issues.map((each) => [each.id, each.count]));
        assert.deepEqual(counts, {
            "unknown-end:edge": 18,
            "repeated-id:node": 2,
            "refused-row": 1,
            "repeated-edge:edge": 5,
            "decimal-comma:edge:amount": 3,
            "not-a-number:edge:amount": 1,
            "could-be-yes-no:node:flagged": 298,
        });

        const refused = issue(session, "refused-row");
        assert.deepEqual(refused?.params, { lines: [412], issues: ["E_CSV_FIELD_COUNT"] });
        assert.deepEqual(refused?.fixes, []);
        assert.strictEqual(refused?.source, "s1");
        assert.deepEqual(issue(session, "unknown-end:edge")?.params.nodes, 18);
        // The made nodes are already there: "add-nodes" is what the data shows, not a fix to offer.
        assert.deepEqual(issue(session, "unknown-end:edge")?.fixes, ["leave-out"]);
        assert.strictEqual(issue(session, "unknown-end:edge")?.current, "add-nodes");
        assert.deepEqual(issue(session, "repeated-edge:edge")?.fixes, ["merge"]);
        assert.strictEqual(issue(session, "repeated-edge:edge")?.current, "keep");
        assert.deepEqual(issue(session, "repeated-id:node")?.fixes, ["merge-rows"]);
        assert.strictEqual(issue(session, "repeated-id:node")?.current, "keep-first");
        assert.deepEqual(issue(session, "repeated-id:node")?.params.ids, ["A010", "A020"]);
        assert.deepEqual(issue(session, "not-a-number:edge:amount")?.params.examples, ["N/A"]);
        assert.deepEqual(issue(session, "decimal-comma:edge:amount")?.column, { kind: "edge", name: "amount" });
        for (const each of issues) {
            assert.isAbove(each.count, 0);
            assert.isFalse(each.ignored);
            assert.strictEqual(each.status, "open");
            assert.notProperty(each, "message", "an issue carries facts, not words");
        }

        session.dispose();
    });

    it("reports padded values, case variants and mixed types in a column, and nothing for a clean one", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", name: "Acme ", team: "Red", tag: 1, clean: "x" },
            { id: "b", name: "Bolt", team: "red", tag: "one", clean: "y" },
            { id: "c", name: "Core", team: "Red", tag: "two", clean: "z" },
        ]);

        const ids = session.data.issues().map((each) => [each.id, each.count]);
        assert.deepEqual(ids, [
            ["padded-space:node:name", 1],
            ["case-variant:node:team", 1],
            ["mixed-type:node:tag", 1],
        ]);
        await session.data.fix("case-variant:node:team", "merge-case");
        assert.deepEqual(
            session.data.nodes().map((node) => node.team),
            ["Red", "Red", "Red"],
        );
        await session.data.fix("padded-space:node:name", "trim");
        assert.strictEqual(session.data.node("a")?.name, "Acme");
        assert.deepEqual(
            session.data.issues().map((each) => each.id),
            ["mixed-type:node:tag"],
        );
        session.dispose();
    });

    it("lists nothing for a clean file", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target,weight\na,b,1\nb,c,2\n" } });
        assert.deepEqual(session.data.issues(), []);
        session.dispose();
    });
});

describe("data.fix", () => {
    it("reads decimal commas as numbers in one step, and undo puts them back", async () => {
        const session = await fraud();
        const before = edgeValues(session, "amount");
        const steps = session.history.steps.length;

        const result = await session.data.fix("decimal-comma:edge:amount", "read-decimal-comma");
        assert.deepEqual(result, { nodes: 0, edges: 3 });
        assert.isUndefined(issue(session, "decimal-comma:edge:amount"));
        assert.isTrue(edgeValues(session, "amount").includes(100.75));
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepEqual(session.history.steps.at(-1)?.fact, {
            code: "data.fix-issue",
            params: { issue: "decimal-comma:edge:amount", code: "decimal-comma", fix: "read-decimal-comma", count: 3 },
        });

        await session.undo();
        assert.deepEqual(edgeValues(session, "amount"), before);
        assert.strictEqual(issue(session, "decimal-comma:edge:amount")?.count, 3);
        session.dispose();
    });

    it("reads a column of yes and no as truth values", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", flagged: "yes" },
            { id: "b", flagged: "No" },
            { id: "c", flagged: null },
        ]);
        assert.deepEqual(issue(session, "could-be-yes-no:node:flagged")?.params, { values: ["yes", "no"] });
        await session.data.fix("could-be-yes-no:node:flagged", "read-yes-no");
        assert.deepEqual(
            session.data.nodes().map((node) => node.flagged),
            [true, false, null],
        );
        assert.isUndefined(issue(session, "could-be-yes-no:node:flagged"));
        session.dispose();
    });

    it("makes a value that is not a number blank", async () => {
        const session = await fraud();
        await session.data.fix("not-a-number:edge:amount", "make-blank");
        assert.isFalse(edgeValues(session, "amount").includes("N/A"));
        assert.isUndefined(issue(session, "not-a-number:edge:amount"));
        session.dispose();
    });

    it("leaves out the unknown ends and their edges, and undo brings them back", async () => {
        const session = await fraud();
        const { nodeCount, edgeCount } = session.data.statistics();

        assert.deepEqual(await session.data.fix("unknown-end:edge", "leave-out"), { nodes: 18, edges: 18 });
        assert.strictEqual(session.data.statistics().nodeCount, nodeCount - 18);
        assert.strictEqual(session.data.statistics().edgeCount, edgeCount - 18);
        assert.isUndefined(issue(session, "unknown-end:edge"));

        await session.undo();
        assert.strictEqual(session.data.statistics().edgeCount, edgeCount);
        assert.strictEqual(issue(session, "unknown-end:edge")?.count, 18);
        session.dispose();
    });

    it("keeps the made nodes, the first rows and the repeated edges without changing the data", async () => {
        const session = await fraud();
        const { nodeCount, edgeCount } = session.data.statistics();
        await session.data.fix("unknown-end:edge", "add-nodes");
        await session.data.fix("repeated-id:node", "keep-first");
        await session.data.fix("repeated-edge:edge", "keep");
        assert.deepEqual(session.data.statistics().nodeCount, nodeCount);
        assert.deepEqual(session.data.statistics().edgeCount, edgeCount);
        assert.deepEqual(
            session.data.issues().map((each) => each.id),
            ["refused-row", "could-be-yes-no:node:flagged", "decimal-comma:edge:amount", "not-a-number:edge:amount"],
        );

        await session.undo();
        assert.strictEqual(issue(session, "repeated-edge:edge")?.count, 5);
        session.dispose();
    });

    it("merges repeated edges and repeated rows", async () => {
        const session = await fraud();
        const { edgeCount } = session.data.statistics();
        await session.data.fix("repeated-edge:edge", "merge");
        assert.strictEqual(session.data.statistics().edgeCount, edgeCount - 5);
        assert.isUndefined(issue(session, "repeated-edge:edge"));

        await session.data.fix("repeated-id:node", "merge-rows");
        assert.strictEqual(session.data.node("A010")?.holder, "Holder 10 again");
        assert.isUndefined(issue(session, "repeated-id:node"));
        session.dispose();
    });

    it("refuses an issue the data does not have and a fix the issue does not take", async () => {
        const session = await fraud();
        const refusal = async (work: () => Promise<unknown>): Promise<unknown> =>
            work().then(
                () => assert.fail("expected a refusal"),
                (error: unknown) => (error as { code: string; details: unknown }).details,
            );

        assert.include(await refusal(() => session.data.fix("nothing", "trim")), { reason: "unknown-issue" });
        assert.include(await refusal(() => session.data.fix("refused-row", "trim")), { reason: "unknown-fix" });
        session.dispose();
    });
});

describe("fixed issues", () => {
    it("stay listable with includeFixed, as they stood, and undo lists them open again", async () => {
        const session = await fraud();
        await session.data.fix("unknown-end:edge", "add-nodes");
        await session.data.fix("decimal-comma:edge:amount", "read-decimal-comma");
        assert.isUndefined(issue(session, "unknown-end:edge"), "a fixed issue is not listed by default");

        const fixed = session.data.issues({ includeFixed: true }).filter((each) => each.status === "fixed");
        assert.deepEqual(
            fixed.map((each) => [each.id, each.fixedBy, each.count, each.fixes]),
            [
                ["unknown-end:edge", "add-nodes", 18, []],
                ["decimal-comma:edge:amount", "read-decimal-comma", 3, []],
            ],
        );

        const { text } = await session.project.save();
        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepEqual(
            opened.data
                .issues({ includeFixed: true })
                .filter((each) => each.status === "fixed")
                .map((each) => each.id),
            ["unknown-end:edge", "decimal-comma:edge:amount"],
            "the fixed record survives a reload",
        );

        await session.undo();
        await session.undo();
        assert.strictEqual(issue(session, "unknown-end:edge")?.status, "open");
        assert.isEmpty(session.data.issues({ includeFixed: true }).filter((each) => each.status === "fixed"));
        session.dispose();
        opened.dispose();
    });
});

describe("data.ignoreIssue", () => {
    it("hides an ignored issue, lists it with includeIgnored, and keeps it through a reload", async () => {
        const session = await fraud();
        await session.data.ignoreIssue("repeated-edge:edge");
        assert.isUndefined(session.data.issues().find((each) => each.id === "repeated-edge:edge"));
        assert.isTrue(issue(session, "repeated-edge:edge")?.ignored);
        assert.strictEqual(issue(session, "repeated-edge:edge")?.status, "ignored");
        assert.deepEqual(session.history.steps.at(-1)?.fact, {
            code: "data.ignore-issue",
            params: { issue: "repeated-edge:edge", ignored: true },
        });

        const { text } = await session.project.save();
        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepEqual(
            opened.data.issues().map((each) => [each.id, each.count]),
            session.data.issues().map((each) => [each.id, each.count]),
            "the load issues survive the reload too",
        );
        assert.isTrue(issue(opened, "repeated-edge:edge")?.ignored);

        await opened.data.ignoreIssue("repeated-edge:edge", false);
        assert.strictEqual(opened.data.issues().find((each) => each.id === "repeated-edge:edge")?.count, 5);

        await session.undo();
        assert.isFalse(issue(session, "repeated-edge:edge")?.ignored);
        session.dispose();
        opened.dispose();
    });
});

describe("the issue verbs do work in proportion to the graph", () => {
    /**
     * A session of `size` nodes, every name padded.
     * @param size - The node count.
     * @returns The session.
     */
    async function padded(size: number): Promise<GraphSession> {
        const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
        const strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
        try {
            const session = createGraphSession();
            await session.data.addNodes(
                Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, name: ` n${String(at)} ` })),
            );
            return session;
        } finally {
            scope.__GRAPHTY_STRICT_STATE__ = strict;
        }
    }

    for (const verb of ["fix", "ignoreIssue"] as const) {
        it(`SessionDataApi.${verb}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const session = await padded(size);
                    const visits = await visitsDuring(() =>
                        verb === "fix"
                            ? session.data.fix("padded-space:node:name", "trim")
                            : session.data.ignoreIssue("padded-space:node:name"),
                    );
                    session.dispose();
                    return visits;
                },
                { sizes: [200, 800], growth: "linear", counter: `elements visited by SessionDataApi.${verb}` },
            );
        });
    }
});
