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

describe("project.describe with the save's options", () => {
    it("answers for the paths a host supplies, and says whether the save is the project", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "a.csv" });
        const [source] = (await session.project.describe()).sources;
        assert.isFalse(source.referable, "a file read with no path");
        const given = (await session.project.describe({ paths: { [source.id]: "a.csv" } })).sources[0];
        assert.isTrue(given.referable, "the host gives its path");
        assert.isUndefined(given.refused);
        const saved = await session.project.save({
            format: 2,
            markSaved: false,
            embed: { [source.id]: "referenced" },
            paths: { [source.id]: "a.csv" },
        });
        assert.notDeepInclude(saved.report.leftOut, { code: "W_SOURCE_NO_PATH", params: { source: source.id } });

        assert.isTrue((await session.project.describe()).project, "the default save is the project");
        const allButResults = DOCUMENT_SECTIONS.filter((section) => section !== "results");
        assert.isTrue((await session.project.describe({ sections: allButResults })).project);
        assert.isFalse((await session.project.describe({ sections: ["style"] })).project);
        assert.isFalse((await session.project.describe({ sections: ["style"], form: "section" })).project);
        session.dispose();
    });
});

describe("project.inspect binding", () => {
    it("says how an open with the chosen sections binds each bound section", async () => {
        const text = readText(EXAMPLE);
        const bindingOfView = async (
            session: ReturnType<typeof createGraphSession>,
            file: string,
            sections?: ("data" | "view")[],
            dataMode?: "replace" | "add",
        ): Promise<string | undefined> =>
            (
                await session.project.inspect(file, {
                    ...(sections === undefined ? {} : { sections }),
                    ...(dataMode === undefined ? {} : { dataMode }),
                })
            )?.sections.find((section) => section.section === "view")?.binding;

        const empty = createGraphSession(ON);
        assert.strictEqual(await bindingOfView(empty, text), "loads", "with its own data");
        assert.strictEqual(await bindingOfView(empty, text, ["view"]), "other-data", "without its data");
        assert.strictEqual(await bindingOfView(empty, text, ["data", "view"], "add"), "other-data", "data added");
        assert.isUndefined(await bindingOfView(empty, text, ["data"]), "not chosen");
        const example = JSON.parse(text) as { sections: Record<string, Record<string, unknown>> };
        example.sections.data.version = 99;
        assert.strictEqual(await bindingOfView(empty, JSON.stringify(example)), "held", "its data is held");

        const opened = createGraphSession(ON);
        await opened.project.open(text, { rerun: false });
        assert.strictEqual(await bindingOfView(opened, text, ["view"]), "loads", "on the same data");
        empty.dispose();
        opened.dispose();
    });

    it("never takes a name of Object's prototype for a saved run", async () => {
        const session = createGraphSession(ON);
        const example = JSON.parse(readText(EXAMPLE)) as { sections: { view: { runs: { id: string }[] } } };
        example.sections.view.runs[0].id = "toString";
        const run = (await session.project.inspect(JSON.stringify(example)))?.runs.find(
            (each) => each.id === "toString",
        );
        assert.isFalse(run?.restorable);
        session.dispose();
    });

    it("gives a section file's own facts and what it needs from the open data", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "a", mcc: "5947" }]);
        const [style] =
            (await session.project.inspect(readText("examples/card-fraud.graphty-style.json")))?.sections ?? [];
        assert.deepEqual(style.about, {
            description: "Highlights near-limit gift card payments and colors accounts by PageRank.",
            created: "2026-09-02T16:20:00.000Z",
            modified: "2026-11-12T21:05:00.000Z",
            authors: [{ name: "Fraud analytics team", uri: "https://example-bank.test/fraud" }],
            license: "CC-BY-4.0",
            from: "https://example-bank.test/kits/fraud-team-kit.graphty.json",
        });
        assert.deepEqual(style.needs, [
            {
                kind: "column",
                name: "amount",
                table: "edge",
                schema: { type: "number", measurement: "quantitative", unit: "USD" },
                found: false,
            },
            {
                kind: "column",
                name: "mcc",
                table: "node",
                schema: { type: "string", measurement: "categorical" },
                found: true,
            },
            { kind: "type", name: "merchant" },
            { kind: "result", name: "pagerank", found: false },
            { kind: "result", name: "communities", found: false },
        ]);
        session.dispose();
    });

    it("maps a style file's columns to the open data's: inspect finds them, and open reads them", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c", category: "5947" }]);
        await session.data.addEdges([
            { source: "a", target: "b", amountUsd: 900 },
            { source: "b", target: "c", amountUsd: 20 },
        ]);
        const text = readText("examples/card-fraud.graphty-style.json");
        const columns = { edge: { amount: "amountUsd" }, node: { mcc: "category" } };
        const [style] = (await session.project.inspect(text, { columns }))?.sections ?? [];
        assert.deepEqual(
            style.needs.filter((need) => need.kind === "column").map((need) => [need.name, need.found]),
            [
                ["amount", true],
                ["mcc", true],
            ],
        );

        await session.project.open(text, { columns });
        const big = session.styles.list().find((layer) => layer.name === "Big payments");
        assert.deepEqual(big?.selector, { match: "expression", where: "data.amountUsd > `500`" });
        session.dispose();
    });

    it("refuses a column mapped to no column, and reads one mapped to a column the data lacks as missing", async () => {
        const session = createGraphSession(ON);
        await session.data.addEdges([{ source: "a", target: "b", amountUsd: 900 }]);
        const text = readText("examples/card-fraud.graphty-style.json");
        for (const columns of [{ edge: { amount: "" } }, { edges: {} }] as never[]) {
            for (const call of [session.project.inspect(text, { columns }), session.project.open(text, { columns })]) {
                const error = await call.then(
                    () => undefined,
                    (reason: unknown) => reason as { code: string; details: { option: string } },
                );
                assert.strictEqual(error?.code, "E_OPTION_RANGE");
                assert.strictEqual(error?.details.option, "columns");
            }
        }

        const [style] =
            (await session.project.inspect(text, { columns: { edge: { amount: "nope" } } }))?.sections ?? [];
        assert.isFalse(style.needs.find((need) => need.name === "amount")?.found);
        session.dispose();
    });
});

describe("a version 2 project opened over another", () => {
    it("leaves nothing of the project it replaced", async () => {
        const session = createGraphSession(ON);
        const text = readText(EXAMPLE);
        await session.project.open(text, { rerun: false });
        const layers = session.styles.list().map((layer) => layer.name);
        const notes = session.notes.list().length;
        await session.project.open(text, { rerun: false, discard: true });
        assert.deepEqual(
            session.styles.list().map((layer) => layer.name),
            layers,
        );
        assert.strictEqual(session.notes.list().length, notes);
        session.dispose();
    });
});

describe("a layer left out of a save after an open", () => {
    it("is reported when the rest of the style is unchanged, and never moved to a held view", async () => {
        const report = async (heldView: boolean, sections: ("style" | "view")[]): Promise<unknown[]> => {
            const session = createGraphSession(ON);
            const example = JSON.parse(readText(EXAMPLE)) as { sections: Record<string, Record<string, unknown>> };
            if (heldView) {
                example.sections.view.version = 99;
            }
            await session.project.open(JSON.stringify(example), { rerun: false });
            const { id } = await session.styles.add({
                name: "Picked",
                target: "node",
                selector: { match: "ids", nodes: [session.data.nodes()[0].id] },
                set: { "node.color": "#ff0000" },
            });
            const { report: saved } = await session.project.save({ format: 2, sections, markSaved: false });
            session.dispose();
            return saved.leftOut
                .filter((fact) => fact.code === "W_ELEMENT_NAMING_LEFT_OUT" && fact.params.layer === id)
                .map(({ params }) => params.movedTo ?? null);
        };
        assert.deepEqual(await report(false, ["style"]), [null]);
        assert.deepEqual(await report(false, ["style", "view"]), ["view"]);
        assert.deepEqual(await report(true, ["style", "view"]), [null], "a held view is written as read");
    });
});
