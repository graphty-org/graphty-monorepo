/**
 * A timed project saved before what lies outside the time window had a state of its own, holding a
 * rule set that reads the state "ghosted" (issue #9843). Its "ghosted" is read as "outsideWindow"
 * before the set is made, as its layers are; a kept set cannot follow a live state, so the set is
 * left out with the refusal's code and reason, and the rest of the project opens.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import type { ElementSession } from "../../src/session/types";

/**
 * A timed project with a window and two rule sets, as an older writer saved it: no outsideByLayers
 * mark, and one set's rule reading the state "ghosted".
 * @returns The project text.
 */
async function olderProject(): Promise<string> {
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    const nodes = Array.from({ length: 6 }, (_, i) => ({ id: `s${String(i)}`, step: i }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
    await session.time.setField({ nodes: { start: "step" } });
    await session.time.window({ from: 2, to: 3 });
    session.sets.create({ kind: "rule", where: "data.step == `0`", reading: "listed" }, { name: "Outside" });
    session.sets.create({ kind: "rule", where: "data.step == `1`", reading: "listed" }, { name: "One" });
    const { text } = await session.project.save();
    session.dispose();
    return text
        .replace(',"outsideByLayers":true', "")
        .replace(JSON.stringify("data.step == `0`"), JSON.stringify({ kind: "state", state: "ghosted" }));
}

describe("opening an older project whose set reads the ghosted state", () => {
    it("opens the project, leaving the set out with the refusal's code and reason", async () => {
        const text = await olderProject();
        assert.include(text, '"state":"ghosted"');

        const opened = createGraphSession() as ElementSession;
        const { problems } = await opened.project.open(text);
        assert.deepEqual(problems, [
            { code: "E_BAD_COMMAND", params: { slice: "sets", id: "set_outside", reason: "live-selection" } },
        ]);
        assert.deepEqual(
            opened.sets.list().map((set) => set.name),
            ["One"],
        );
        const graph = opened.data.snapshot();
        assert.strictEqual(graph.nodeCount, 6);
        // The window is back: s0 lies outside it, s2 inside.
        assert.isTrue(opened.visibility.outsideWindow("node", graph.ids.indexOf("s0")));
        assert.isFalse(opened.visibility.outsideWindow("node", graph.ids.indexOf("s2")));
        assert.notInclude((await opened.project.save()).text, '"state":"ghosted"');
        opened.dispose();
    });
});
