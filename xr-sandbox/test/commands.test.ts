import { describe, expect, it } from "vitest";

import { createCommands } from "../src/core/commands";
import { createState } from "../src/core/state";

const names = ["Medici", "Strozzi", "Pazzi", "Albizzi"];
const setup = () => {
    const state = createState({ pagerank: Float64Array.from([0.146, 0.088, 0.04, 0.079]) });
    const commands = createCommands(state, {
        nodeName: (i) => names[i],
        resultName: (id) => (id === "pagerank" ? "PageRank" : id),
        noun: ["family", "families"],
        nodeCount: 4,
        neighbors: (id, hops) => (hops === 0 ? [id] : [id, (id + 1) % 4]),
    });
    return { state, commands };
};
const src = { technique: "test" };

describe("commands", () => {
    it("names the step undo will undo, and undoes it", () => {
        const { state, commands } = setup();
        commands.run("colorBy", { result: "pagerank" }, src);
        expect(commands.undoLabel()).toBe("Undo: Color by PageRank");
        commands.undo(src);
        expect(state.colorBy).toBeNull();
        expect(commands.redoLabel()).toBe("Redo: Color by PageRank");
        commands.redo(src);
        expect(state.colorBy).toBe("pagerank");
    });

    it("keeps selection out of the history", () => {
        const { state, commands } = setup();
        commands.run("colorBy", { result: "pagerank" }, src);
        commands.run("select", { ids: [0] }, src);
        expect(commands.history.map((h) => h.label)).toEqual(["Color by PageRank"]);
        commands.undo(src);
        expect([...state.selection]).toEqual([0]);
    });

    it("labels a filter with what it keeps", () => {
        const { commands } = setup();
        expect(commands.label("filter", { result: "pagerank", op: ">=", value: 0.07 })).toBe(
            "Keep PageRank at least 0.070 (3 of 4)",
        );
        expect(commands.label("neighbors", { id: 0, hops: 1 })).toBe("Select Medici and 1 hop (1)");
        expect(commands.label("select", { ids: [0, 1] })).toBe("Select 2 families");
    });

    it("previews without touching the state; undo cancels an open preview only", () => {
        const { state, commands } = setup();
        commands.run("colorBy", { result: "pagerank" }, src);
        const p = commands.startPreview("filter", { result: "pagerank", op: ">=", value: 0.08 }, src);
        expect([...(commands.preview?.keep ?? [])]).toEqual([0, 1]);
        expect(state.filter).toBeNull();
        commands.undo(src);
        expect(commands.preview).toBeNull();
        expect(state.colorBy).toBe("pagerank");
        p.commit();
        expect(state.filter).toBeNull();
    });

    it("commits a preview as a history step", () => {
        const { state, commands } = setup();
        const p = commands.startPreview("filter", { result: "pagerank", op: ">=", value: 0.05 }, src);
        p.update({ result: "pagerank", op: ">=", value: 0.08 });
        p.commit();
        expect(state.filter?.value).toBe(0.08);
        expect(commands.undoLabel()).toBe("Undo: Keep PageRank at least 0.080 (2 of 4)");
    });

    it("undoes back to a chosen step", () => {
        const { state, commands } = setup();
        commands.run("run", { result: "pagerank" }, src);
        commands.run("colorBy", { result: "pagerank" }, src);
        commands.run("sizeBy", { result: "pagerank" }, src);
        commands.undoTo(1, src);
        expect(commands.history.length).toBe(1);
        expect(state.colorBy).toBeNull();
        expect(state.shown.has("pagerank")).toBe(true);
    });
});
