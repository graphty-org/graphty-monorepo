/**
 * @file The colors and sizes a file gives its elements, saved in a version 2 file: they are
 * ordinary columns of the source's data, read by layers as `data.<column>`, and the reopened
 * session draws what the loaded one drew.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import { elementRefsOf } from "../../../src/session/document2/codecs/dataRefs";
import type { DocumentProblem, JsonObject, WriteContext } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2", "file-styles"] };

/** Six nodes in a ring, each with its own color and size. */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><nodes>
${["200,30,30", "30,200,30", "30,30,200", "200,200,30", "30,200,200", "200,30,200"]
    .map((rgb, i) => {
        const [r, g, b] = rgb.split(",");
        return `<node id="n${String(i)}" label="n${String(i)}"><viz:color r="${r}" g="${g}" b="${b}"/><viz:size value="${String(i + 2)}"/></node>`;
    })
    .join("\n")}
</nodes><edges>
${Array.from({ length: 6 }, (_unused, i) => `<edge source="n${String(i)}" target="n${String((i + 1) % 6)}"/>`).join("\n")}
</edges></graph></gexf>`;

/**
 * What every node is drawn with, color and size.
 * @param session - The session.
 * @returns The values, by node.
 */
function drawn(session: GraphSession): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const node of session.data.nodes()) {
        const { merged } = session.styles.explain({ node: node.id });
        const color = merged["node.color"] as { hex?: string } | undefined;
        out[String(node.id)] = { color: color?.hex, size: merged["node.size"] };
    }

    return out;
}

describe("a file's looks in a version 2 save file", () => {
    it("saves them as ordinary columns read by data paths, and reopens drawing the same", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "gexf", config: { data: GEXF } }, { styles: "file" });
        const before = drawn(session) as Record<string, { color?: string; size?: unknown }>;
        // The file's own values are drawn: each node has its own color and size.
        assert.isDefined(before.n0.color);
        assert.notStrictEqual(before.n0.color, before.n1.color);
        assert.notStrictEqual(before.n0.size, before.n1.size);

        const saved = await session.project.save({ format: 2 });
        assert.notInclude(saved.text, "graphty.style");
        assert.notInclude(saved.text, "fileStyle");
        assert.notDeepInclude(
            saved.report.leftOut.map((problem) => problem.params),
            { kind: "graphty-session", field: "fileStyles" },
        );

        // The colors are a column of the source's copy and of the graph, and a layer reads it as data.
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const { data, style } = file.sections;
        const source = (data.sources as JsonObject[]).find((each) => each.kind !== "reader") as JsonObject;
        const copied = Object.keys((source.copy as { nodes: JsonObject }).nodes).filter((name) => name !== "id");
        assert.isNotEmpty(copied);
        const graphNode = (data.graph as { nodes: JsonObject[] }).nodes[0];
        for (const column of copied) {
            assert.property(graphNode, column);
        }
        const reads = JSON.stringify(style.layers);
        assert.isTrue(
            copied.some((column) => reads.includes(`data.${column}`)),
            `a layer reads one of ${copied.join(", ")}`,
        );
        for (const layer of style.layers as JsonObject[]) {
            assert.notProperty(layer, "source", `layer ${String(layer.name)} writes no source`);
        }

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });

    it("saves a filter and a set rule on a look value as reading its column, and reopens matching the same", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "gexf", config: { data: GEXF } }, { styles: "file" });
        // The size each node is drawn at, from the file's sizes 2 to 7: the larger nodes only.
        const where = "graphty.style.gexf.node.el.by.copy.width > `1`";
        await session.visibility.set({ kind: "expression", where });
        session.sets.create({ kind: "rule", where, reading: "induced" }, { name: "Large" });
        const members = async (target: GraphSession): Promise<string[]> => {
            const id = target.sets.list().find((set) => set.name === "Large")?.id;
            const held: string[] = [];
            for (const node of target.data.nodes()) {
                if (id !== undefined && (await target.sets.containing({ node: node.id })).sets.includes(id)) {
                    held.push(String(node.id));
                }
            }

            return held.sort();
        };
        const large = await members(session);
        assert.includeMembers(large, ["n5"]);
        assert.notInclude(large, "n0");

        const saved = await session.project.save({ format: 2 });
        assert.notInclude(saved.text, "graphty.style");
        const recipe = await session.project.save({ format: 2, sections: ["recipe"] });
        assert.notInclude(recipe.text, "graphty.style");

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(await members(reopened), large);
        session.dispose();
        reopened.dispose();
    });

    it("names a second load's values beside the first's, so each load's layers keep painting its own nodes", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "gexf", config: { data: GEXF } }, { styles: "file" });
        const second = GEXF.replaceAll('id="n', 'id="m')
            .replaceAll('source="n', 'source="m')
            .replaceAll('target="n', 'target="m')
            .replaceAll('"200"', '"90"');
        await session.data.import({ type: "gexf", config: { data: second } }, { styles: "file", mode: "merge" });
        const before = drawn(session) as Record<string, { color?: string }>;
        assert.notStrictEqual(before.n0.color, before.m0.color, "the two files give different colors");

        const saved = await session.project.save({ format: 2 });
        assert.notInclude(saved.text, "graphty.style");
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const sources = (file.sections.data.sources as JsonObject[]).filter((each) => each.kind !== "reader");
        assert.lengthOf(sources, 2);
        // A layer reading a name both loads held would paint the other load's nodes too.
        const other = Object.keys((sources[1].copy as { nodes: JsonObject }).nodes);
        assert.isTrue(other.some((name) => name.endsWith(` (${String(sources[1].id)})`)));

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });

    it("names a look column beside a different value the same node already holds", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "gexf", config: { data: GEXF } }, { styles: "file" });
        await session.data.updateNodes([{ id: "n0", values: { "copy.fill": "mine" } }]);
        const before = drawn(session);

        const saved = await session.project.save({ format: 2 });
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const source = (file.sections.data.sources as JsonObject[]).find(
            (each) => each.kind !== "reader",
        ) as JsonObject;
        const { nodes } = source.copy as { nodes: JsonObject };
        const beside = `copy.fill (${String(source.id)})`;
        assert.property(nodes, "copy.fill");
        assert.property(nodes, beside);
        assert.include(JSON.stringify(file.sections.style), beside);

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(drawn(reopened), before);
        assert.strictEqual(reopened.data.nodes().find((node) => node.id === "n0")?.["copy.fill"], "mine");
        session.dispose();
        reopened.dispose();
    });

    it("names the columns the layers read, with their types, in the style's dependencies", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "gexf", config: { data: GEXF } }, { styles: "file" });
        const saved = await session.project.save({ format: 2 });
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const source = (file.sections.data.sources as JsonObject[]).find(
            (each) => each.kind !== "reader",
        ) as JsonObject;
        // The look columns: those the session holds no attribute of.
        const attributes = new Set(session.data.attributes().map((each) => each.name));
        const copied = Object.keys((source.copy as { nodes: JsonObject }).nodes).filter(
            (name) => name !== "id" && !attributes.has(name),
        );
        const { columns } = file.sections.style.dependencies as {
            columns: { kind: string; name: string; schema: JsonObject }[];
        };
        const nodeColumns = columns.filter((each) => each.kind === "node");
        // Every look column is read by a layer here, whole names and all (`el.load`, `copy.fill`).
        assert.sameMembers(
            nodeColumns.map((each) => each.name),
            copied,
        );
        for (const column of nodeColumns) {
            assert.isNotEmpty(Object.keys(column.schema), `${column.name} carries its type`);
        }

        session.dispose();
    });
});

describe("a file's looks in a source saved as a reference", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reports each look column it leaves out", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const session = createGraphSession(ON);
        await session.data.import(
            { type: "gexf", config: { url: "https://example.org/ring.gexf" } },
            { styles: "file" },
        );
        const problems: DocumentProblem[] = [];
        const context = (embed: WriteContext["embed"]): WriteContext => ({
            session,
            problems,
            refs: () => elementRefsOf(session),
            dataId: () => "data-1",
            sections: new Set(["data"]),
            embed,
            isDerived: () => false,
            bindsTo: () => Promise.resolve(undefined),
        });
        const { body } = await dataCodec.write(context({}));
        const source = (body.sources as JsonObject[]).find((each) => each.kind === "url") as JsonObject;
        const looks = Object.keys((source.copy as { nodes: JsonObject }).nodes).filter(
            (name) => !session.data.attributes().some((each) => each.name === name),
        );
        assert.isNotEmpty(looks);
        assert.deepEqual(problems, []);

        await dataCodec.write(context({ [String(source.id)]: "referenced" }));
        for (const name of looks) {
            assert.deepInclude(problems, {
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", pointer: `/sources/${String(source.id)}`, field: `node:${name}` },
            });
        }

        session.dispose();
    });
});
