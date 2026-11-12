/**
 * @file A model missing a part, drawn once the part is supplied (design/rendering/node-models.md
 * sections 12.4 and 13.8): police.glb names its picture as the separate file
 * Textures/colormap.png, as a Kenney car kit's GLB does. The layer naming it keeps its node's
 * shape until the picture is handed over -- as a file, from a URL on the page's own server, or
 * skipped -- and then draws it, with no new call, under the same ref.
 */

import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import policeUrl from "../fixtures/models/police.glb?url";
import colormapUrl from "../fixtures/models/Textures/colormap.png?url";
import { drawnAsModel, modelEvents, mount, nextModelEvent, stubFetch } from "./models/helpers";

const PART = "Textures/colormap.png";

/**
 * A fixture's bytes, from the test server.
 * @param url - Its URL.
 * @returns The bytes.
 */
async function bytesOf(url: string): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

/**
 * An element with one node whose layer names police.glb, rejected for its missing picture.
 * @param ref - What the layer names: a URL to fetch, or none to add police.glb as a dropped file.
 * @returns The element, what the layer names, and the events fired from then on.
 */
async function waiting(ref?: string) {
    const element = await mount();
    await element.graph.addNodes([{ id: "car" }]);
    const named = ref ?? (await element.session.assets.add(new File([await bytesOf(policeUrl)], "police.glb"))).id;
    const events = modelEvents(element);
    const rejected = nextModelEvent(element, (change) => change.ref === named && change.state === "rejected");
    await element.session.styles.add({
        name: "police",
        target: "node",
        selector: { match: "everything" },
        set: { "node.model": named },
    });
    const change = await rejected;
    assert.deepEqual(
        change.problems.map((p) => [p.code, p.params.name, p.params.role, p.params.optional]),
        [["E_MODEL_MISSING_FILE", PART, "texture", true]],
    );
    await operationQueueOf(element.graph).waitForCompletion();
    assert.isFalse(drawnAsModel(element.graph, "car"), "the node keeps its shape while the picture is missing");
    events.length = 0;
    return { element, ref: named, events };
}

describe("a model missing its picture draws once the picture is supplied", () => {
    it("by a file matched by its base name: pending, accepted, drawn under the same ref", async () => {
        const { element, ref, events } = await waiting();
        const drawn = nextModelEvent(element, (change) => change.ref === ref && change.state === "drawn");
        const accepted = await element.session.assets.supply(ref, {
            file: new File([await bytesOf(colormapUrl)], "colormap.png"),
        });
        assert.equal(accepted.state, "accepted", JSON.stringify(accepted.problems));
        const change = await drawn;
        assert.equal(change.id, accepted.id, "the drawn model is the one with its picture");
        assert.deepEqual(
            events.map((each) => [each.ref, each.state]),
            [
                [ref, "pending"],
                [ref, "accepted"],
                [ref, "drawn"],
            ],
        );
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "car"));
    });

    it("by a URL on the main file's own server, fetched at once", async () => {
        // The main file is answered where its picture is not beside it; the picture is the real
        // file on the test server, the same origin.
        const main = `${location.origin}/supply-test/kit/police.glb`;
        stubFetch(new Map([[main, await bytesOf(policeUrl)]]));
        const { element, events } = await waiting(main);
        const drawn = nextModelEvent(element, (change) => change.ref === main && change.state === "drawn");
        const accepted = await element.session.assets.supply(main, {
            name: PART,
            url: new URL(colormapUrl, location.href).href,
        });
        assert.equal(accepted.state, "accepted", JSON.stringify(accepted.problems));
        await drawn;
        assert.deepEqual(
            events.map((each) => each.state),
            ["pending", "accepted", "drawn"],
        );
        assert.lengthOf(element.session.network.pending(), 0, "nothing was asked");
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "car"));
    });

    it("skipped: drawn without it, saying so", async () => {
        const { element, ref } = await waiting();
        const drawn = nextModelEvent(element, (change) => change.ref === ref && change.state === "drawn");
        await element.session.assets.supply(ref, { name: PART, skip: true });
        const change = await drawn;
        assert.deepInclude(change.problems, { code: "W_MODEL_PART_SKIPPED", params: { name: PART, role: "texture" } });
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "car"));
    });
});
