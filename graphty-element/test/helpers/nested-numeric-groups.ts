/**
 * @file An XGMML file with numeric node ids and nested groups (a node's `<att><graph>` holds its
 * members), declared out of id order so a node's row (graph-io's containment column holds the
 * parent's row) is never its id: rows 0..5 are ids 5, 3, 4, 1, 0, 2. Read as ids, the parent rows
 * would put 3 and 4 in node 0, and 1 and 0 in node 2.
 */

export const NESTED_XGMML = `<?xml version="1.0" encoding="UTF-8"?>
<graph label="nested" xmlns="http://www.cs.rpi.edu/XGMML" directed="1">
  <node id="5" label="outer">
    <att>
      <graph>
        <node id="3" label="m3"/>
        <node id="4" label="inner">
          <att>
            <graph>
              <node id="1" label="m1"/>
              <node id="0" label="m0"/>
            </graph>
          </att>
        </node>
      </graph>
    </att>
  </node>
  <node id="2" label="free"/>
  <edge source="0" target="1"/>
  <edge source="1" target="3"/>
  <edge source="3" target="2"/>
</graph>`;

/** Each group of {@link NESTED_XGMML} and the nodes it holds directly. */
export const NESTED_GROUPS: Readonly<Record<string, readonly string[]>> = { "5": ["3", "4"], "4": ["1", "0"] };

/** A saved project in the shape graphty-element wrote before the parent key held ids. */
interface SavedDocument {
    members: { kind: string; extensions?: Record<string, unknown>; graph?: { nodes: Record<string, unknown>[] } }[];
}

/**
 * A project file as graphty-element saved it before a record's `parent` held the parent's id:
 * each `parent` is the parent's row (its place among the load's records, which is its row here),
 * and the data member carries no `graphty.parent-ids` extension.
 * @param text - A project file saved now.
 * @returns The same project in the older form.
 */
export function savedWithParentRows(text: string): string {
    const doc = JSON.parse(text) as SavedDocument;
    const data = doc.members.find((member) => member.kind === "graphty-data");
    const nodes = data?.graph?.nodes ?? [];
    if (data === undefined || nodes.length === 0) {
        throw new Error("the file holds no node records");
    }

    delete data.extensions;
    for (const node of nodes) {
        if (node.parent !== undefined) {
            node.parent = nodes.findIndex((each) => each.id === node.parent);
        }
    }

    return JSON.stringify(doc);
}
