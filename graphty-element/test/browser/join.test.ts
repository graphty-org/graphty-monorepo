/**
 * @file Joining a table onto the rendered element: an expression table joined onto a protein
 * network gives the matched nodes their values, a style layer paints by them, and one undo takes
 * the join back.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import { mountElement, unmountElements } from "../helpers/mount-element";

const INTERACTIONS = "source,target\nTP53,MDM2\nMDM2,CDKN1A\nCDKN1A,TP53\nTP53,ATM\n";
const EXPRESSION = "symbol,log2fc\nTP53,2.1\nmdm2,-1.4\nBRCA1,0.3\n";

afterEach(unmountElements);

describe("joining a table onto the element's graph", () => {
    test("the joined values paint through a layer, and one undo takes them back", async () => {
        const { session } = await mountElement();
        await session.data.import({ type: "csv", config: { data: INTERACTIONS }, name: "ppi.csv" });
        const draft = await session.data.prepare(
            { config: { file: new File([EXPRESSION], "expression.csv") } },
            { onto: "graph" },
        );
        const { keys } = draft.suggestJoin();
        assert.deepStrictEqual(keys, [{ file: "symbol", graph: "id" }]);
        assert.deepInclude(draft.joinReport({ keys }), { matched: 1, notInGraph: 1, extraIgnoringCase: 1 });
        await draft.load({ join: { keys, ignoreCase: true } });

        const layer = await session.styles.add({
            name: "Up",
            target: "node",
            selector: { match: "expression", where: "data.log2fc > `0`" },
            set: { "node.color": "#ff0000" },
        });
        const painted = (): string[] =>
            session.data
                .nodes()
                .map((node) => String(node.id))
                .filter((id) =>
                    session.styles.explain({ node: id }).contributions.some((each) => each.layerId === layer.id),
                )
                .sort();
        assert.deepStrictEqual(painted(), ["TP53"]);
        assert.strictEqual(session.data.node("MDM2")?.log2fc, -1.4);
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.kind),
            ["file", "join"],
        );

        await session.undo(); // the layer
        await session.undo(); // the join
        assert.isUndefined(session.data.node("TP53")?.log2fc);
        assert.deepStrictEqual(session.data.joins(), []);
    });
});
