/**
 * Text built from several values: the `{ template: [...] }` binding of a text channel.
 */

import { assert, describe, it } from "vitest";

import type { Channel, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { RichTextParser } from "../../../src/meshes/RichTextParser";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { prepareBinding } from "../../../src/session/styles/encoding";
import { createScaleRegistry } from "../../../src/session/styles/scales";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

/**
 * Prepare a template and paint one element with it.
 * @param template - The lines.
 * @param row - The element's values, by path.
 * @param columns - Every element's values, by path, for count and rank.
 * @param channel - The channel.
 * @returns What the element is painted.
 */
function paint(
    template: string[],
    row: Record<Path, unknown>,
    columns: Record<Path, unknown[]> = {},
    channel: Channel = "node.label",
): unknown {
    const prepared = prepareBinding({
        channel,
        binding: { template },
        scales: createScaleRegistry(),
        columnOf: (path) => columns[path] ?? [],
    });

    return prepared.paint((path: Path) => row[path]);
}

/**
 * The error code a call threw.
 * @param call - The call.
 * @returns The code.
 */
function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `threw something else: ${String(error)}`;
    }

    return "did not throw";
}

/** Which community each node falls in, as Louvain writes it: group ids, not 1..n. */
const MEMBERSHIP: readonly (readonly [string, number])[] = [
    ["a", 2],
    ["b", 2],
    ["c", 10],
];

/**
 * An executor that publishes the partition above as a community result.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function partition(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();

    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: MEMBERSHIP.length, edges: 0 },
            nodes: MEMBERSHIP.map(([id, group]) => ({ id, values: { group } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("a template binding", () => {
    it("reads {path} with the same path dialect as by", () => {
        const text = paint(["<bold>{data.name}</bold>", "Connections: {results.degree.value}"], {
            "data.name": "alpha",
            "results.degree.value": 3,
        });

        assert.strictEqual(text, "<bold>alpha</bold>\nConnections: 3");
    });

    it("leaves out a line with a missing value and keeps the others", () => {
        const text = paint(["{data.name}", "Community {results.louvain.group}", "end"], { "data.name": "alpha" });

        assert.strictEqual(text, "alpha\nend");
    });

    it("paints nothing when every line is left out", () => {
        assert.isUndefined(paint(["{data.name}"], {}));
    });

    it("gives the number of distinct values with |count and the 1-based sorted place with |rank", () => {
        const columns = { "results.louvain.group": [0, 5, 5, 2, 10, undefined, 2] };
        const template = ["Community {results.louvain.group|rank} of {results.louvain.group|count}"];

        assert.strictEqual(paint(template, { "results.louvain.group": 0 }, columns), "Community 1 of 4");
        assert.strictEqual(paint(template, { "results.louvain.group": 5 }, columns), "Community 3 of 4");
        // Sorted as numbers, not as text: 10 comes after 5.
        assert.strictEqual(paint(template, { "results.louvain.group": 10 }, columns), "Community 4 of 4");
        assert.isUndefined(paint(template, {}, columns), "a node with no group has no row");
    });

    it("escapes a value, so label markup in the data is drawn literally", () => {
        const text = paint(["<bold>{data.name}</bold>"], { "data.name": "<color='red'>x</color>" });
        const parser = new RichTextParser({ color: "black" } as never);
        const segments = parser.parse(String(text));

        assert.strictEqual(
            segments[0].map((segment) => segment.text).join(""),
            "<color='red'>x</color>",
            "the value's tags are text",
        );
        assert.isTrue(
            segments[0].every((segment) => segment.style.weight === "bold" && segment.style.color === "black"),
            "the template's own tag still applies and the value's does not",
        );
    });

    it("is refused on a channel that is not text", () => {
        assert.strictEqual(
            codeOf(() => paint(["{data.name}"], {}, {}, "node.color")),
            "E_BAD_LAYER",
        );
    });

    it("refuses a placeholder it does not understand", () => {
        assert.strictEqual(
            codeOf(() => paint(["{data.name|upper}"], {})),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => paint(["{}"], {})),
            "E_BAD_LAYER",
        );
    });
});

describe("a template layer in a session", () => {
    it("is refused at the edit on a channel that is not text", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);

        const result = harness.session.styles.validate({
            name: "card",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { template: ["{data.name}"] } },
        });

        assert.isFalse(result.ok);
        assert.strictEqual(result.errors[0]?.code, "E_BAD_LAYER");
    });

    it("grows its community row when Louvain's result arrives", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        harness.add([...MEMBERSHIP.map(([id]) => ({ id, name: id.toUpperCase() })), { id: "d", name: "D" }]);
        const session = harness.session as ElementSession;
        const labelOf = (id: string): unknown =>
            session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.label"];

        await session.styles.add({
            name: "card",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.label": {
                    template: [
                        "<bold>{data.name}</bold>",
                        "Community {results.louvain.group|rank} of {results.louvain.group|count}",
                    ],
                },
            },
        });
        await session.styles.settled();
        assert.strictEqual(labelOf("a"), "<bold>A</bold>", "no community row before the run");

        const run = await session.runs.start("louvain", {}, { style: false });
        assert.strictEqual(run.runId, "louvain");
        await session.styles.settled();

        assert.strictEqual(labelOf("a"), "<bold>A</bold>\nCommunity 1 of 2");
        assert.strictEqual(labelOf("c"), "<bold>C</bold>\nCommunity 2 of 2");
        assert.strictEqual(labelOf("d"), "<bold>D</bold>", "a node the run did not measure has no community row");
    });
});
