/**
 * @file `session.data.import` of a graph file names its nodes by the file's label column, as a
 * draft's load of the same file does: College football's GML numbers its teams and labels them.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

const GML =
    'graph [ node [ id 0 label "BrighamYoung" ] node [ id 1 label "FloridaState" ] edge [ source 0 target 1 ] ]';

describe("data.import names a graph file's nodes", () => {
    it("names a GML node by its label, and finds its edges by those names", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "gml", config: { data: GML } });

        assert.strictEqual(session.data.name(0), "BrighamYoung");
        const found = session.find("Florida", { edgeNameJoiner: " -- " });
        assert.isTrue(
            found.records.some((hit) => hit.kind === "edge" && hit.match.path === "ends"),
            "an edge is found by an end's name",
        );
        session.dispose();
    });

    it("keeps a label path already configured, and names nothing from a CSV", async () => {
        const configured = createGraphSession();
        await configured.config.set({ data: { knownFields: { nodeLabelPath: "id" } } });
        await configured.data.import({ type: "gml", config: { data: GML } });
        assert.strictEqual(configured.data.name(0), "0");
        configured.dispose();

        const csv = createGraphSession();
        await csv.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        assert.strictEqual(csv.config.data.knownFields.nodeLabelPath, null);
        csv.dispose();
    });
});
