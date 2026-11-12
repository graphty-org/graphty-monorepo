/**
 * @file A page's `matching: { names: true }` on a graph opened from a graph file with no label
 * column: the load names `label` as the label column whether or not the file has one, so a name
 * search must still read the file's own name column.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const PEOPLE = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="role" for="node" attr.name="role" attr.type="string"/>
  <key id="hours" for="node" attr.name="hours" attr.type="int"/>
  <key id="trained" for="node" attr.name="trained" attr.type="boolean"/>
  <key id="phone" for="node" attr.name="phone" attr.type="string"/>
  <graph id="G" edgedefault="undirected">
    <node id="v01"><data key="name">Maria Lopez</data><data key="role">board</data><data key="hours">12</data><data key="trained">true</data><data key="phone">555-0101</data></node>
    <node id="v02"><data key="name">James Carter</data><data key="role">staff</data><data key="hours">48</data><data key="trained">true</data><data key="phone">555-0102</data></node>
    <node id="v03"><data key="name">Aisha Bello</data><data key="role">volunteer</data><data key="hours">22</data><data key="trained">true</data></node>
    <edge source="v01" target="v02"/>
    <edge source="v02" target="v03"/>
  </graph>
</graphml>`;

/**
 * The ids of a page's records.
 * @param page - the page
 * @param page.records - its records
 * @returns the ids, in page order
 */
function ids(page: { readonly records: readonly { readonly id: unknown }[] }): unknown[] {
    return page.records.map((record) => record.id);
}

describe("a name search on a graph file with no label column", () => {
    it("finds a node by its name column, as imported", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "graphml", config: { data: PEOPLE } });

        for (const text of ["James", "Carter", "James Carter"]) {
            assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text, names: true } })), ["v02"], text);
        }
        assert.deepStrictEqual(
            ids(session.data.nodePage({ matching: { text: "James", mode: "starts-with", names: true } })),
            ["v02"],
        );
        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "v02", names: true } })), ["v02"]);
        session.dispose();
    });

    it("finds a node by its name column, as opened through a draft", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "graphml", config: { data: PEOPLE } });
        await draft.load();

        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "James", names: true } })), ["v02"]);
        session.dispose();
    });
});
