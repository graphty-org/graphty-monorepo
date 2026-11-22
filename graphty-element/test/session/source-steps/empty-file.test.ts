/**
 * @file An empty file is refused the same way with the source-steps experiment on as with it off:
 * `replaceSource` and `stage` reject it with `E_EMPTY_LOAD`, and the graph and the staged list are
 * left as they were (issue #9615).
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { createGraphSession } from "../../../src/session";

/** Files that hold no rows: no bytes, a blank line, and a header with no rows under it. */
const EMPTY = ["", "\n", "id\n", "id,name\n"];

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns What `import`, `replaceSource` and `stage` take.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The code and details a promise rejects with.
 * @param run - The promise.
 * @returns Its error's code and details.
 */
async function refusal(run: Promise<unknown>): Promise<{ code: string; details: unknown }> {
    let caught: unknown = "no refusal";
    try {
        await run;
    } catch (error) {
        caught = error;
    }
    assert.isTrue(isGraphtyError(caught), String(caught));
    const { code, details } = caught as { code: string; details: unknown };
    return { code, details };
}

/**
 * A session holding one source of one person.
 * @param features - The experiments it runs with.
 * @returns The session and the source's key.
 */
async function withPerson(features: "source-steps"[]): Promise<{
    session: ReturnType<typeof createGraphSession>;
    key: string;
}> {
    const session = createGraphSession({ features });
    await session.data.import(csv("a.csv", "id,name\np1,Ann\n"), { type: "person" });
    return { session, key: session.data.sources()[0].key };
}

describe("source-steps: an empty file is refused", () => {
    for (const data of EMPTY) {
        it(`replaceSource refuses ${JSON.stringify(data)} as the experiment-off path does`, async () => {
            const off = await withPerson([]);
            const expected = await refusal(off.session.data.replaceSource(off.key, csv("a.csv", data)));
            assert.deepStrictEqual(expected, { code: "E_EMPTY_LOAD", details: { format: "csv", rowErrors: 0 } });

            const { session, key } = await withPerson(["source-steps"]);
            const got = await refusal(session.data.replaceSource(key, csv("a.csv", data)));
            assert.deepStrictEqual(got, expected);
            assert.deepStrictEqual(
                session.data.sources().map((each) => each.key),
                [key],
            );
            assert.strictEqual(session.data.node("p1")?.name, "Ann");
        });

        it(`stage refuses ${JSON.stringify(data)} and stages nothing`, async () => {
            const { session } = await withPerson(["source-steps"]);
            const got = await refusal(session.data.stage(csv("e.csv", data)));
            assert.deepStrictEqual(got, { code: "E_EMPTY_LOAD", details: { format: "csv", rowErrors: 0 } });
            assert.deepStrictEqual(session.data.staged(), []);
            assert.strictEqual(session.data.node("p1")?.name, "Ann");
        });
    }
});
