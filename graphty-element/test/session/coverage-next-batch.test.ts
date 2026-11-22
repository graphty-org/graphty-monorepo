import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { type Harness, makeSession } from "./helpers";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Three nodes; two edges a day apart in `sent`, and a `label` column that is no time. */
function timed(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", born: "2026-01-01" },
            { id: "b", born: "2026-01-02" },
            { id: "c", born: "2026-01-03" },
        ],
        [
            { src: "a", dst: "b", sent: "2026-01-01T00:00:00Z", until: "2026-01-02T00:00:00Z" },
            { src: "b", dst: "c", sent: "2026-01-02T00:00:00Z", until: "2026-01-03T00:00:00Z" },
        ],
    );

    return harness;
}

/**
 * The code and reason of a refusal.
 * @param error - What was thrown.
 * @returns The code and the details' reason, or the error itself when it is not a GraphtyError.
 */
function refusal(error: unknown): unknown {
    if (!isGraphtyError(error)) {
        return error;
    }

    const details = (error.details ?? {}) as { reason?: unknown; option?: unknown };
    return { code: error.code, reason: details.reason ?? details.option };
}

/**
 * What a promise rejected with.
 * @param promise - The promise.
 * @returns The rejection, or "resolved" when it did not reject.
 */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }

    return "resolved";
}

/**
 * What a call threw.
 * @param call - The call.
 * @returns What it threw, or "returned" when it did not.
 */
function thrown(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return error;
    }

    return "returned";
}

describe("session.time.setField refuses a malformed source", () => {
    it("names the bad part: start, unit, parse zone, end, spells", async () => {
        const harness = timed();
        const { time } = harness.session;
        const bad = [
            [{ edges: { start: "" } }, "start"],
            [{ edges: { start: "sent", unit: "fortnight" } }, "unit"],
            [{ edges: { start: "sent", parseZone: "Mars/Olympus" } }, "time-zone"],
            [{ edges: { start: "sent", end: "" } }, "end"],
            [{ edges: { start: "sent", spells: "" } }, "spells"],
            [{ nodes: { start: "born" }, edges: { start: "sent" } }, "time-paths-differ"],
        ] as const;
        for (const [field, reason] of bad) {
            const error = await rejection(time.setField(field as Parameters<typeof time.setField>[0]));
            assert.deepStrictEqual(refusal(error), { code: "E_BAD_COMMAND", reason }, JSON.stringify(field));
        }

        assert.isNull(time.field, "no refused call designated anything");
        harness.session.dispose();
    });
});

describe("session.time.bins refuses a bad count, step or budget", () => {
    it("refuses counts and budgets outside 1 to the bin limit", async () => {
        const harness = timed();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        for (const count of [0, 1.5, 1e9]) {
            assert.deepStrictEqual(
                refusal(thrown(() => time.bins({ count }))),
                { code: "E_OPTION_RANGE", reason: "count" },
                String(count),
            );
        }

        for (const maxCount of [0, Number.NaN, 1e9]) {
            assert.deepStrictEqual(
                refusal(thrown(() => time.bins({ maxCount }))),
                { code: "E_OPTION_RANGE", reason: "count" },
                String(maxCount),
            );
        }

        harness.session.dispose();
    });

    it("refuses a numeric step that would make more bins than the limit", async () => {
        const harness = timed();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        assert.deepStrictEqual(refusal(thrown(() => time.bins({ step: 1 }))), {
            code: "E_OPTION_RANGE",
            reason: "step",
        });
        // A step that fits counts each edge in its own day.
        assert.deepStrictEqual(
            (time.bins({ step: DAY }) ?? []).map((bin) => bin.edges),
            [1, 1],
        );
        harness.session.dispose();
    });

    it("is null with no field designated", () => {
        const harness = timed();
        assert.isNull(harness.session.time.bins({ count: 3 }));
        harness.session.dispose();
    });
});

describe("session.time.parse", () => {
    it("reads text in the field's unit, null for blank text, and refuses a bad zone", async () => {
        const harness = timed();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        assert.strictEqual(time.parse("2026-01-02T00:00:00Z"), T0 + DAY);
        assert.isNull(time.parse("   "));
        assert.deepStrictEqual(refusal(thrown(() => time.parse("2026-01-01", { timeZone: "Nowhere/Here" }))), {
            code: "E_BAD_COMMAND",
            reason: "time-zone",
        });
        harness.session.dispose();
    });
});

describe("session.time state before and after a window", () => {
    it("reports no window, no play and the default mode before any window", async () => {
        const harness = timed();
        const { time } = harness.session;
        assert.isFalse(time.atStart);
        assert.isFalse(time.atEnd);
        assert.isFalse(time.playing);
        assert.strictEqual(time.mode, "sliding");
        assert.isAbove(time.interval, 0);
        assert.isNull(await time.commit(), "nothing slid, so nothing commits");
        harness.session.dispose();
    });

    it("is at the start on the first day's window, and takes the window's mode", async () => {
        const harness = timed();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        await time.window({ step: "day" });
        assert.isTrue(time.atStart);
        assert.isFalse(time.atEnd);
        await time.window({ mode: "cumulative" });
        assert.strictEqual(time.mode, "cumulative");
        harness.session.dispose();
    });
});

/** A JSON project document, as parsed. */
type ProjectDoc = { members: Record<string, unknown>[] } & Record<string, unknown>;

/**
 * A saved project that loaded one CSV table, with its sources member changed before it is opened
 * again, and what the open reported about that member.
 * @param change - Changes the sources member in place.
 * @returns The open's problems about the sources member, and the member's position.
 */
async function reopenedWith(
    change: (member: Record<string, unknown>, loads: Record<string, unknown>[]) => void,
): Promise<{ problems: readonly { code: string; params: Record<string, unknown> }[]; at: number }> {
    const saving = createGraphSession();
    await saving.data.import({
        type: "csv",
        config: { file: new File(["source,target\na,b\nb,c\n"], "trips.csv", { type: "text/csv" }) },
        name: "trips.csv",
    });
    const { text } = await saving.project.save();
    saving.dispose();

    const doc = JSON.parse(text) as ProjectDoc;
    const at = doc.members.findIndex((each) => each.kind === "graphty-sources");
    assert.isAtLeast(at, 0, "a CSV load writes a sources member");
    const member = doc.members[at];
    change(member, member.loads as Record<string, unknown>[]);

    const opening = createGraphSession();
    const report = await opening.project.open(JSON.stringify(doc));
    opening.dispose();

    return { problems: report.problems.filter((each) => each.params.kind === "graphty-sources"), at };
}

describe("opening a sources member past a limit skips it, naming the limit", () => {
    /** Text of a given length, for a map past its byte limit. */
    const long = (bytes: number): string => "x".repeat(bytes);

    const cases: readonly [string, (member: Record<string, unknown>, loads: Record<string, unknown>[]) => void][] = [
        [
            "expansions",
            (_member, loads) => {
                loads[0].source = { expansions: Array.from({ length: 10_001 }, () => ({})) };
            },
        ],
        [
            "seeds",
            (_member, loads) => {
                loads[0].source = { expansions: [{ ids: Array.from({ length: 1001 }, (_, at) => String(at)) }] };
            },
        ],
        [
            "options",
            (_member, loads) => {
                loads[0].options = { note: long(262_144) };
            },
        ],
        [
            "extensions",
            (member) => {
                member.extensions = { note: long(65_536) };
            },
        ],
    ];

    for (const [limit, change] of cases) {
        it(`skips a member past the ${limit} limit`, async () => {
            const { problems, at } = await reopenedWith(change);
            assert.deepInclude(problems, {
                code: "E_TOO_LARGE",
                params: { kind: "graphty-sources", pointer: `/members/${String(at)}`, limit },
            });
        });
    }
});

describe("opening a sources member of the wrong shape skips it, naming the member", () => {
    const cases: readonly [string, (member: Record<string, unknown>) => void][] = [
        ["waiting", (member) => (member.waiting = [1])],
        ["loads", (member) => (member.loads = [1])],
        ["data", (member) => (member.data = "linked")],
        ["extensions", (member) => (member.extensions = [])],
    ];

    for (const [name, change] of cases) {
        it(`refuses a bad ${name}`, async () => {
            const { problems, at } = await reopenedWith(change);
            assert.deepInclude(problems, {
                code: "E_BAD_DOCUMENT",
                params: { kind: "graphty-sources", pointer: `/members/${String(at)}/${name}` },
            });
        });
    }
});
