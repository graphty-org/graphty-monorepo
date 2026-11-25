/**
 * @file What 2.0 stopped publishing, and the proof that it really stopped.
 *
 * THE FAILURE THIS GUARDS AGAINST is a record that outlives its removal. `WITHDRAWN_CAPABILITIES`
 * in `src/catalog/unreachable.ts` is published: a settings panel, a plugin or a model reads it to
 * tell somebody why a name they remember is gone. A list like that is only worth reading while it
 * is true, and the way it stops being true is silent -- somebody restores a schema field or a
 * channel, and an entry goes on telling consumers that a working capability was taken away.
 *
 * So every entry is exercised against the element itself. A channel that was withdrawn must not
 * be a channel; a schema field that was withdrawn must be refused by the schema that used to
 * carry it. Both style schemas are strict, which is what makes the second half checkable: a
 * withdrawn key is a parse error rather than a value quietly dropped, so a consumer who still
 * has one in a saved document is told, at the line that has it.
 *
 * AND THE TABLE BELOW IS NOT ALLOWED TO LAG. It is keyed by subject and every entry in the
 * published list must appear in it, so adding a withdrawal without saying how to prove it fails
 * here rather than being taken on trust.
 */

import { assert, describe, it } from "vitest";

import { WITHDRAWN_CAPABILITIES } from "../../src/catalog/unreachable";
import { EdgeStyle } from "../../src/config/EdgeStyle";
import { NodeStyle } from "../../src/config/NodeStyle";

/**
 * How to prove one withdrawn subject is really gone, keyed by the subject as it was published.
 *
 * Each probe returns the reason it is NOT gone, or null when it is -- a sentence rather than a
 * boolean, so a failure here says what came back rather than that something did.
 */
const PROBES: Readonly<Record<string, () => string | null>> = {
    "NodeStyle.enabled": () => {
        const parsed = NodeStyle.safeParse({ enabled: true });

        return parsed.success
            ? "NodeStyle accepts `enabled` again. Nothing reads it -- the session's visibility " +
                  "mask is what decides whether a node is drawn -- so a consumer flipping it " +
                  "would once more watch the node stay exactly where it was."
            : null;
    },
    "EdgeStyle.enabled": () => {
        const parsed = EdgeStyle.safeParse({ enabled: true });

        return parsed.success ? "EdgeStyle accepts `enabled` again, and nothing reads it." : null;
    },
};

describe("the capabilities 2.0 withdrew", () => {
    it("names every one of them with a reason and a replacement", () => {
        for (const entry of WITHDRAWN_CAPABILITIES) {
            assert.isNotEmpty(entry.subject, "a withdrawal with no subject names nothing");
            assert.isNotEmpty(
                entry.reason.trim(),
                `${entry.subject} was withdrawn with no reason, which leaves a consumer meeting ` +
                    "a parse error and nothing to read",
            );
            assert.isNotEmpty(
                entry.instead.trim(),
                `${entry.subject} was withdrawn with nothing to reach for instead. Every one of ` +
                    "these has an answer -- that is what made withdrawing it defensible",
            );
            assert.match(entry.withdrawnIn, /^\d+\.\d+$/, `${entry.subject} does not say which release took it away`);
        }
    });

    it("can prove each one is really gone", () => {
        const unprovable = WITHDRAWN_CAPABILITIES.filter((entry) => !(entry.subject in PROBES)).map(
            (entry) => entry.subject,
        );

        assert.deepStrictEqual(
            unprovable,
            [],
            `these withdrawals are published with nothing here that checks them: ` +
                `[${unprovable.join(", ")}]. Add a probe to PROBES in this file that fails while ` +
                "the subject is still reachable -- a record nothing checks is a record that goes " +
                "stale without anybody noticing.",
        );

        for (const entry of WITHDRAWN_CAPABILITIES) {
            const still = PROBES[entry.subject]();

            assert.isNull(still, `${entry.subject}: ${String(still)}`);
        }
    });
});
