/**
 * @file `LoadReport.errors`: what a load met, as codes and facts, on `lastImport()` and on a
 * draft's `report()`. A recognisable GraphML or GEXF file that breaks off is refused whole, with
 * `E_PARSE_FAILED` and the line it broke on, and adds nothing to the graph (#1218).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

/**
 * What a promise was refused with, as the error's code and `details.line`.
 * @param promise - The promise.
 * @returns The code and line, or null when it resolved.
 */
async function refusal(promise: Promise<unknown>): Promise<{ code?: string; line?: unknown } | null> {
    return promise.then(
        () => null,
        (error: unknown) => {
            const { code, details } = error as { code?: string; details?: { line?: unknown } };
            return { code, line: details?.line };
        },
    );
}

const HEAD =
    '<?xml version="1.0"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n' +
    '<graph edgedefault="directed">\n<node id="a"/>\n';

/** Each malformed GraphML case from the issue, the nodes read before the break, and the line it breaks on. */
const BROKEN_GRAPHML = [
    { name: "a stray end tag", data: `${HEAD}</node>\n<node id="b"/>\n</graph>\n</graphml>\n`, nodes: 1, line: 5 },
    { name: "an unclosed node tag", data: `${HEAD}<node id="b">\n</graph>\n</graphml>\n`, nodes: 1, line: 6 },
    { name: "an unclosed attribute quote", data: `${HEAD}<node id="b/>\n</graph>\n</graphml>\n`, nodes: 1, line: 5 },
    { name: "trailing garbage", data: `${HEAD}<node id="b"/>\n</graph>\n</graphml>\ngarbage<\n`, nodes: 2, line: 8 },
    { name: "a file cut off mid-tag", data: `${HEAD}<node id="b"/>\n<node id=`, nodes: 2, line: 6 },
] as const;

describe("LoadReport.errors", () => {
    for (const broken of BROKEN_GRAPHML) {
        it(`refuses a GraphML file with ${broken.name}, keeps nothing, and reports the line`, async () => {
            const session = createGraphSession();
            const refused = await refusal(session.data.import({ type: "graphml", config: { data: broken.data } }));

            assert.deepEqual(refused, { code: "E_PARSE_FAILED", line: broken.line });
            assert.isAbove(broken.nodes, 0, "the file holds nodes before the break");
            assert.strictEqual(session.data.statistics().nodeCount, 0, "nothing read before the break is kept");
            session.dispose();
        });
    }

    it("refuses a GEXF file that breaks off, keeps nothing, and reports the line", async () => {
        const session = createGraphSession();
        const data =
            '<?xml version="1.0"?><gexf version="1.3"><graph>\n' +
            '<nodes><node id="a"/>\n<node id="b"></nodes></graph></gexf>';
        const refused = await refusal(session.data.import({ type: "gexf", config: { data } }));

        assert.deepEqual(refused, { code: "E_PARSE_FAILED", line: 3 });
        assert.strictEqual(session.data.statistics().nodeCount, 0);
        session.dispose();
    });

    it("refuses a draft of a broken file before the load, too", async () => {
        const session = createGraphSession();
        const refused = await refusal(
            (async () => {
                const draft = await session.data.prepare({ type: "graphml", config: { data: BROKEN_GRAPHML[0].data } });
                await draft.report();
            })(),
        );

        assert.deepEqual(refused, { code: "E_PARSE_FAILED", line: 5 });
        session.dispose();
    });

    it("lists a CSV row the reader could not use", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target,weight\na,b,1\nb,c,1,9\n" } });

        const errors = session.data.lastImport()?.errors ?? [];
        assert.isAbove(errors.length, 0, JSON.stringify(errors));
        assert.isNumber(errors[0].line);
        assert.notProperty(errors[0], "message", "a report entry carries facts, not words");
        session.dispose();
    });

    it("lists a refused draft row", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: "id,name\n,A\nb,B\n" } });

        const report = await draft.report();
        assert.deepInclude(report.errors, { code: "refused-row", params: { rowsAre: "nodes" } });
        session.dispose();
    });

    it("is empty for a clean file", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });

        assert.deepEqual(session.data.lastImport()?.errors, []);
        session.dispose();
    });
});
