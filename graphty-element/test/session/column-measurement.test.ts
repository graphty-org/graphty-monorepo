/**
 * @file What a column measures (`measurement`, `data.declare`), coloring and sizing by a plain
 * column with `styles.encode({ column })`, `styles.proposeEncoding()`, and the legend's "other"
 * row.
 */

import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import type { AttributeDescriptor } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";
import { fieldMeasurement } from "../../src/session/results/types";
import type { GraphSession } from "../../src/session/types";

const KINDS = ["a", "b", "c", "d"];

/**
 * A session over 40 nodes: a department code, a score, a kind, a flag and a risk level.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    const graph = createGraphSession();
    await graph.data.addNodes(
        Array.from({ length: 40 }, (_, index) => ({
            id: `n${String(index)}`,
            department: (index % 5) + 1,
            score: index * 1.5,
            kind: KINDS[index % 4],
            flag: index % 2 === 0,
            risk: ["low", "medium", "high"][index % 3],
        })),
    );
    return graph;
}

/**
 * One node column's descriptor.
 * @param graph - The session.
 * @param name - The column's name.
 * @returns The descriptor.
 */
function column(graph: GraphSession, name: string): AttributeDescriptor {
    const found = graph.data.attributes().find((each) => each.kind === "node" && each.name === name);
    if (found === undefined) {
        throw new Error(`no node column ${name}`);
    }

    return found;
}

/**
 * Await a call that should fail, and return the error.
 * @param call - The call.
 * @returns The error's code and details.
 */
async function failure(call: () => unknown): Promise<{ code: string; details: Record<string, unknown> }> {
    try {
        await call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error));
        return error as { code: string; details: Record<string, unknown> };
    }

    throw new Error("expected a refusal");
}

describe("what a column measures", () => {
    it("lists no column before data is loaded", () => {
        const graph = createGraphSession();
        assert.deepEqual(graph.data.attributes(), []);
        graph.dispose();
    });

    it("is inferred from the value type alone", async () => {
        const graph = await session();

        for (const [name, measurement] of [
            ["department", "quantitative"],
            ["score", "quantitative"],
            ["kind", "categorical"],
            ["flag", "categorical"],
        ]) {
            assert.strictEqual(column(graph, name).measurement, measurement, name);
            assert.strictEqual(column(graph, name).measurementSource, "inferred", name);
        }

        graph.dispose();
    });

    it("is declared as one undoable step in the attributes slice, and undo takes it back", async () => {
        const graph = await session();
        const slices: string[][] = [];
        graph.on("project:changed", (change) => slices.push([...change.slices]));

        await graph.data.declare(column(graph, "department"), { measurement: "categorical" });
        assert.strictEqual(column(graph, "department").measurement, "categorical");
        assert.strictEqual(column(graph, "department").measurementSource, "declared");
        assert.deepEqual(slices.at(-1), ["attributes"]);

        await graph.undo();
        assert.strictEqual(column(graph, "department").measurement, "quantitative");
        graph.dispose();
    });

    it("refuses an unknown column with candidates and a malformed declaration", async () => {
        const graph = await session();

        const unknown = await failure(() =>
            graph.data.declare({ kind: "node", name: "departmnt" }, { measurement: "categorical" }),
        );
        assert.strictEqual(unknown.code, "E_UNKNOWN_ATTRIBUTE");
        assert.include(unknown.details.candidates as string[], "department");

        const unordered = await failure(() =>
            graph.data.declare(column(graph, "risk"), { measurement: "ordinal" } as never),
        );
        assert.strictEqual(unordered.code, "E_BAD_COMMAND");
        graph.dispose();
    });

    it("sees an attribute written after the first read", async () => {
        const graph = await session();
        assert.strictEqual(column(graph, "kind").uniqueCount, 4);

        await graph.data.updateNodes([{ id: "n0", values: { kind: "z" } }]);
        assert.strictEqual(column(graph, "kind").uniqueCount, 5);
        graph.dispose();
    });
});

describe("encoding a column", () => {
    it("draws declared codes one color per group, decided once and stored in the layer", async () => {
        const graph = await session();
        const department = column(graph, "department");

        await graph.data.declare(department, { measurement: "categorical" });
        const layer = await graph.styles.encode({ column: department, channel: "node.color" });
        const binding = layer.encode?.["node.color"];
        assert.deepInclude(binding, { by: "data.department", scale: "ordinal", overflow: "other" });
        assert.isString((binding as { palette?: string }).palette);

        const [block] = graph.styles.legend();
        assert.strictEqual(block.kind, "categorical");
        assert.lengthOf(block.swatches, 5);

        // A later declaration never repaints the saved layer.
        await graph.data.declare(department, { measurement: "quantitative" });
        assert.deepEqual(graph.styles.get(layer.id)?.encode?.["node.color"], binding);
        graph.dispose();
    });

    it("gives an amount a ramp, and a size the element's 1 to 3 range", async () => {
        const graph = await session();
        const score = column(graph, "score");

        assert.deepInclude(graph.styles.proposeEncoding({ column: score, channel: "node.color" }), {
            ok: true,
        });
        const sized = await graph.styles.encode({ column: score, channel: "node.size" });
        assert.deepInclude(sized.encode?.["node.size"], { scale: "linear", range: [1, 3] });
        assert.deepEqual(sized.selector, { match: "has", path: "data.score" });
        graph.dispose();
    });

    it("follows an ordinal column's declared order in its colors and its legend", async () => {
        const graph = await session();
        const risk = column(graph, "risk");

        await graph.data.declare(risk, { measurement: "ordinal", order: ["low", "medium", "high"] });
        const layer = await graph.styles.encode({ column: risk, channel: "node.color" });
        const map = (layer.encode?.["node.color"] as { map?: Record<string, string> }).map ?? {};
        assert.deepEqual(Object.keys(map), ["low", "medium", "high"]);

        const [block] = graph.styles.legend();
        assert.deepEqual(
            block.swatches.map((swatch) => swatch.value),
            ["low", "medium", "high"],
        );
        graph.dispose();
    });

    it("refuses as a coded fact, never a sentence, and encode rejects with the same code", async () => {
        const graph = await session();
        const kind = column(graph, "kind");

        const proposal = graph.styles.proposeEncoding({ column: kind, channel: "node.size" });
        assert.deepEqual(proposal, {
            ok: false,
            refusal: {
                code: "E_UNSUPPORTED",
                params: { kind: "node", name: "kind", channel: "node.size", measurement: "categorical" },
            },
        });
        assert.strictEqual(
            (await failure(() => graph.styles.encode({ column: kind, channel: "node.size" }))).code,
            "E_UNSUPPORTED",
        );

        await graph.data.declare(kind, { measurement: "time" });
        const time = graph.styles.proposeEncoding({ column: kind, channel: "node.color" });
        assert.strictEqual(time.ok ? null : time.refusal.code, "E_UNSUPPORTED");

        // A scale the caller names skips every refusal and is written as asked.
        const named = graph.styles.proposeEncoding({ column: kind, channel: "node.size", scale: "linear" });
        assert.deepInclude(named.ok ? named.binding : {}, { by: "data.kind", scale: "linear" });
        graph.dispose();
    });

    it("refuses a column with more distinct values than the element counts", async () => {
        const graph = createGraphSession();
        await graph.data.addNodes(
            Array.from({ length: 300 }, (_, index) => ({ id: index, name: `n${String(index)}` })),
        );

        const proposal = graph.styles.proposeEncoding({
            column: { kind: "node", name: "name" },
            channel: "node.color",
        });
        assert.deepInclude(proposal, { ok: false });
        assert.strictEqual(proposal.ok ? null : proposal.refusal.code, "E_CAP_EXCEEDED");
        graph.dispose();
    });

    it("tells a node column from an edge column of the same name, and reads names literally", async () => {
        const graph = createGraphSession();
        await graph.data.addNodes([
            { id: "a", "shared chapters": "x" },
            { id: "b", "shared chapters": "y" },
        ]);
        await graph.data.addEdges([{ source: "a", target: "b", "shared chapters": 4 }]);

        const node = graph.styles.proposeEncoding({
            column: { kind: "node", name: "shared chapters" },
            channel: "node.color",
        });
        const edge = graph.styles.proposeEncoding({
            column: { kind: "edge", name: "shared chapters" },
            channel: "edge.width",
        });
        assert.deepInclude(node.ok ? node.binding : {}, { by: "data.shared chapters", scale: "ordinal" });
        assert.deepInclude(edge.ok ? edge.binding : {}, { scale: "linear", range: [1, 3] });
        graph.dispose();
    });

    it("hands back a binding a hand-written layer can store as is", async () => {
        const graph = await session();
        const proposal = graph.styles.proposeEncoding({ column: column(graph, "kind"), channel: "node.color" });
        assert.isTrue(proposal.ok);
        if (proposal.ok) {
            await graph.styles.add({
                name: "kinds",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.color": proposal.binding },
            });
        }

        assert.lengthOf(graph.styles.legend()[0].swatches, 4);
        graph.dispose();
    });
});

describe("the legend's other row", () => {
    it("is marked, counted, and kept when the rows above it are capped", async () => {
        const graph = createGraphSession();
        // Fifteen groups of two and three of one: the three fold into "other" at a threshold of 2.
        const groups = [
            ...Array.from({ length: 15 }, (_, group) => [`g${String(group)}`, `g${String(group)}`]).flat(),
            "rare-1",
            "rare-2",
            "rare-3",
        ];
        await graph.data.addNodes(groups.map((group, index) => ({ id: index, group })));
        await graph.styles.add({
            name: "groups",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": {
                    by: "data.group",
                    scale: "ordinal",
                    palette: "ylorbr",
                    other: { threshold: 2, value: "#888888" },
                },
            },
        });

        const [block] = graph.styles.legend();
        const other = block.swatches.at(-1);
        assert.lengthOf(block.swatches, 13);
        assert.strictEqual(other?.role, "other");
        assert.strictEqual(other?.count, 3);
        assert.sameMembers(other?.value as string[], ["rare-1", "rare-2", "rare-3"]);
        assert.deepEqual(block.overflow, { hidden: 3 });
        graph.dispose();
    });
});

describe("a run's fields", () => {
    it("say what they measure: a partition's group is categorical, its sizes quantitative", () => {
        const louvain = algorithmByKey("louvain");
        const group = louvain?.fields.find((field) => field.name === "group");
        assert.strictEqual(group?.measurement, "categorical");

        const size = {
            name: "groupSize",
            plainName: "",
            technicalName: "",
            kind: "node",
            type: "integer",
            path: "",
        } as const;
        assert.strictEqual(fieldMeasurement({ ...group!, measurement: undefined }, "community"), "categorical");
        assert.strictEqual(fieldMeasurement(size, "community"), "quantitative");
        assert.strictEqual(fieldMeasurement({ ...size, measurement: "ordinal" }, "node-metric"), "ordinal");
    });
});
