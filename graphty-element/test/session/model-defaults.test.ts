/**
 * A model's own settings (`session.assets.setDefaults`): stored on its record, one undoable step,
 * joined into a transaction through `tx.assets`, checked against each channel, saved with the
 * project and refused there when they are not a model's settings. And `session.assets.accept`
 * takes a model waiting for its pictures without them, but never without its geometry.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { gltfPair, objSet, triangleGltf } from "../fixtures/models/fixtures";

/**
 * A session holding one triangle model.
 * @returns The session and the model's id.
 */
async function withModel(): Promise<{ session: GraphSession; id: string }> {
    const session = createGraphSession({ workingGraph: false });
    const record = await session.assets.add({ files: gltfPair() });
    assert.strictEqual(record.state, "accepted");
    return { session, id: record.id };
}

/**
 * What a rejected promise rejected with.
 * @param promise - The promise.
 * @returns The error's code.
 */
async function codeOf(promise: Promise<unknown>): Promise<string> {
    const error = await promise.then(
        () => assert.fail("it was accepted"),
        (e: unknown) => e,
    );
    return (error as { code: string }).code;
}

describe("session.assets.setDefaults", () => {
    it("stores the values on the record, and a value of undefined takes it out", async () => {
        const { session, id } = await withModel();
        const set = await session.assets.setDefaults(id, {
            style: { "node.modelTurn": 90, "node.modelAnimation": "walk" },
            hiddenTextures: ["wood.png"],
        });
        assert.deepEqual(set.defaults, {
            style: { "node.modelTurn": 90, "node.modelAnimation": "walk" },
            hiddenTextures: ["wood.png"],
        });
        assert.deepEqual(session.assets.find(id)?.defaults, set.defaults);

        await session.assets.setDefaults(id, { style: { "node.modelAnimation": undefined } });
        assert.deepEqual(session.assets.find(id)?.defaults, {
            style: { "node.modelTurn": 90 },
            hiddenTextures: ["wood.png"],
        });

        await session.assets.setDefaults(id, { style: { "node.modelTurn": undefined }, hiddenTextures: [] });
        assert.isUndefined(session.assets.find(id)?.defaults, "nothing left is no settings");
        session.dispose();
    });

    it("refuses an unknown model, a channel that is not a model's and a value its channel does not take", async () => {
        const { session, id } = await withModel();
        assert.strictEqual(
            await codeOf(session.assets.setDefaults("asset:nothing", { style: { "node.modelTurn": 1 } })),
            "E_MODEL_UNKNOWN_ASSET",
        );
        const notModel = { style: { "node.color": "#ff0000" } } as unknown as Parameters<
            GraphSession["assets"]["setDefaults"]
        >[1];
        assert.strictEqual(await codeOf(session.assets.setDefaults(id, notModel)), "E_BAD_COMMAND");
        assert.strictEqual(
            await codeOf(session.assets.setDefaults(id, { style: { "node.modelFit": "sideways" } })),
            "E_BAD_COMMAND",
        );
        assert.isUndefined(session.assets.find(id)?.defaults);
        session.dispose();
    });

    it("is one history step, which undo and redo take back and put again", async () => {
        const { session, id } = await withModel();
        const steps = session.history.steps.length;
        await session.assets.setDefaults(id, { style: { "node.modelTurn": 90 } });
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepEqual(session.history.steps.at(-1)?.fact, { code: "asset.defaults", params: { id } });

        await session.undo();
        assert.isUndefined(session.assets.find(id)?.defaults);
        await session.redo();
        assert.deepEqual(session.assets.find(id)?.defaults?.style, { "node.modelTurn": 90 });
        session.dispose();
    });

    it("joins a transaction through tx.assets, with the layer naming the model", async () => {
        const { session, id } = await withModel();
        const steps = session.history.steps.length;
        await session.transaction("Add a model", async (tx) => {
            await tx.assets.setDefaults(id, { style: { "node.modelTurn": 45 } });
            await tx.styles.add({
                name: "model",
                target: "node",
                selector: { match: "everything" },
                set: { "node.model": id },
            });
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one step");
        await session.undo();
        assert.isUndefined(session.assets.find(id)?.defaults);
        assert.isFalse(session.styles.list().some((layer) => layer.name === "model"));
        session.dispose();
    });
});

describe("a model's settings in a project file", () => {
    it("are saved and opened again, adding no history step, and bad ones are refused at /defaults", async () => {
        const { session, id } = await withModel();
        await session.assets.setDefaults(id, { style: { "node.modelTurn": 90 }, hiddenTextures: ["a.png"] });
        const { text } = await session.project.save();

        const opened = createGraphSession({ workingGraph: false });
        const report = await opened.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.deepEqual(opened.assets.find(id)?.defaults, {
            style: { "node.modelTurn": 90 },
            hiddenTextures: ["a.png"],
        });
        assert.notInclude(
            opened.history.steps.map((step) => step.fact.code),
            "asset.defaults",
            "opening is not a step to undo",
        );

        const file = JSON.parse(text) as { members: { kind: string; assets?: { defaults?: unknown }[] }[] };
        const member = file.members.find((m) => m.kind === "graphty-assets");
        assert.isDefined(member?.assets?.[0]);
        member.assets[0].defaults = { style: { "node.modelTurn": "north" }, hiddenTextures: [] };
        const refused = createGraphSession({ workingGraph: false });
        const bad = await refused.project.open(JSON.stringify(file));
        assert.deepInclude(
            bad.problems.map((p) => p.params),
            { kind: "graphty-assets", pointer: "/assets/0/defaults" },
        );
        for (const each of [session, opened, refused]) {
            each.dispose();
        }
    });
});

describe("session.assets.accept without missing parts", () => {
    it("accepts an OBJ waiting for its picture with the picture skipped, still found by its waiting id", async () => {
        const session = createGraphSession({ workingGraph: false });
        const files = objSet();
        files.delete("tex.png");
        const waiting = await session.assets.add({ files });
        assert.strictEqual(waiting.state, "rejected");
        const accepted = await session.assets.accept(waiting.id, { without: "missing" });
        assert.strictEqual(accepted.state, "accepted");
        assert.deepEqual(accepted.skipped, ["tex.png"]);
        assert.strictEqual(session.assets.find(waiting.id)?.id, accepted.id);
        session.dispose();
    });

    it("refuses a model missing its geometry, skipping nothing, and an unknown model", async () => {
        const session = createGraphSession({ workingGraph: false });
        const files = gltfPair(
            triangleGltf({
                materials: [{ name: "painted", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
                textures: [{ source: 0 }],
                images: [{ uri: "wood.png" }],
            }),
        );
        files.delete("tri.bin");
        const waiting = await session.assets.add({ files });
        assert.strictEqual(waiting.state, "rejected");
        assert.strictEqual(
            await codeOf(session.assets.accept(waiting.id, { without: "missing" })),
            "E_MODEL_PART_REQUIRED",
        );
        assert.strictEqual(session.assets.find(waiting.id)?.state, "rejected");
        assert.isUndefined(session.assets.find(waiting.id)?.skipped);
        assert.strictEqual(
            await codeOf(session.assets.accept("asset:nothing", { without: "missing" })),
            "E_MODEL_UNKNOWN_ASSET",
        );
        session.dispose();
    });
});

describe("session.assets.dropPart", () => {
    it("reads a model again without one part handed over, which it then waits for", async () => {
        const session = createGraphSession({ workingGraph: false });
        const whole = await session.assets.add({ files: objSet() });
        assert.strictEqual(whole.state, "accepted");
        const again = await session.assets.dropPart(whole.id, "tex.png");
        assert.strictEqual(again.state, "rejected");
        assert.strictEqual(again.parts?.find((p) => p.name === "tex.png")?.state, "missing");
        assert.strictEqual(session.assets.find(whole.id)?.state, "accepted", "the model as it was stays");
        assert.strictEqual(await codeOf(session.assets.dropPart(whole.id, "quad.obj")), "E_BAD_COMMAND");
        assert.strictEqual(await codeOf(session.assets.dropPart(whole.id, "nothing.png")), "E_BAD_COMMAND");
        assert.strictEqual(await codeOf(session.assets.dropPart("asset:nothing", "tex.png")), "E_MODEL_UNKNOWN_ASSET");
        session.dispose();
    });
});
