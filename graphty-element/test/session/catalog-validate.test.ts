/**
 * @file `session.catalog.validate()` and `session.catalog.timeAttributes()` on a loaded graph.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { pageDefaultFeatures, setDefaultFeatures } from "../../src/features/resolve";
import { createGraphSession } from "../../src/session";
import type { GraphSession } from "../../src/session/types";

const DAYS = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i * 7)).toISOString().slice(0, 10));

/**
 * A session over twelve nodes with a weight, a group and a date, and a ring of edges.
 * @returns The session.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        DAYS.map((day, i) => ({ id: `n${String(i)}`, weight: i, group: ["a", "b"][i % 2], when: day })),
    );
    await session.data.addEdges(
        DAYS.map((_, i) => ({ source: `n${String(i)}`, target: `n${String((i + 1) % DAYS.length)}` })),
    );
    return session;
}

let before: readonly string[] = [];
beforeEach(() => {
    before = pageDefaultFeatures();
});
afterEach(() => {
    setDefaultFeatures(before);
});

describe("session.catalog.validate", () => {
    it("passes an expression that parses and reads only answered paths", async () => {
        const session = await loaded();
        assert.deepEqual(session.catalog.validate("data.weight > `3` && data.group == 'a'"), {
            ok: true,
            unresolvedPaths: [],
        });
        session.dispose();
    });

    it("reports a parse error as a code, a position and its parameters, with no words", async () => {
        const session = await loaded();
        const check = session.catalog.validate("data.weight > 3");
        assert.isFalse(check.ok);
        assert.strictEqual(check.error?.code, "E_BAD_SELECTOR");
        assert.strictEqual(check.error?.params.reason, "number-needs-backticks");
        assert.strictEqual(check.error?.position, 14);
        assert.notProperty(check.error, "message");
        assert.deepEqual(check.unresolvedPaths, []);
        session.dispose();
    });

    it("names an unknown attribute with the nearest answered paths", async () => {
        const session = await loaded();
        const check = session.catalog.validate("data.wieght > `3`");
        assert.isFalse(check.ok);
        assert.isUndefined(check.error);
        assert.lengthOf(check.unresolvedPaths, 1);
        assert.strictEqual(check.unresolvedPaths[0].path, "data.wieght");
        assert.strictEqual(check.unresolvedPaths[0].reason, "unknown-attribute");
        assert.strictEqual(check.unresolvedPaths[0].candidates[0], "data.weight");
        session.dispose();
    });

    it("names a results path whose run does not exist as an unknown run", async () => {
        const session = await loaded();
        const check = session.catalog.validate("results.betweeness.value > `0`", { kind: "filter" });
        assert.isFalse(check.ok);
        assert.strictEqual(check.unresolvedPaths[0].reason, "unknown-run");
        session.dispose();
    });

    it("refuses a formula, whose grammar is not implemented", async () => {
        const session = await loaded();
        const check = session.catalog.validate("[weight] * 2", { kind: "formula" });
        assert.isFalse(check.ok);
        assert.strictEqual(check.error?.code, "E_UNSUPPORTED");
        session.dispose();
    });
});

describe("session.catalog.timeAttributes", () => {
    it("lists the columns that read as time, and nothing else", async () => {
        setDefaultFeatures(["timeline"]);
        const session = await loaded();
        const listed = session.catalog.timeAttributes().map((each) => `${each.kind}:${each.name}`);
        assert.deepEqual(listed, ["node:when"]);
        session.dispose();
    });

    it("lists none while the timeline experiment is off", async () => {
        setDefaultFeatures([]);
        const session = await loaded();
        assert.deepEqual(session.catalog.timeAttributes(), []);
        session.dispose();
    });
});
