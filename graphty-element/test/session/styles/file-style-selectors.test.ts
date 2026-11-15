/**
 * Which elements a file's rule paints, as its layer selects them: a short predicate becomes an expression the
 * element evaluates, and one the expression language cannot say -- wider than 8 terms, empty, or over a column no
 * layer can read -- is written onto the elements as a membership value selected with `has`. Either way the layer
 * paints exactly the elements graph-io's own reading of the rule matches.
 */
import { importGraph } from "@graphty/graph-io";
import { type ExtractedStyles, matchPredicate, type Predicate, type StyleRule } from "@graphty/graph-io/styles";
import { assert, describe, it } from "vitest";

import { translateFileStyles } from "../../../src/session/styles/fileStyles/translate";

/** Ten nodes `n0`..`n9` in a ring: `group` is `g<i>`, `rank` is i, and only even nodes have `tag`. */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
<graph defaultedgetype="directed">
<attributes class="node">
<attribute id="0" title="group" type="string"/><attribute id="1" title="rank" type="integer"/>
<attribute id="2" title="tag" type="string"/>
</attributes>
<nodes>
${Array.from(
    { length: 10 },
    (_unused, i) =>
        `<node id="n${String(i)}" label="n${String(i)}"><attvalues><attvalue for="0" value="g${String(i)}"/>` +
        `<attvalue for="1" value="${String(i)}"/>${i % 2 === 0 ? `<attvalue for="2" value="t"/>` : ""}</attvalues></node>`,
).join("\n")}
</nodes>
<edges>
${Array.from({ length: 10 }, (_unused, i) => `<edge source="n${String(i)}" target="n${String((i + 1) % 10)}"/>`).join("\n")}
</edges>
</graph></gexf>`;

const RED = "#ff0000";
/** The membership value the translation writes onto the elements rule r1 selects. */
const MEMBERSHIP = "graphty.style.gexf.node.el.where.r1";

/**
 * The file read with its styles.
 * @returns The styles and the graph.
 */
async function read(): Promise<{
    extracted: ExtractedStyles;
    snapshot: Awaited<ReturnType<typeof importGraph>>["snapshot"];
}> {
    const result = await importGraph(new TextEncoder().encode(GEXF), { styles: true, format: "gexf" });
    if (result.styles === null || result.styles === undefined) {
        assert.fail("the file carries styles");
    }
    return { extracted: result.styles, snapshot: result.snapshot };
}

/**
 * Translate one rule that paints what it selects red, alone in the file.
 * @param target - Nodes or edges.
 * @param where - What the rule selects.
 * @param readable - The data columns a layer can read at `data.<name>`; any other is not readable.
 * @returns The rule's layer's selector (an expression scoped to the load), null when it made no layer; which elements the layer paints red, and which graph-io matches.
 */
async function paintRed(
    target: "node" | "edge",
    where: Predicate,
    readable: readonly string[] = ["group", "rank", "tag"],
): Promise<{ where: string | null; painted: boolean[]; matched: boolean[] }> {
    const { extracted, snapshot } = await read();
    const rule: StyleRule = {
        id: "r1",
        target,
        role: "group",
        origin: "declared",
        where,
        set: { fill: RED },
    };
    const styles: ExtractedStyles = { ...extracted, styles: { ...extracted.styles, rules: [rule] } };
    const translation = translateFileStyles({
        extracted: styles,
        snapshot,
        namespace: "gexf",
        format: "gexf",
        importId: "i1",
        options: { toolDefaults: false },
        base: { node: {}, edge: {} },
        dataPath: (_kind, column) => (readable.includes(column) ? `data.${column}` : null),
    });
    const layers = translation.layers.filter((layer) => layer.spec.name === rule.id);
    assert.isAtMost(layers.length, 1);
    const channel = target === "node" ? "node.color" : "edge.color";
    const paint = translation.predicted[target]?.get(channel) ?? [];
    const selector = layers.at(0)?.spec.selector;
    return {
        where: selector?.match === "expression" ? selector.where : null,
        painted: Array.from(paint, (value) => value === RED),
        matched: [...matchPredicate(styles, target, where, snapshot)],
    };
}

const group = { data: "group" } as const;
const rank = { data: "rank" } as const;

describe("a file rule's selector", () => {
    it("is an expression for a short or-group, painting the nodes either side matches", async () => {
        const { where, painted, matched } = await paintRed("node", {
            or: [{ eq: [group, "g1"] }, { in: [rank, [3, 4]] }],
        });
        assert.include(where ?? "", "data.group == 'g1' || (data.rank == `3` || data.rank == `4`)");
        assert.deepEqual(painted, matched);
        assert.deepEqual(
            painted.flatMap((on, i) => (on ? [i] : [])),
            [1, 3, 4],
        );
    });

    it("is an expression for a negation, painting every node it does not name", async () => {
        const { where, painted } = await paintRed("node", { not: { eq: [group, "g0"] } });
        assert.include(where ?? "", "!(data.group == 'g0')");
        assert.deepEqual(
            painted.flatMap((on, i) => (on ? [i] : [])),
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
        );
    });

    it("is a membership value for a group wider than 8 terms", async () => {
        const values = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"];
        const { where, painted, matched } = await paintRed("node", { in: [group, values] });
        assert.include(where ?? "", MEMBERSHIP);
        assert.deepEqual(painted, matched);
        assert.deepEqual(
            painted.flatMap((on, i) => (on ? [i] : [])),
            [0, 1, 2, 3, 4, 5, 6, 7, 8],
        );
    });

    it("is a membership value when the expression language cannot say it, and paints what graph-io matches", async () => {
        const cases: Predicate[] = [
            // an empty list of values, negated: every node
            { not: { in: [group, []] } },
            // one side over a column the reader left out of the records
            { or: [{ eq: [group, "g2"] }, { has: { data: "missing" } }] },
        ];
        for (const where of cases) {
            const { where: expression, painted, matched } = await paintRed("node", where);
            assert.include(expression ?? "", MEMBERSHIP, JSON.stringify(where));
            assert.deepEqual(painted, matched, JSON.stringify(where));
        }
    });

    it("reads a column a layer cannot reach at its data path from values kept per element", async () => {
        const { where, painted } = await paintRed("node", { eq: [group, "g5"] }, []);
        assert.include(where ?? "", `graphty.style.gexf.node.el.data."0" == 'g5'`);
        assert.deepEqual(
            painted.flatMap((on, i) => (on ? [i] : [])),
            [5],
        );
    });

    it("makes no layer for a rule graph-io matches on no element", async () => {
        const cases: ["node" | "edge", Predicate][] = [
            // an empty or-group
            ["node", { or: [] }],
            // a style column no load holds
            ["node", { has: { style: "missing" } }],
            // a node's degree, on an edge: no edge has one
            ["edge", { has: { computed: "degree" } }],
        ];
        for (const [target, where] of cases) {
            const { where: expression, painted, matched } = await paintRed(target, where);
            assert.deepEqual(matched, new Array<boolean>(10).fill(false), JSON.stringify(where));
            assert.isNull(expression, JSON.stringify(where));
            assert.notInclude(painted, true, JSON.stringify(where));
        }
    });
});
