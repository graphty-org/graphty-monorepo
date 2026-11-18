/**
 * @file `project.describe` and `project.inspect` (the `save-files-v2` experiment): the facts a
 * save or an open dialog shows before anything is written or applied, the per-run rerun choice,
 * and a section file's name.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, DOCUMENT_SECTIONS, projectFileName } from "../../../session";
import { finishAtOnce } from "../runs/harness";

const SPEC = new URL("../../../spec/", import.meta.url);
const readText = (path: string): string => readFileSync(new URL(path, SPEC), "utf8");
const ON = { features: ["save-files-v2"] };
const EXAMPLE = "examples/card-fraud.graphty.json";

describe("project.describe", () => {
    it("lists every section with its counts and every source with whether it can be referenced", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "csv",
            config: { data: "source,target\nAva,Ben\nBen,Cara\n" },
            name: "friends.csv",
        });
        await session.data.addNodes([{ id: "Dee" }]);
        const { dirty } = session.project;
        const facts = await session.project.describe();
        assert.strictEqual(session.project.dirty, dirty, "describe changes nothing");
        assert.deepEqual(
            facts.sections.map((section) => section.section),
            [...DOCUMENT_SECTIONS],
        );
        const data = facts.sections.find((section) => section.section === "data");
        assert.strictEqual(data?.counts.nodes, 4);
        assert.strictEqual(data?.counts.edges, 2);
        assert.isTrue(data?.saved);
        assert.isTrue(data?.required);
        const results = facts.sections.find((section) => section.section === "results");
        assert.isFalse(results?.saved, "results are off by default");
        assert.isFalse(results?.required);

        // A file read with no path cannot be referenced: the refusal a save would report.
        assert.lengthOf(facts.sources, 2);
        const [reader, source] = facts.sources;
        assert.strictEqual(reader.kind, "reader");
        assert.isFalse(reader.referable);
        assert.strictEqual(reader.operations, 1);
        assert.strictEqual(source.key, session.data.sources()[0].key);
        assert.strictEqual(source.kind, "file");
        assert.strictEqual(source.storage, "embedded");
        assert.isFalse(source.referable);
        assert.deepEqual(source.refused, { code: "W_SOURCE_NO_PATH", params: { source: source.id } });
        const saved = await session.project.save({ format: 2, embed: { [source.id]: "referenced" } });
        assert.deepInclude(saved.report.leftOut, source.refused);

        session.dispose();
    });

    it("reports a held section and a section's name", async () => {
        const session = createGraphSession(ON);
        const example = JSON.parse(readText(EXAMPLE)) as { sections: Record<string, Record<string, unknown>> };
        example.sections.style.version = 99;
        await session.project.open(JSON.stringify(example), { rerun: false });
        const facts = await session.project.describe();
        const style = facts.sections.find((section) => section.section === "style");
        assert.deepEqual(style?.held, { version: 99, reads: 2, reason: "version" });
        const recipe = facts.sections.find((section) => section.section === "recipe");
        assert.strictEqual(recipe?.name, "Card-testing sweep");
        assert.strictEqual(recipe?.counts.commands, 5);
        session.dispose();
    });

    it("is refused without the experiment", async () => {
        const session = createGraphSession();
        const error = await session.project.describe().catch((thrown: unknown) => thrown);
        assert.strictEqual((error as { code?: string }).code, "E_FEATURE_OFF");
        session.dispose();
    });
});

describe("project.inspect", () => {
    it("reads a full file's sections, runs and sources without opening it", async () => {
        const session = createGraphSession(ON);
        const facts = await session.project.inspect(readText(EXAMPLE));
        assert.isDefined(facts);
        assert.strictEqual(facts?.form, "full");
        assert.deepEqual(
            facts?.sections.map((section) => section.section),
            [...DOCUMENT_SECTIONS],
        );
        const view = facts?.sections.find((section) => section.section === "view");
        assert.deepEqual(view?.binds, { file: true, open: false });
        assert.deepEqual(
            facts?.runs.map((run) => [run.id, run.replayable, run.restorable]),
            [
                ["card_testing__pagerank", false, true],
                ["card_testing__communities", false, true],
                ["route", true, true],
                ["layout", true, true],
            ],
        );
        assert.deepEqual(
            facts?.sources.map((source) => source.storage),
            ["embedded", "embedded"],
        );
        assert.lengthOf(session.data.nodes(), 0, "nothing was opened");
        session.dispose();
    });

    it("tells a held section and a section file, and passes over a data file", async () => {
        const session = createGraphSession(ON);
        const example = JSON.parse(readText(EXAMPLE)) as { sections: Record<string, Record<string, unknown>> };
        example.sections.style.version = 3;
        const held = await session.project.inspect(JSON.stringify(example));
        assert.deepEqual(held?.sections.find((section) => section.section === "style")?.held, {
            version: 3,
            reads: 2,
            reason: "version",
        });
        const style = await session.project.inspect(readText("examples/card-fraud.graphty-style.json"));
        assert.strictEqual(style?.form, "section");
        assert.strictEqual(style?.sections[0].name, "Fraud review style");
        assert.isUndefined(await session.project.inspect("source,target\na,b\n"));
        session.dispose();
    });
});

describe("project.open runs", () => {
    it("takes a per-run choice over rerun", async () => {
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.addEdges([{ source: "P", target: "Q" }]);
        await session.runs.start("bfs", { source: "P" });
        const { text } = await session.project.save({ format: 2, results: true, markSaved: false });
        const [run] = (await session.project.inspect(text))?.runs ?? [];
        assert.isTrue(run.replayable && run.restorable);
        const computed = async (options: { rerun: boolean; runs: Record<string, boolean> }): Promise<number> => {
            let executed = 0;
            const opened = createGraphSession({
                ...ON,
                runs: {
                    execute: (context) => {
                        executed += 1;
                        return finishAtOnce(context);
                    },
                },
            });
            await opened.project.open(text, options);
            opened.dispose();
            return executed;
        };
        assert.strictEqual(await computed({ rerun: true, runs: { [run.id]: false } }), 0, "restored");
        assert.strictEqual(await computed({ rerun: false, runs: { [run.id]: true } }), 1, "rerun");
        session.dispose();
    });
});

describe("a layer left out of style", () => {
    it("names the layer, and says when the same save carries it in view", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const { id: layer } = await session.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#ff0000" },
        });
        const leftOut = async (sections: ("style" | "view")[]): Promise<unknown[]> =>
            (await session.project.save({ format: 2, sections, markSaved: false })).report.leftOut
                .filter((fact) => fact.code === "W_ELEMENT_NAMING_LEFT_OUT")
                .map(({ params }) => ({ layer: params.layer, movedTo: params.movedTo }));
        assert.deepEqual(await leftOut(["style"]), [{ layer, movedTo: undefined }]);
        assert.deepEqual(await leftOut(["style", "view"]), [{ layer, movedTo: "view" }]);
        session.dispose();
    });
});

describe("projectFileName", () => {
    it("names a section file by its section", () => {
        assert.strictEqual(projectFileName("Fraud", { section: "style" }), "Fraud.graphty-style.json");
        assert.strictEqual(projectFileName(null, { section: "notes" }), "project.graphty-notes.json");
        assert.strictEqual(projectFileName("Fraud"), "Fraud.graphty.json");
    });
});
