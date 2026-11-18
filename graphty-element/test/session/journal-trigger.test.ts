/**
 * @file `JournalEntry.trigger`: the entries the session wrote on its own account -- a batch's held
 * suggestions released, the members of a project open -- say why, and a direct call says nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type JournalEntry } from "../../session";
import { fixtureSession } from "./history/fixture-session";

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
});
