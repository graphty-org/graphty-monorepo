/**
 * @file A layer a file's styles made reads the file's values at `graphty.style.<namespace>.<kind>.<key>`, a path
 * graphty-element gives a meaning to, so the rule form an editor reads it in (`selectorRule`) is a rule the element
 * takes back: written back, it matches the same elements (#6630). A path under `graphty.` that names nothing is still
 * refused, so a stored rule never changes meaning when a later release gives that path one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession, selectorRule } from "../../session";
import { parseSetDefinition } from "../../src/catalog/sets/parse";
import { isGraphtyError } from "../../src/errors";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const FILE = join(
    __dirname,
    "..",
    "..",
    "..",
    "graph-io",
    "test",
    "corpus",
    "styles",
    "graphml",
    "fidelity",
    "galaxy-lcms-workflow.graphml",
);

describe("a file layer's rule form", () => {
    it("is taken back by the element and matches the same elements", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "graphml", config: { data: new Uint8Array(readFileSync(FILE)) } },
            { styles: "file" },
        );
        await session.styles.settled();

        const ruled = session.styles
            .list()
            .filter((layer) => layer.selector.match === "has" && layer.selector.path.startsWith("graphty.style."));
        assert.isAbove(ruled.length, 0, "the file made layers on its own values");

        for (const layer of ruled) {
            const rule = selectorRule(layer.selector);
            assert.isDefined(rule, layer.id);
            const before = session.styles.counts(layer.id).matched;
            await session.styles.update(layer.id, { selector: rule });
            await session.styles.settled();
            assert.strictEqual(session.styles.counts(layer.id).matched, before, layer.id);
        }
    });

    it("refuses a graphty. path that names nothing, with reason reserved-root", () => {
        for (const reads of ["graphty.style.graphml", "graphty.styles.graphml.node.x", "graphty.later"]) {
            let thrown: unknown;
            try {
                parseSetDefinition({
                    kind: "rule",
                    where: { kind: "text", reads, mode: "regex", text: "" },
                    reading: "clipped",
                });
            } catch (error) {
                thrown = error;
            }
            assert.ok(isGraphtyError(thrown), reads);
            assert.strictEqual(thrown.details.reason, "reserved-root", reads);
        }
        for (const reads of ["graphty.style.graphml.node.el.load", "graphty.notes.count"]) {
            assert.doesNotThrow(() =>
                parseSetDefinition({
                    kind: "rule",
                    where: { kind: "text", reads, mode: "regex", text: "" },
                    reading: "clipped",
                }),
            );
        }
    });
});
