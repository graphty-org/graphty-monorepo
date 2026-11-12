/**
 * The source ledger: records hold what a refresh needs and never a secret, expansions chain to
 * their load, and a saved member round-trips, refusing a newer version.
 */

import { inspect } from "node:util";

import { credentials } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../../src/errors/GraphtyError";
import { LEDGER_VERSION, SourceLedger } from "../../../src/session/sources/ledger";

const SECRET = "SENTINEL-ledger-secret";

/**
 * A ledger holding one load made with a basic credential, and one expansion of it.
 * @returns the ledger
 */
function filled(): SourceLedger {
    const ledger = new SourceLedger();
    const load = ledger.addLoad({
        source: "neo4j",
        version: 1,
        config: { query: "MATCH (n) RETURN n", parameters: { name: "Ana" } },
        endpoint: "https://db.example.com:7473/path?token=SENTINEL-query",
        options: {
            mode: "merge",
            idPrefix: "n:",
            credential: credentials.basic("ana", SECRET),
            write: true,
            signal: new AbortController().signal,
        },
        next: { after: "x" },
        validators: { serverVersion: "5.26" },
        credential: credentials.basic("ana", SECRET),
        loadedAt: "2026-10-17T00:00:00.000Z",
    });
    ledger.addExpansion(load.key, { ids: ["a"], depth: 2, limit: 10, at: "2026-10-17T00:01:00.000Z" });
    return ledger;
}

describe("SourceLedger", () => {
    it("records what a refresh needs, with the credential's identity only", () => {
        const [record] = filled().loads();
        assert.strictEqual(record.key, "load-1");
        assert.strictEqual(record.endpoint, "https://db.example.com:7473/path");
        assert.deepEqual(record.options, { mode: "merge", idPrefix: "n:" });
        assert.deepEqual(record.credential, { kind: "basic", origin: "https://db.example.com:7473", username: "ana" });
        assert.deepEqual(record.next, { after: "x" });
        assert.strictEqual(record.expansions[0].key, "load-1/x1");
        assert.deepEqual(record.expansions[0].ids, ["a"]);
    });

    it("never holds a credential's secret, the write flag or a query string", () => {
        const ledger = filled();
        for (const text of [
            JSON.stringify(ledger.toMember()),
            inspect(ledger, { depth: 20, showHidden: true }),
            JSON.stringify(ledger.loads()),
        ]) {
            assert.notInclude(text, SECRET);
            assert.notInclude(text, "SENTINEL-query");
            assert.notInclude(text, '"write"');
        }
    });

    it("finds a node's first source load, through an expansion's key too", () => {
        const ledger = filled();
        assert.strictEqual(ledger.loadOf(["file-1", "load-1/x1"])?.key, "load-1");
        assert.isUndefined(ledger.loadOf(["file-1"]));
    });

    it("moves a load's cursor", () => {
        const ledger = filled();
        ledger.setNext("load-1", null);
        assert.isNull(ledger.loads()[0].next);
    });

    it("round-trips through the project member and keeps numbering after it", () => {
        const member = JSON.parse(JSON.stringify(filled().toMember())) as unknown;
        const restored = new SourceLedger();
        restored.fromMember(member);
        assert.deepEqual(restored.loads(), filled().loads());
        assert.strictEqual(
            restored.addLoad({ source: "ndex", version: 1, config: { uuid: "u" }, endpoint: null }).key,
            "load-2",
        );
    });

    it("refuses a newer member version and a malformed member", () => {
        const ledger = new SourceLedger();
        assert.throws(() => ledger.fromMember({ version: LEDGER_VERSION + 1, loads: [] }), GraphtyError, /version/);
        try {
            ledger.fromMember({ version: LEDGER_VERSION + 1, loads: [] });
        } catch (error) {
            assert.strictEqual((error as GraphtyError).code, "E_UNSUPPORTED_VERSION");
        }
        for (const bad of [null, { loads: [] }, { version: 1 }, { version: 1, loads: [{ key: 1 }] }]) {
            try {
                ledger.fromMember(bad);
                assert.fail("accepted a malformed member");
            } catch (error) {
                assert.strictEqual((error as GraphtyError).code, "E_BAD_DOCUMENT");
            }
        }
    });
});
