/**
 * @file A project file carries its models (`graphty-assets`, design/documents/assets.md): saved
 * from one element and opened in a fresh one with the network blocked, a GLB and a glTF with its
 * .bin and texture draw again, and a model whose bytes were changed in the file keeps its node's
 * shape and says why.
 */

import { assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { sphereGlb, texturedGltfSet } from "../../fixtures/models/fixtures";
import { cleanups, drawnAsModel, mount, nextModelEvent, stubFetch } from "./helpers";

/**
 * Refuse every request that leaves this page's origin, and record every request made.
 * @returns The URLs requested.
 */
function blockNetwork(): string[] {
    const requested: string[] = [];
    const original = globalThis.fetch.bind(globalThis);
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input), location.href);
        requested.push(url.href);
        if (url.origin !== location.origin && url.protocol !== "data:" && url.protocol !== "blob:") {
            return Promise.reject(new TypeError("network blocked by the test"));
        }

        return original(input, init);
    });
    cleanups.push(() => {
        spy.mockRestore();
    });
    return requested;
}

/**
 * Save a project whose node a draws a GLB and node b a glTF with its .bin and texture.
 * @returns The file's text and the two ids.
 */
async function savedProject(): Promise<{ text: string; glbId: string; gltfId: string }> {
    const element = await mount();
    await element.graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const glb = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(16, 8)]]) });
    const gltf = await element.session.assets.add({ files: texturedGltfSet() });
    assert.equal(glb.state, "accepted", JSON.stringify(glb.problems));
    assert.equal(gltf.state, "accepted", JSON.stringify(gltf.problems));
    for (const [node, id] of [
        ["a", glb.id],
        ["b", gltf.id],
    ]) {
        await element.session.styles.add({
            name: `model on ${node}`,
            target: "node",
            selector: { match: "ids", nodes: [node] },
            set: { "node.model": id },
        });
    }

    const { text } = await element.session.project.save();
    element.remove();
    return { text, glbId: glb.id, gltfId: gltf.id };
}

describe("a project file carries its models", () => {
    it("draws a GLB and a glTF with its .bin and texture in a fresh element with the network blocked", async () => {
        const { text, glbId, gltfId } = await savedProject();
        const requested = blockNetwork();
        const element = await mount();
        const drawn = Promise.all(
            [glbId, gltfId].map((id) =>
                nextModelEvent(element, (change) => change.ref === id && change.state === "drawn"),
            ),
        );

        const report = await element.session.project.open(text, { discard: true });
        assert.deepEqual(report.problems, []);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();

        assert.isTrue(drawnAsModel(element.graph, "a"), "a draws the GLB");
        assert.isTrue(drawnAsModel(element.graph, "b"), "b draws the glTF");
        assert.isFalse(drawnAsModel(element.graph, "c"), "c keeps its shape");
        assert.deepEqual(
            requested.filter((url) => /\.(glb|gltf|bin|png)$/i.test(new URL(url).pathname)),
            [],
            "no model file was requested",
        );
        assert.deepEqual(
            requested.filter((url) => new URL(url).origin !== location.origin && !/^(data|blob):/.test(url)),
            [],
            "nothing left the page's origin",
        );
    });

    it("keeps the shape of a node whose model was changed in the file, and reports the code", async () => {
        const { text, glbId, gltfId } = await savedProject();
        const document = JSON.parse(text) as {
            members: { kind: string; assets?: { id: string; files?: { path: string; data: string }[] }[] }[];
        };
        const member = document.members.find((each) => each.kind === "graphty-assets");
        const file = member?.assets?.find((entry) => entry.id === gltfId)?.files?.find((f) => f.path === "tri.bin");
        assert.isDefined(file);
        const bytes = Uint8Array.from(atob(file?.data ?? ""), (char) => char.charCodeAt(0));
        bytes[0] ^= 0xff;
        (file as { data: string }).data = btoa(String.fromCharCode(...bytes));

        const element = await mount();
        const drawn = nextModelEvent(element, (change) => change.ref === glbId && change.state === "drawn");
        const refused = nextModelEvent(element, (change) => change.ref === gltfId && change.state === "rejected");
        const report = await element.session.project.open(JSON.stringify(document), { discard: true });
        assert.deepEqual(
            report.problems.map((problem) => [problem.code, problem.params.id]),
            [["E_MODEL_DIGEST_MISMATCH", gltfId]],
        );
        await drawn;
        assert.equal((await refused).problems[0]?.code, "E_MODEL_UNKNOWN_ASSET");
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "a"));
        assert.isFalse(drawnAsModel(element.graph, "b"), "b keeps its shape");
    });

    it("draws a URL model from the file's embedded copy, asking nothing and fetching nothing", async () => {
        const url = "https://models.example.com/kit/ball.glb";
        stubFetch(new Map([[url, sphereGlb(16, 8)]]));
        const saver = await mount();
        await saver.graph.addNodes([{ id: "a" }]);
        await saver.session.styles.add({
            name: "by url",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": url },
        });
        assert.equal((await saver.session.assets.ready(url)).state, "accepted");
        const { text } = await saver.session.project.save();
        saver.remove();

        const requested = blockNetwork();
        const element = await mount();
        const asked: unknown[] = [];
        element.session.on("network:pending", (request) => asked.push(request));
        const drawn = nextModelEvent(element, (change) => change.ref === url && change.state === "drawn");
        await element.session.project.open(text, { discard: true });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "a"));
        assert.deepEqual(asked, [], "the embedded copy wins over the URL");
        assert.notInclude(requested, url);
    });
});
