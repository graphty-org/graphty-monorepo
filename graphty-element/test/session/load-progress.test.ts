/**
 * @file A load's `progress:changed`: its first change comes before anything is read, it says what
 * it reads, and how it ended -- with the refusal's code and details when it failed (#902). And a
 * prepare's, which reads the same way under `task: "prepare"` (#910).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type ProgressChange } from "../../src/session";

const DATA = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });

/**
 * Every progress change a session publishes from here on.
 * @param session - The session.
 * @returns The changes, as they arrive.
 */
function watch(session: GraphSession): ProgressChange[] {
    const seen: ProgressChange[] = [];
    session.on("progress:changed", (change) => {
        seen.push(change);
    });
    return seen;
}

describe("a load's progress", () => {
    it("starts before anything is read, names its source, and ends saying it succeeded", async () => {
        const session = createGraphSession();
        const seen = watch(session);

        await session.data.import({ config: { file: new File([DATA], "people.json") } });

        assert.deepEqual(seen[0], {
            task: "load",
            phase: "progress",
            completed: 0,
            total: null,
            fraction: null,
            source: { name: "people.json" },
        });
        assert.isTrue(seen.every((change) => change.source?.name === "people.json"));
        assert.deepInclude(seen.at(-1), { phase: "end", outcome: "succeeded", completed: 3 });
        assert.isUndefined(seen.at(-1)?.error);
        assert.doesNotThrow(() => structuredClone(seen));
        session.dispose();
    });

    it("names the URL a load reads", async () => {
        const session = createGraphSession();
        const seen = watch(session);
        const url = "https://example.invalid/graphs/miserables.json?v=2";

        await session.data.import({ type: "json", config: { url } }).catch(() => undefined);

        assert.deepEqual(seen[0]?.source, { name: "miserables.json", url });
        assert.deepInclude(seen[0], { phase: "progress", completed: 0 });
        assert.deepInclude(seen.at(-1), { phase: "end", outcome: "failed" });
        assert.strictEqual(seen.at(-1)?.error?.code, "E_FETCH_FAILED");
        session.dispose();
    });

    it("ends a refused load saying it failed, with the refusal's code and details", async () => {
        const session = createGraphSession();
        const seen = watch(session);

        await session.data.import({ type: "json", config: { data: "{" } }).catch(() => undefined);

        assert.deepInclude(seen[0], { phase: "progress", completed: 0 });
        const end = seen.at(-1);
        assert.deepInclude(end, { phase: "end", outcome: "failed" });
        assert.strictEqual(end?.error?.code, "E_PARSE_FAILED");
        assert.strictEqual(end?.error?.details.format, "json");
        assert.lengthOf(
            seen.filter((change) => change.phase === "end"),
            1,
            "one end",
        );
        session.dispose();
    });
});

describe("a prepare's progress", () => {
    it("starts, counts the rows read, and ends when the draft is ready", async () => {
        const session = createGraphSession();
        const seen = watch(session);

        const draft = await session.data.prepare({
            config: { file: new File(["id,name\na,A\nb,B\nc,C\n"], "people.csv") },
        });

        assert.isTrue(seen.every((change) => change.task === "prepare" && change.source?.name === "people.csv"));
        assert.deepInclude(seen[0], { phase: "progress", completed: 0, fraction: null });
        assert.isTrue(seen.some((change) => change.phase === "progress" && change.completed === 3));
        assert.deepInclude(seen.at(-1), { phase: "end", outcome: "succeeded", completed: 3 });
        assert.strictEqual(draft.tables[0]?.rowCount, 3);
        session.dispose();
    });

    it("counts a large CSV's rows while it is read, with the share of the file read", async () => {
        const session = createGraphSession();
        const seen = watch(session);
        const rows = 200_000;
        const text = `id,name,score\n${Array.from({ length: rows }, (_, i) => `n${i},Name ${i},${i % 97}`).join("\n")}\n`;
        assert.isAbove(text.length, 3 * (1 << 20), "the file spans several slices");

        await session.data.prepare({ config: { file: new File([text], "big.csv") } });

        const steps = seen.filter((change) => change.phase === "progress" && change.completed > 0);
        assert.isAbove(steps.length, 2, "several counts arrive while the file is read");
        const partial = steps.find((change) => change.completed < rows);
        assert.isDefined(partial, "a count arrives before the whole file is read");
        assert.isTrue((partial?.fraction ?? 0) > 0 && (partial?.fraction ?? 1) < 1, "with the share read");
        assert.isTrue(steps.every((change, i) => i === 0 || change.completed >= (steps[i - 1]?.completed ?? 0)));
        assert.deepInclude(seen.at(-1), { phase: "end", outcome: "succeeded", completed: rows, fraction: 1 });
        session.dispose();
    });

    it("counts a graph file's records chunk by chunk, and ends a refused read as failed", async () => {
        const session = createGraphSession();
        const seen = watch(session);

        await session.data.prepare({ type: "json", config: { data: DATA } });
        const read = seen.splice(0);
        await session.data.prepare({ type: "json", config: { data: "{" } }).catch(() => undefined);

        assert.deepInclude(read.at(-1), { phase: "end", outcome: "succeeded", completed: 3 });
        assert.deepInclude(seen.at(-1), { task: "prepare", phase: "end", outcome: "failed" });
        assert.strictEqual(seen.at(-1)?.error?.code, "E_PARSE_FAILED");
        session.dispose();
    });
});
