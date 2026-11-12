/**
 * @file Two `data.import` commands in one batch on a session with no renderer: the batch starts
 * its members together, and each load's tally, left-out rows and issue facts stay its own
 * (issue #4439), as they do through the element's own import door (issue #3535).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type LoadedSource } from "../../src/session";
import type { DataImportCommand } from "../../src/session/commands/data";
import { dispatcherOf } from "../../src/session/GraphSession";

const MESSAGES = "source,target\nCara,Dan\nDan,Eve\n";

describe("two imports in one batch on a session with no renderer", () => {
    it("keep each load's tally, left-out rows and issue facts its own", async () => {
        const session = createGraphSession();
        const people = new File(["id\nAva\nBen\n"], "people.csv");
        const passes = new File(["from,to\nAva,Ben\nBen,Zed\nAva,Ben\n"], "passes.csv");
        // What a draft's load dispatches: the rows it already read, held in the command.
        const first: DataImportCommand = {
            op: "data.import",
            source: { type: "csv", config: { nodeFile: people, edgeFile: passes }, name: "passes.csv" },
            mode: "merge",
            unmatched: "leave-out",
            held: {
                nodes: [{ id: "Ava" }, { id: "Ben" }],
                edges: [
                    { from: "Ava", to: "Ben" },
                    { from: "Ben", to: "Zed" },
                    { from: "Ava", to: "Ben" },
                ],
                edgeLines: [2, 3, 4],
                declaredDirection: null,
                errors: [],
                errorLimit: 100,
                idPath: "id",
                source: "from",
                target: "to",
                weight: null,
            },
        };
        const second: DataImportCommand = {
            op: "data.import",
            source: { type: "csv", config: { data: MESSAGES }, name: "messages.csv" },
            mode: "merge",
        };
        // A synchronous door's batch starts its queued members at once, beside the queue, so both
        // imports run together.
        await dispatcherOf(session).dispatchNow({
            op: "batch",
            fact: { code: "data.import", params: { name: null, type: "csv" } },
            steps: [first, second],
        });

        const [passesLoad, messagesLoad] = session.data.sources();
        const leftOut = {
            rows: 1,
            values: 1,
            endColumns: { source: "from", target: "to" },
            edges: [{ source: "Ben", target: "Zed", line: 3, values: {}, missingEnds: ["target"] }],
        } satisfies LoadedSource["leftOut"];
        assert.deepStrictEqual(passesLoad?.added, { nodes: 2, edges: 2 }, "the first load's own tally");
        assert.deepStrictEqual(passesLoad?.leftOut, leftOut, "the first load left out its own unmatched row");
        assert.deepStrictEqual(messagesLoad?.added, { nodes: 3, edges: 2 }, "the second load's own tally");
        assert.notProperty(messagesLoad, "leftOut", "the second load left nothing out");
        assert.deepStrictEqual(
            session.data.issues({ includeIgnored: true }).map((each) => [each.id, each.count]),
            [["repeated-edge:edge", 1]],
            "the repeated edge is counted once, as the first load's",
        );
        assert.notInclude(
            session.data.nodes().map((node) => node.id),
            "Zed",
            "the left-out end was not made a node",
        );
        session.dispose();
    });
});
