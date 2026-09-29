/**
 * @file Execution tokens (design/sets/sets-design.md 5.2): one per execution of every run, a
 * session nonce plus a session-wide counter, stored on and read from the run's result entry.
 */

import { assert, describe, it } from "vitest";

import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import { createExecutionMinter } from "../../../src/session/runs/RunsApi";
import { type Harness, makeSession } from "../helpers";
import { finishAtOnce } from "./harness";

/** `<nonce>.<counter>`. */
const TOKEN = /^([0-9a-z]+)\.(\d+)$/;

/**
 * A session with two nodes whose runs finish at once.
 * @returns the harness
 */
function session(): Harness {
    const harness = makeSession({ runs: { execute: finishAtOnce } });
    harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

    return harness;
}

/**
 * Split a token into its nonce and its counter.
 * @param token - the token
 * @returns the parts
 */
function parts(token: string | undefined): { nonce: string; counter: number } {
    const match = TOKEN.exec(token ?? "");
    assert.isNotNull(match, `a token: ${String(token)}`);

    return { nonce: match?.[1] ?? "", counter: Number(match?.[2]) };
}

describe("execution tokens", () => {
    it("are distinct across 1,000 re-runs of two runs, from one session-wide counter", async () => {
        const harness = session();
        const { results, runs } = harness.session;
        const degree = runs.start("degree", undefined, { as: "degree", style: false });
        const pagerank = runs.start("pagerank", undefined, { as: "pagerank", style: false });
        await Promise.all([degree, pagerank]);

        const seen = new Set<string>();
        const counters: number[] = [];
        let nonce: string | null = null;
        for (let i = 0; i < 1000; i++) {
            const run = i % 2 === 0 ? degree : pagerank;
            if (i >= 2) {
                await run.rerun();
            }

            const token = resultExecutionOf(results, run);
            assert.isString(token);
            seen.add(token ?? "");
            const split = parts(token);
            nonce ??= split.nonce;
            assert.strictEqual(split.nonce, nonce, "one nonce per session");
            counters.push(split.counter);
        }

        assert.strictEqual(seen.size, 1000);
        assert.deepEqual(
            [...counters].sort((x, y) => x - y),
            Array.from({ length: 1000 }, (_, i) => i + 1),
            "one counter shared by both runs, never a per-run count",
        );
        harness.session.dispose();
    });

    it("is read from the result entry, and kept while a re-run has not replaced the result", async () => {
        const harness = session();
        const { results, runs } = harness.session;
        const run = runs.start("degree", undefined, { as: "degree", style: false });
        assert.isUndefined(resultExecutionOf(results, "degree"), "no result, no token");
        await run;
        const first = resultExecutionOf(results, "degree");
        assert.isString(first);
        assert.strictEqual(resultExecutionOf(results, run), first, "by run or by id");

        const again = run.rerun();
        assert.strictEqual(
            resultExecutionOf(results, "degree"),
            first,
            "the re-run has not replaced the result yet, so the token is still the one it was made with",
        );
        await again;
        assert.notStrictEqual(resultExecutionOf(results, "degree"), first);
        harness.session.dispose();
    });

    it("never collide between sessions", async () => {
        const one = session();
        const two = session();
        const first = one.session.runs.start("degree", undefined, { as: "degree", style: false });
        const second = two.session.runs.start("degree", undefined, { as: "degree", style: false });
        await Promise.all([first, second]);

        const a = parts(resultExecutionOf(one.session.results, "degree"));
        const b = parts(resultExecutionOf(two.session.results, "degree"));
        assert.strictEqual(a.counter, b.counter, "both first executions");
        assert.notStrictEqual(a.nonce, b.nonce);
        one.session.dispose();
        two.session.dispose();
    });

    it("mints nonces unique across 1,000 minters in one process", () => {
        const nonces = new Set(Array.from({ length: 1000 }, () => parts(createExecutionMinter()()).nonce));
        assert.strictEqual(nonces.size, 1000);
    });
});
