/**
 * @file A page of only the records an issue is on (`RecordPageOptions.issue`), the open issues
 * each page record is on (`RecordPage.issues`), `data.ignoreIssues` as one undo step, and the
 * label column a dataset's nodes carry becoming the node label on load.
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { accountsCsv, transfersCsv } from "../helpers/fraud-fixture";

/** OpenFlights from graph-samples' build output, never the network. */
const OPENFLIGHTS = readFileSync(new URL("../../../graph-samples/dist/data/v1/openflights.gsnp.gz", import.meta.url));

/**
 * A session holding OpenFlights, loaded as the app loads a sample, with the download answered
 * from the local build.
 * @returns The session.
 */
async function openflights(): Promise<GraphSession> {
    vi.stubGlobal("fetch", (): Promise<Response> => Promise.resolve(new Response(OPENFLIGHTS)));
    const session = createGraphSession();
    await session.data.loadDataset("openflights");
    return session;
}

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

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("a page of the records an issue is on", () => {
    it("pages OpenFlights' one case variant of a city as exactly the BRISTOL row", async () => {
        const session = await openflights();
        const id = "case-variant:node:city";
        assert.strictEqual(session.data.issues().find((each) => each.id === id)?.count, 1);

        const page = session.data.nodePage({ issue: id, limit: Infinity });
        assert.strictEqual(page.total, 1);
        assert.deepStrictEqual(
            page.records.map((record) => record.city),
            ["BRISTOL"],
        );
        assert.include(page.issues?.[0] ?? [], id);

        // "any" holds it too, and an ignored issue leaves the page.
        const any = session.data.nodePage({ issue: "any", limit: Infinity });
        assert.isTrue(any.records.some((record) => record.city === "BRISTOL"));
        await session.data.ignoreIssue(id);
        assert.strictEqual(session.data.nodePage({ issue: id }).total, 0);
        session.dispose();
    });

    it("marks each record of an unfiltered page with its open issues, and none when there are none", async () => {
        const session = await fraud();
        assert.isUndefined(session.data.edgePage({ limit: Infinity }).issues, "only a page that asks");
        const page = session.data.edgePage({ limit: Infinity, markIssues: true });
        const issues = page.issues ?? [];
        assert.strictEqual(issues.length, page.records.length);
        const commas = page.records.filter((_, at) => issues[at].includes("decimal-comma:edge:amount"));
        assert.strictEqual(commas.length, 3);

        const filtered = session.data.edgePage({ issue: "decimal-comma:edge:amount", limit: Infinity });
        assert.deepStrictEqual(
            filtered.records.map((record) => record.id),
            commas.map((record) => record.id),
        );
        session.dispose();
    });
});

describe("data.ignoreIssues", () => {
    it("ignores two issues in one step, and one undo lists both again", async () => {
        const session = await fraud();
        const ids = ["decimal-comma:edge:amount", "not-a-number:edge:amount"];
        const steps = session.history.steps.length;

        await session.data.ignoreIssues(ids);
        assert.strictEqual(session.history.steps.length, steps + 1);
        const open = session.data.issues().map((each) => each.id);
        for (const id of ids) {
            assert.notInclude(open, id);
        }

        await session.undo();
        const back = session.data.issues().map((each) => each.id);
        for (const id of ids) {
            assert.include(back, id);
        }

        session.dispose();
    });

    it("records nothing when nothing changes, and refuses an issue the data does not have", async () => {
        const session = await fraud();
        const steps = session.history.steps.length;
        await session.data.ignoreIssues([]);
        assert.strictEqual(session.history.steps.length, steps);

        let refused: unknown;
        try {
            await session.data.ignoreIssues(["decimal-comma:edge:amount", "no-such-issue"]);
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as { code?: string } | undefined)?.code, "E_BAD_COMMAND");
        assert.strictEqual(session.history.steps.length, steps, "nothing is ignored then");
        session.dispose();
    });
});

describe("data.ignoreIssues does work in proportion to the graph", () => {
    /**
     * A session of `size` nodes, every name padded and every kind in two cases.
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
                Array.from({ length: size }, (_, at) => ({
                    id: `n${String(at)}`,
                    name: ` n${String(at)} `,
                    kind: at % 2 === 0 ? "Acme" : "ACME",
                })),
            );
            return session;
        } finally {
            scope.__GRAPHTY_STRICT_STATE__ = strict;
        }
    }

    it("SessionDataApi.ignoreIssues: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await padded(size);
                const visits = await visitsDuring(() =>
                    session.data.ignoreIssues(["padded-space:node:name", "case-variant:node:kind"]),
                );
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.ignoreIssues" },
        );
    });
});

describe("a dataset's label column", () => {
    it("names OpenFlights' airports by their label when no label path is set", async () => {
        const session = await openflights();
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "label");
        session.dispose();
    });
});
