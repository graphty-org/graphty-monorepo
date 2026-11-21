/**
 * @file Saved views that keep more than the camera: `views.save` with `include` reads the filter
 * conditions, the style layers, the hidden nodes and the positions once, `views.open` brings them
 * back as one undo step, the project file keeps them, and a view saved as before keeps only the
 * camera.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/**
 * A session with three nodes in a path, placed.
 * @returns The session.
 */
async function threeNodes(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    await session.positions.set([
        { id: "a", x: 1, y: 2, z: 3 },
        { id: "b", x: 4, y: 5, z: 6 },
        { id: "c", x: 7, y: 8, z: 9 },
    ]);
    return session;
}

/**
 * The layer names, bottom to top.
 * @param session - The session.
 * @returns The names.
 */
function layerNames(session: GraphSession): string[] {
    return session.styles.list().map((layer) => layer.name ?? "");
}

describe("saved views that keep filters, layers, hidden nodes and positions", () => {
    it("keeps only the camera when nothing is included, as before", async () => {
        const session = await threeNodes();
        await session.views.save([{ name: "plain", camera: { zoom: 2 } }]);
        assert.deepStrictEqual(session.views.get("plain"), { camera: { zoom: 2 } });
        session.dispose();
    });

    it("brings every included part back in one undo step", async () => {
        const session = await threeNodes();
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.visibility.setSteps([{ id: "s", on: true, rule: { kind: "degree", min: 2 } }]);
        await session.hidden.add(["c"]);
        await session.views.save([
            { name: "kept", camera: { zoom: 2 }, include: ["filters", "layers", "hidden", "positions"] },
        ]);

        // Change every part.
        await session.visibility.setSteps([]);
        await session.styles.add({
            name: "Blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });
        await session.hidden.remove(["c"]);
        await session.hidden.add(["a"]);
        await session.positions.set([{ id: "a", x: 100, y: 100, z: 100 }]);

        await session.views.open("kept");

        // The newest step is the open, and one undo takes every part back below.
        const step = session.history.steps.at(session.history.position - 1);
        assert.deepStrictEqual(step?.fact, {
            code: "view.open",
            params: { name: "kept", parts: ["filters", "layers", "hidden", "positions"] },
        });
        assert.deepStrictEqual(
            session.visibility.steps.map((each) => each.id),
            ["s"],
        );
        assert.include(layerNames(session), "Red");
        assert.notInclude(layerNames(session), "Blue");
        assert.deepStrictEqual([...session.hidden.ids], ["c"]);
        assert.deepStrictEqual(session.positions.get("a"), { x: 1, y: 2, z: 3 });

        await session.undo();
        assert.deepStrictEqual(session.visibility.steps, []);
        assert.include(layerNames(session), "Blue");
        assert.deepStrictEqual([...session.hidden.ids], ["a"]);
        assert.deepStrictEqual(session.positions.get("a"), { x: 100, y: 100, z: 100 });
        session.dispose();
    });

    it("reads the parts at the save, so a later change does not reach the view", async () => {
        const session = await threeNodes();
        await session.hidden.add(["b"]);
        await session.views.save([{ name: "v", camera: { zoom: 1 }, include: ["hidden"] }]);
        await session.hidden.add(["c"]);
        assert.deepStrictEqual(session.views.get("v")?.hidden, ["b"]);
        session.dispose();
    });

    it("skips a node the graph no longer holds when it puts positions back", async () => {
        const session = await threeNodes();
        await session.views.save([{ name: "v", camera: { zoom: 1 }, include: ["positions"] }]);
        await session.data.removeNodes(["c"]);
        await session.positions.set([{ id: "a", x: 0, y: 0, z: 0 }]);

        await session.views.open("v");
        assert.deepStrictEqual(session.positions.get("a"), { x: 1, y: 2, z: 3 });
        session.dispose();
    });

    it("records no step for a view that keeps only the camera", async () => {
        const session = await threeNodes();
        await session.views.save([{ name: "v", camera: { zoom: 1 } }]);
        const before = session.history.position;
        await session.views.open("v");
        assert.strictEqual(session.history.position, before);
        session.dispose();
    });

    it("refuses a part no view keeps, and a view nothing is saved under", async () => {
        const session = await threeNodes();
        try {
            await session.views.save([{ name: "v", camera: { zoom: 1 }, include: ["app" as never] }]);
            assert.fail("saved");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_OPTION_RANGE");
            assert.deepInclude(isGraphtyError(error) ? error.details : {}, { option: "include", value: "app" });
        }
        assert.isFalse(session.views.has("v"));

        try {
            await session.views.open("nope");
            assert.fail("opened");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
            assert.deepInclude(isGraphtyError(error) ? error.details : {}, { missing: ["nope"] });
        }
        session.dispose();
    });

    it("keeps the parts through the project file, and opens a file saved before they existed", async () => {
        const source = await threeNodes();
        await source.hidden.add(["b"]);
        await source.views.save([
            { name: "kept", camera: { zoom: 2 }, include: ["hidden", "positions"], legend: true },
            { name: "plain", camera: { zoom: 3 } },
        ]);
        const { text } = await source.project.save();

        const target = createGraphSession();
        await target.project.open(text);
        const kept = target.views.get("kept");
        assert.deepStrictEqual(kept?.hidden, ["b"]);
        assert.deepStrictEqual(kept?.positions?.order, ["a", "b", "c"]);
        assert.deepStrictEqual(kept?.positions?.xyz, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert.isTrue(kept?.legend);
        assert.deepStrictEqual(target.views.get("plain"), { camera: { zoom: 3, mode: "2d" } });
        source.dispose();
        target.dispose();
    });

    it("opens a view in work that grows with the graph, not faster", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession();
                const nodes = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` }));
                await session.data.addNodes(nodes);
                await session.positions.set(nodes.map((node, at) => ({ id: node.id, x: at, y: 0, z: 0 })));
                await session.hidden.add(nodes.filter((_, at) => at % 2 === 0).map((node) => node.id));
                await session.views.save([
                    { name: "v", camera: { zoom: 1 }, include: ["filters", "layers", "hidden", "positions"] },
                ]);
                await session.hidden.remove(nodes.map((node) => node.id));
                const visits = await visitsDuring(async () => {
                    await session.views.open("v");
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited by SessionViews.open" },
        );
    });
});
