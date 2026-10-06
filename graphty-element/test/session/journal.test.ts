/**
 * @file `session.journal` on a session with no view: one entry per command that finished, the
 * run's `journalId`, `journal:appended`, batches, refusals, the cap and gesture coalescing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type JournalEntry as PublishedEntry } from "../../session";
import { isGraphtyError } from "../../src/errors";
import type { JournalEntry } from "../../src/session/journal";
import type { SessionCommand } from "../../src/session/planning";
import { notesHarness } from "./notes/harness";
import { finishAtOnce } from "./runs/harness";

describe("session.journal", () => {
    it("names, from a completed run's journalId, the entry its command wrote", async () => {
        const { session } = notesHarness();
        const run = session.run({ op: "algo.run", algorithm: "degree" });
        await run;

        assert.isNotNull(run.journalId);
        const entry = session.journal.get(run.journalId ?? "");
        assert.isDefined(entry);
        assert.strictEqual(entry.kind, "run");
        assert.strictEqual(entry.runId, run.id);
        assert.strictEqual(entry.command.op, "algo.run");
        assert.match(entry.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        assert.isAtLeast(entry.durationMs, 0);
        assert.containsAllKeys(entry.engine, ["element", "algorithms", "layout"]);
        assert.isTrue(Object.isFrozen(entry));
        assert.strictEqual(session.journal.entries.at(-1), entry);
        session.dispose();
    });

    it("publishes journal:appended once per appended entry, and to subscribers", async () => {
        const { session } = notesHarness();
        const published: JournalEntry[] = [];
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => published.push(entry));
        const stop = session.journal.subscribe((entry) => heard.push(entry));

        const note = session.notes.add({ text: "hub", targets: [{ node: "a" }] });
        session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        await session.run({ op: "algo.run", algorithm: "degree" });
        session.notes.remove(note);
        stop();
        session.notes.add({ text: "after", targets: [{ node: "b" }] });

        assert.deepEqual(
            published.map((entry) => entry.kind),
            ["note", "set", "run", "note", "note"],
        );
        assert.deepEqual(published, session.journal.entries);
        assert.deepEqual(heard, published.slice(0, 4), "unsubscribed before the last");
        session.dispose();
    });

    it("writes nothing for a command that fails", async () => {
        const { session } = notesHarness();
        session.notes.add({ text: "kept", targets: [{ node: "a" }] });
        const before = session.journal.entries;
        let appended = 0;
        session.on("journal:appended", () => appended++);

        const failure = await Promise.resolve(
            session.execute({ op: "set.rename", id: "set_missing", name: "x" } as SessionCommand),
        ).then(
            () => null,
            (error: unknown) => error,
        );

        assert.isTrue(isGraphtyError(failure), "the command was refused");
        assert.strictEqual(session.journal.entries, before);
        assert.strictEqual(appended, 0);
        session.dispose();
    });

    it("writes one entry for each member of a batch", async () => {
        const { session } = notesHarness();
        await session.execute({
            op: "batch",
            steps: [
                { op: "note.add", note: { text: "one", targets: [{ node: "a" }] } },
                { op: "note.add", note: { text: "two", targets: [{ node: "b" }] } },
            ],
        });

        assert.deepEqual(
            session.journal.entries.map((entry) => [entry.kind, entry.command.op]),
            [
                ["note", "note.add"],
                ["note", "note.add"],
            ],
        );
        assert.lengthOf(session.history.steps, 1, "still one undo step");
        session.dispose();
    });

    it("keeps at most cap entries, dropping the oldest, and refuses a cap that is not a positive integer", () => {
        const { session } = notesHarness();
        assert.strictEqual(session.journal.cap, 1000);
        for (const text of ["one", "two", "three"]) {
            session.notes.add({ text, targets: [{ node: "a" }] });
        }

        const [first, second, third] = session.journal.entries;
        session.journal.cap = 2;
        assert.deepEqual(session.journal.entries, [second, third]);
        assert.isUndefined(session.journal.get(first.id));

        session.notes.add({ text: "four", targets: [{ node: "a" }] });
        assert.lengthOf(session.journal.entries, 2);
        assert.strictEqual(session.journal.entries[0], third);

        for (const bad of [0, -1, 1.5, Number.NaN]) {
            try {
                session.journal.cap = bad;
                assert.fail(`cap ${String(bad)} was accepted`);
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_OPTION_RANGE");
            }
        }

        session.journal.clear();
        assert.deepEqual(session.journal.entries, []);
        assert.isUndefined(session.journal.get(third.id));
        session.dispose();
    });

    it("merges consecutive commands of one gesture into one entry, newest first", async () => {
        const { session } = notesHarness();
        await session.visibility.set({ kind: "degree", min: 1 });
        await session.visibility.set({ kind: "degree", min: 2 });

        assert.lengthOf(session.journal.entries, 1, "one slider drag");
        const [drag] = session.journal.entries;
        assert.strictEqual(drag.kind, "filter");
        assert.isString(drag.coalesceKey);
        assert.deepEqual(drag.command, { op: "visibility.set", filter: { kind: "degree", min: 2 } });

        await session.visibility.set({ kind: "range", attribute: "data.weight", min: 0 });
        assert.lengthOf(session.journal.entries, 2, "another filter is another entry");
        session.dispose();
    });

    it("files a kept set's commands under the kind set", () => {
        const { session } = notesHarness();
        const id = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        session.sets.rename(id, "Centre");

        assert.deepEqual(
            session.journal.entries.map((entry) => [entry.kind, entry.command.op]),
            [
                ["set", "set.create"],
                ["set", "set.rename"],
            ],
        );
        session.dispose();
    });

    it("runs the journal guide's quick start (docs/guide/journal.md)", async () => {
        // The guide's element session carries the element's algorithm executor; a standalone one is
        // handed one.
        const session = createGraphSession({ runs: { execute: finishAtOnce } });
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);

        // Hear each entry as it is written
        const heard: PublishedEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));

        // A run names the entry its command wrote
        const run = session.run({ op: "algo.run", algorithm: "degree" });
        await run;
        const entry = session.journal.get(run.journalId ?? "");
        assert.isDefined(entry);
        assert.strictEqual(entry.kind, "run");
        assert.strictEqual(entry.runId, run.id);

        // Everything so far, oldest first
        const ops = session.journal.entries.map((each) => each.command.op);
        assert.deepEqual(ops, ["data.apply", "algo.run"]);
        assert.deepEqual(heard, session.journal.entries.slice(1), "heard from when it subscribed");
        session.dispose();
    });
});
