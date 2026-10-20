import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import type { RuleTree, TimeWindow } from "../../../src/session/visibility";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/**
 * An authentication log: each edge is one login of a user onto a host, stamped with when it
 * happened. The nodes carry no time at all, which is the ordinary shape of an event table.
 */
function authLog(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "alice", kind: "user" },
            { id: "bob", kind: "user" },
            { id: "carol", kind: "user" },
            { id: "web", kind: "host" },
            { id: "db", kind: "database" },
            { id: "mail", kind: "host" },
        ],
        [
            { src: "alice", dst: "web", at: "2024-03-01T09:00:00Z" },
            { src: "alice", dst: "db", at: "2024-03-01T17:30:00Z" },
            { src: "bob", dst: "db", at: "2024-03-02T08:15:00Z" },
            { src: "carol", dst: "mail", at: "2024-03-03T12:00:00Z" },
            { src: "bob", dst: "mail", at: "2024-03-03T23:59:00Z" },
        ],
    );

    return harness;
}

/** The first day of the log, as a half-open window whose nodes follow their edges. */
const MARCH_FIRST: TimeWindow = {
    attribute: "data.at",
    from: "2024-03-01T00:00:00Z",
    to: "2024-03-02T00:00:00Z",
    nodes: "follow-edges",
};

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("visibility.timeHistogram", () => {
    it("counts the auth log's logins per day bin", () => {
        const harness = authLog();

        const histogram = harness.session.visibility.timeHistogram("data.at", { bins: 3 });

        assert.strictEqual(histogram.kind, "date");
        assert.strictEqual(histogram.min, Date.parse("2024-03-01T09:00:00Z"));
        assert.strictEqual(histogram.max, Date.parse("2024-03-03T23:59:00Z"));
        assert.lengthOf(histogram.bins, 3);
        assert.deepStrictEqual(
            histogram.bins.map((bin) => bin.edges),
            [2, 1, 2],
        );
        assert.deepStrictEqual(
            histogram.bins.map((bin) => bin.nodes),
            [0, 0, 0],
        );
        assert.deepStrictEqual(histogram.untimed, { nodes: 6, edges: 0 });
        assert.strictEqual(histogram.bins[0]?.from, histogram.min);
        assert.strictEqual(histogram.bins[2]?.to, histogram.max, "the last bin holds the maximum");
        harness.session.dispose();
    });

    it("defaults to fifty bins and reads plain numbers as numbers", () => {
        const harness = makeSession();
        harness.add([
            { id: "a", at: 10 },
            { id: "b", at: 10 },
            { id: "c", at: 20 },
        ]);

        const histogram = harness.session.visibility.timeHistogram("data.at");

        assert.strictEqual(histogram.kind, "number");
        assert.lengthOf(histogram.bins, 50);
        assert.strictEqual(histogram.bins[0]?.nodes, 2);
        assert.strictEqual(histogram.bins[49]?.nodes, 1);
        harness.session.dispose();
    });

    it("answers an attribute nobody carries with no bins rather than a guess", () => {
        const harness = authLog();

        const histogram = harness.session.visibility.timeHistogram("data.nope");

        assert.isNull(histogram.min);
        assert.isNull(histogram.max);
        assert.deepStrictEqual(histogram.bins, []);
        assert.deepStrictEqual(histogram.untimed, { nodes: 6, edges: 5 });
        harness.session.dispose();
    });

    it("gives one repeated value a bin of usable width", () => {
        const harness = makeSession();
        harness.add([
            { id: "a", at: 7 },
            { id: "b", at: 7 },
        ]);

        const histogram = harness.session.visibility.timeHistogram("data.at", { bins: 4 });

        assert.strictEqual(histogram.bins[0]?.nodes, 2);
        assert.isAbove(histogram.bins[3]?.to ?? 0, 7);
        harness.session.dispose();
    });

    it("refuses a bin count that is not a whole number from 1 to 10,000, and a blank path", () => {
        const harness = authLog();
        const { visibility } = harness.session;

        assert.strictEqual(
            codeOf(() => visibility.timeHistogram("data.at", { bins: 0 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => visibility.timeHistogram("data.at", { bins: 2.5 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => visibility.timeHistogram("data.at", { bins: 10_001 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => visibility.timeHistogram(" ")),
            "E_BAD_COMMAND",
        );
        harness.session.dispose();
    });
});

describe("a time window whose nodes follow their edges", () => {
    it("shows, for one day, only the nodes of the edges in that day", async () => {
        const harness = authLog();

        const result = await harness.session.visibility.setWindow(MARCH_FIRST);

        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["alice", "db", "web"]);
        assert.deepStrictEqual(
            [...harness.session.visibility.edges].sort(),
            [edgeBetween(harness, "alice", "db"), edgeBetween(harness, "alice", "web")].sort(),
        );
        assert.deepStrictEqual(result.visible, { nodes: 3, edges: 2 });
        harness.session.dispose();
    });

    it("leaves every node in place with the default, because the nodes carry no time", async () => {
        const harness = authLog();
        const { nodes: _follow, ...own } = MARCH_FIRST;

        await harness.session.visibility.setWindow(own);

        assert.strictEqual(harness.session.visibility.summary.visibleNodes, 6);
        assert.strictEqual(harness.session.visibility.summary.visibleEdges, 2);
        harness.session.dispose();
    });

    it("combines with a filter into one mask", async () => {
        const harness = authLog();
        const notDb: RuleTree = {
            kind: "not",
            of: { kind: "categories", attribute: "data.kind", values: ["database"] },
        };
        const { visibility } = harness.session;

        await visibility.setWindow(MARCH_FIRST);
        const result = await visibility.set(notDb);

        // The window leaves alice, web and db; the filter drops db, and the edge to it with it.
        assert.deepStrictEqual([...visibility.nodes].sort(), ["alice", "web"]);
        assert.deepStrictEqual([...visibility.edges], [edgeBetween(harness, "alice", "web")]);
        assert.deepStrictEqual(result.visible, { nodes: 2, edges: 1 });
        assert.deepStrictEqual(harness.session.status.counts, {
            nodes: 6,
            edges: 5,
            visibleNodes: 2,
            visibleEdges: 1,
        });

        await visibility.setWindow(null);
        assert.strictEqual(visibility.summary.visibleNodes, 5, "clearing the window leaves the filter standing");
        harness.session.dispose();
    });

    it("keeps a node with no timed edge, since the window says nothing about it", async () => {
        const harness = authLog();
        harness.add([{ id: "loner", kind: "user" }], []);

        await harness.session.visibility.setWindow(MARCH_FIRST);

        assert.isTrue(harness.session.visibility.isVisible("loner"));
        assert.isFalse(harness.session.visibility.isVisible("carol"));
        harness.session.dispose();
    });

    it("refuses a nodes value that is not own or follow-edges", () => {
        const harness = authLog();

        assert.strictEqual(
            codeOf(() => harness.session.visibility.setWindow({ ...MARCH_FIRST, nodes: "all" as never })),
            "E_BAD_COMMAND",
        );
        harness.session.dispose();
    });
});

describe("a time window over intervals", () => {
    /** Three sessions, each with a start and an end. */
    function sessions(): Harness {
        const harness = makeSession();
        harness.add([
            { id: "early", start: 0, stop: 5 },
            { id: "spans", start: 5, stop: 50 },
            { id: "late", start: 30, stop: 40 },
            { id: "open", start: 12 },
        ]);

        return harness;
    }

    it("shows every interval that overlaps the window, not only those starting inside it", async () => {
        const harness = sessions();

        await harness.session.visibility.setWindow({ attribute: "data.start", end: "data.stop", from: 10, to: 20 });

        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["open", "spans"]);
        harness.session.dispose();
    });

    it("counts an interval ending exactly at the window's start as touching it", async () => {
        const harness = sessions();

        await harness.session.visibility.setWindow({ attribute: "data.start", end: "data.stop", from: 5, to: 6 });

        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["early", "spans"]);
        harness.session.dispose();
    });

    it("refuses a blank end path", () => {
        const harness = sessions();

        assert.strictEqual(
            codeOf(() => harness.session.visibility.setWindow({ attribute: "data.start", end: "", from: 0, to: 1 })),
            "E_BAD_COMMAND",
        );
        harness.session.dispose();
    });
});
