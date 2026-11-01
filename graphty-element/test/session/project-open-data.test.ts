/**
 * A graph file or a CSV file reaches the graph the same way whichever verb reads it:
 * `session.project.open`'s draft loads exactly what `session.data.import` loads, and a project file handed to a data
 * import is refused with a code instead of loading as an empty graph.
 */
import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";
import { makeSession } from "./helpers";

/** One file of each graph format shape: files whose format, not the reader, sets the columns. */
const FILES: readonly (readonly [string, string])[] = [
    [
        "labels.graphml",
        '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">' +
            '<key id="l" for="node" attr.name="label" attr.type="string"/>' +
            '<key id="w" for="edge" attr.name="weight" attr.type="double"/>' +
            '<graph edgedefault="undirected"><node id="a"><data key="l">Alpha</data></node>' +
            '<node id="b"><data key="l">Beta</data></node>' +
            '<edge source="a" target="b"><data key="w">2</data></edge></graph></graphml>',
    ],
    [
        "labels.json",
        JSON.stringify({
            nodes: [{ id: "a", label: "Alpha" }, { id: "b" }],
            edges: [{ source: "a", target: "b", weight: 5 }],
        }),
    ],
    ["ring.gml", 'graph [ node [ id 1 label "One" ] node [ id 2 ] edge [ source 1 target 2 value 7 ] ]'],
    ["neato.dot", "digraph G { layout=neato; a -> b [weight=2]; b -> c; }"],
];

/** CSV files, whose cells the draft types for its mapping: ids still load as text, as import reads them. */
const CSV_FILES: readonly (readonly [string, string])[] = [
    ["edges.csv", "source,target,weight\n1,2,3\n2,3,4\n"],
    ["from-to.csv", "from,to,w\n1,2,true\n2,x,1.5\n"],
    ["nodes.csv", "id,label,size\n1,One,3\n2,Two,4\n"],
];

/**
 * Everything a load leaves that a consumer can read: the settings, the rows, the columns, the
 * facts and the values kept beside the graph.
 * @param session - The session.
 * @returns The state.
 */
function stateOf(session: GraphSession): unknown {
    return {
        data: session.config.data,
        nodes: session.data.nodes(),
        edges: session.data.edges().map(({ id: _id, ...edge }) => edge),
        attributes: session.data.attributes(),
        statistics: session.data.statistics(),
        values: [...dispatcherOf(session).state.graph.values.entries()],
    };
}

/**
 * Load a file into a fresh session, one way or the other, with a weight setting already made.
 * @param name - The file's name.
 * @param text - Its text.
 * @param via - `import` for `data.import`, `open` for `project.open` and its draft.
 * @returns What the load left, as JSON.
 */
async function loaded(name: string, text: string, via: "import" | "open"): Promise<string> {
    const { session } = makeSession();
    // No label path configured: both verbs label the nodes with a graph file's `label` field.
    await session.config.set({ data: { knownFields: { edgeWeightPath: "value" } } });
    const file = new File([text], name);
    if (via === "import") {
        await session.data.import({ config: { file }, name }, { styles: "file" });
    } else {
        const report = await session.project.open(file);
        assert.strictEqual(report.opened, "graph");
        await report.draft?.load({ styles: "file" });
    }

    // As plain data, key order included: frozen records and class instances compare by what they hold.
    const state = JSON.stringify(stateOf(session), (key: string, value: unknown) =>
        // How a CSV load was made, not what it loaded: the draft keeps the mapping it chose (so a
        // reload repeats it) and its report names the columns it declared as the ends.
        name.endsWith(".csv") && ["mapping", "tableRows", "endpoints"].includes(key) ? undefined : value,
    );
    session.dispose();
    return state;
}

/**
 * The code a call is refused with.
 * @param call - The call.
 * @returns The code, or null when it was not refused with one.
 */
async function refusal(call: () => Promise<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : null;
    }

    return null;
}

describe("project.open's draft loads a data file as data.import does", () => {
    for (const [name, text] of FILES) {
        it(name, async () => {
            assert.strictEqual(await loaded(name, text, "open"), await loaded(name, text, "import"));
        });
    }

    for (const [name, text] of CSV_FILES) {
        it(name, async () => {
            assert.strictEqual(await loaded(name, text, "open"), await loaded(name, text, "import"));
        });
    }
});

describe("a project file handed to a data import", () => {
    it("is refused with E_PROJECT_FILE_AS_DATA, naming project.open, and the graph is left as it was", async () => {
        const saver = makeSession().session;
        await saver.data.addNodes([{ id: "x" }, { id: "y" }]);
        const { text } = await saver.project.save();
        saver.dispose();

        const { session } = makeSession();
        await session.data.addNodes([{ id: "kept" }]);
        const file = (): File => new File([text], "study.graphty.json");
        assert.strictEqual(
            await refusal(() => session.data.import({ config: { file: file() } })),
            "E_PROJECT_FILE_AS_DATA",
        );
        assert.strictEqual(
            await refusal(() => session.data.prepare({ config: { file: file() } })),
            "E_PROJECT_FILE_AS_DATA",
        );
        assert.strictEqual(
            await refusal(() => session.data.import({ type: "json", config: { data: text } })),
            "E_PROJECT_FILE_AS_DATA",
        );
        try {
            await session.data.import({ config: { file: file() } });
        } catch (error) {
            assert.deepStrictEqual(isGraphtyError(error) ? error.details : null, {
                kind: "graphty-document",
                use: "project.open",
            });
        }
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );

        // The verb it names opens it.
        const report = await session.project.open(file(), { discard: true });
        assert.strictEqual(report.opened, "project");
        assert.strictEqual(session.data.statistics().nodeCount, 2);
        session.dispose();
    });

    it("is refused as a bare member too", async () => {
        const { session } = makeSession();
        const style = JSON.stringify({ kind: "graphty-style", version: 1, layers: [] });
        assert.strictEqual(
            await refusal(() => session.data.import({ type: "json", config: { data: style } })),
            "E_PROJECT_FILE_AS_DATA",
        );
        session.dispose();
    });
});
