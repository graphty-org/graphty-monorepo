/**
 * @file `LoadReport.errors`: what a load met, as codes and facts, on `lastImport()` and on a
 * draft's `report()`. A recognisable GraphML or GEXF file that breaks off keeps what was read
 * before the break and says where it broke (#1218).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

const HEAD =
    '<?xml version="1.0"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n' +
    '<graph edgedefault="directed">\n<node id="a"/>\n';

/** Each malformed GraphML case from the issue, the nodes kept, and the line it breaks on. */
const BROKEN_GRAPHML = [
    { name: "a stray end tag", data: `${HEAD}</node>\n<node id="b"/>\n</graph>\n</graphml>\n`, nodes: 1, line: 5 },
    { name: "an unclosed node tag", data: `${HEAD}<node id="b">\n</graph>\n</graphml>\n`, nodes: 1, line: 6 },
    { name: "an unclosed attribute quote", data: `${HEAD}<node id="b/>\n</graph>\n</graphml>\n`, nodes: 1, line: 5 },
    { name: "trailing garbage", data: `${HEAD}<node id="b"/>\n</graph>\n</graphml>\ngarbage<\n`, nodes: 2, line: 8 },
    { name: "a file cut off mid-tag", data: `${HEAD}<node id="b"/>\n<node id=`, nodes: 2, line: 6 },
] as const;

describe("LoadReport.errors", () => {
    for (const broken of BROKEN_GRAPHML) {
        it(`keeps the graph read before ${broken.name} in a GraphML file, and reports the line`, async () => {
            const session = createGraphSession();
            await session.data.import({ type: "graphml", config: { data: broken.data } });

            const report = session.data.lastImport();
            assert.strictEqual(session.data.statistics().nodeCount, broken.nodes, "what came before the break is kept");
            assert.strictEqual(report?.errors[0]?.code, "parse-error");
            assert.strictEqual(report?.errors[0]?.line, broken.line);
            assert.strictEqual(report?.errors[0]?.params.issue, "E_XML_SYNTAX");
            session.dispose();
        });
    }

    it("keeps the graph read before a GEXF file breaks off, and reports the line", async () => {
        const session = createGraphSession();
        const data =
            '<?xml version="1.0"?><gexf version="1.3"><graph>\n' +
            '<nodes><node id="a"/>\n<node id="b"></nodes></graph></gexf>';
        await session.data.import({ type: "gexf", config: { data } });

        const report = session.data.lastImport();
        assert.strictEqual(session.data.statistics().nodeCount, 2);
        assert.strictEqual(report?.errors[0]?.code, "parse-error");
        assert.strictEqual(report?.errors[0]?.line, 3);
        session.dispose();
    });

    it("reports the break on a draft's report before the load, too", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "graphml", config: { data: BROKEN_GRAPHML[0].data } });

        const report = await draft.report();
        assert.strictEqual(report.errors[0]?.code, "parse-error");
        assert.strictEqual(report.errors[0]?.line, 5);
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
