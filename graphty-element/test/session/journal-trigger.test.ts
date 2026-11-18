/**
 * @file `JournalEntry.trigger`: the entries the session wrote on its own account -- a batch's held
 * suggestions released, the members of a project open, the commands a load ran -- say why, and a
 * direct call says nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type JournalEntry, type RunChange } from "../../session";
import { blankSession, fixtureSession } from "./history/fixture-session";

describe("JournalEntry.trigger", () => {
    it("marks the suggestion entries a batch releases, and not the runs", async () => {
        const session = await fixtureSession();
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));

        await session.runs.batch([{ algorithm: "degree" }, { algorithm: "betweenness" }]);

        const styles = heard.filter((entry) => entry.kind === "style");
        assert.isNotEmpty(styles, "the held paint was released as style entries");
        assert.isTrue(styles.every((entry) => entry.trigger === "suggestion"));
        const runs = heard.filter((entry) => entry.kind === "run");
        assert.lengthOf(runs, 2);
        assert.isTrue(runs.every((entry) => !("trigger" in entry)));
        session.dispose();
    });

    it("writes no style entry of its own for a single run that paints its suggestions", async () => {
        const session = await fixtureSession();
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));

        await session.runs.start("degree", {}, { as: "deg" });

        assert.deepEqual(
            heard.map((entry) => entry.kind),
            ["run"],
        );
        assert.isFalse("trigger" in (heard[0] ?? {}));
        session.dispose();
    });

    it("leaves a direct style edit without a trigger", async () => {
        const session = await fixtureSession();
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));

        await session.styles.add({
            name: "red",
            selector: { match: "ids", nodes: ["n1"] },
            set: { "node.color": "#f00" },
        });

        assert.isNotEmpty(heard);
        assert.isTrue(heard.every((entry) => !("trigger" in entry)));
        session.dispose();
    });

    it("marks every member entry of a project open", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
        await session.data.addEdges([{ src: "ada", dst: "grace" }]);
        session.notes.add({ text: "pioneer", targets: [{ node: "ada" }] });
        const { text } = await session.project.save();

        const later = createGraphSession();
        const heard: JournalEntry[] = [];
        later.on("journal:appended", ({ entry }) => heard.push(entry));
        await later.project.open(text);

        assert.isNotEmpty(heard, "opening ran commands");
        assert.deepEqual(
            heard.filter((entry) => entry.trigger !== "project").map((entry) => entry.command.op),
            [],
        );

        heard.length = 0;
        later.notes.add({ text: "mine", targets: [{ node: "grace" }] });
        assert.lengthOf(heard, 1);
        assert.isFalse("trigger" in (heard[0] ?? {}), "the reader's own work after it");
        session.dispose();
        later.dispose();
    });

    it("marks every run:changed of a saved run a project open brings back, and not a later run", async () => {
        const session = await fixtureSession();
        await session.runs.start("degree", {}, { as: "deg" });
        const { text } = await session.project.save();

        const later = blankSession();
        const heard: RunChange[] = [];
        later.on("run:changed", (change) => heard.push(change));
        await later.project.open(text);

        assert.isTrue(
            heard.some((change) => change.phase === "end" && change.run.status === "succeeded"),
            "the saved run came back",
        );
        assert.deepEqual(
            heard.filter((change) => change.trigger !== "project").map((change) => change.phase),
            [],
        );

        heard.length = 0;
        await later.runs.start("shortest-path", {}, { as: "mine" });
        assert.isNotEmpty(heard);
        assert.isTrue(
            heard.every((change) => !("trigger" in change)),
            "a run the reader starts after it",
        );
        session.dispose();
        later.dispose();
    });
});

describe("JournalEntry.callerKey", () => {
    it("echoes a load's callerKey on its entries, and a transaction's on its members", async () => {
        const session = createGraphSession();
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));
        const data = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });

        await session.data.import({ type: "json", config: { data } }, { callerKey: "reopen" });
        assert.isNotEmpty(heard, "the load wrote entries");
        assert.isTrue(heard.every((entry) => entry.callerKey === "reopen"));

        heard.length = 0;
        await session.transaction("Name it", (tx) => tx.config.set({ name: "Untitled" }), { callerKey: "setup" });
        assert.deepEqual(
            heard.map((entry) => [entry.command.op, entry.callerKey]),
            [["config.set", "setup"]],
        );

        heard.length = 0;
        await session.config.set({ name: "Mine" });
        await session.data.addNodes([{ id: "c" }]);
        assert.lengthOf(heard, 2);
        assert.isTrue(
            heard.every((entry) => !("callerKey" in entry)),
            "the reader's own work carries none",
        );
        session.dispose();
    });
});

/**
 * Every journal entry a session appends from now on.
 * @param session - The session.
 * @returns The entries, appended to as they arrive.
 */
function entriesOf(session: GraphSession): JournalEntry[] {
    const heard: JournalEntry[] = [];
    session.on("journal:appended", ({ entry }) => heard.push(entry));
    return heard;
}

describe("JournalEntry.trigger load", () => {
    it("marks the label path a graph file's load settles, as well as its import", async () => {
        const session = createGraphSession();
        const heard = entriesOf(session);
        const data = JSON.stringify({ nodes: [{ id: "a", label: "A" }, { id: "b" }], edges: [] });

        await session.data.import({ type: "json", config: { data } });

        assert.includeMembers(
            heard.map((entry) => entry.command.op),
            ["config.set", "data.import"],
            "the load settled its label path beside the import",
        );
        assert.deepEqual(
            heard.filter((entry) => entry.trigger !== "load").map((entry) => entry.command.op),
            [],
        );
        session.dispose();
    });

    it("marks the configuration a TSV draft's load settles", async () => {
        const session = createGraphSession();
        const heard = entriesOf(session);
        const draft = await session.data.prepare({ type: "csv", config: { data: "source\ttarget\na\tb\n" } });

        await draft.load({ directed: true, callerKey: "dropped" });

        assert.include(
            heard.map((entry) => entry.command.op),
            "config.set",
        );
        assert.deepEqual(
            heard.filter((entry) => entry.trigger !== "load" || entry.callerKey !== "dropped").map((e) => e.command.op),
            [],
        );
        session.dispose();
    });

    it("marks a generated sample's load", async () => {
        const session = createGraphSession();
        const heard = entriesOf(session);

        await session.data.generate("cycle", { n: 5 });

        assert.isNotEmpty(heard);
        assert.isTrue(heard.every((entry) => entry.trigger === "load"));
        session.dispose();
    });

    it("stamps replaceSource's entries with load and the caller's key, and publishes no source:loaded", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        const [first] = session.data.sources();
        assert.isDefined(first);
        const heard = entriesOf(session);
        const loaded: unknown[] = [];
        session.on("source:loaded", (event) => loaded.push(event));

        await session.data.replaceSource(
            first.key,
            { type: "csv", config: { data: "source,target\na,b\nb,c\n" } },
            { callerKey: "replaced" },
        );

        assert.isNotEmpty(heard, "the replace wrote entries");
        assert.isTrue(heard.every((entry) => entry.trigger === "load" && entry.callerKey === "replaced"));
        assert.lengthOf(loaded, 0);
        session.dispose();
    });

    it("leaves the reader's own edit after a load unmarked", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        const heard = entriesOf(session);

        await session.config.set({ name: "Mine" });

        assert.lengthOf(heard, 1);
        assert.isFalse("trigger" in (heard[0] ?? {}));
        session.dispose();
    });
});
