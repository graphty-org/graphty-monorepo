/**
 * @file Two pasted shaders with the same program each get their answer.
 *
 * A parameter's default is not in a program's text, so a shader edited only there has the text of
 * the one before it. The engine files an effect by its text and defines, and for an effect it
 * already holds it never calls the `onCompiled` of a compile given as options: sharing one left the
 * second shader unanswered and every compile queued behind it waiting for ever, which froze the
 * code dialog's preview on its first picture.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { drawnFrames } from "../../helpers/drawn-frames";

/** The most frames a shader is given to answer in. */
const FRAMES = 600;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A pasted shader's text.
 * @param id - Its id.
 * @param tint - Its parameter's default.
 * @returns The text.
 */
function shaderText(id: string, tint: string): string {
    return `/* graphty-shader 1
{ "id": "${id}", "name": "Tinted", "params": [ { "name": "tint", "type": "color", "default": "${tint}" } ] }
*/
vec4 shade(NodeInput n) {
    return vec4(tint, 1.0);
}
`;
}

/**
 * A mounted element with a node.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "200px";
    element.style.height = "150px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
        element.graph.dispose();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Add a shader and require its answer within a count of drawn frames.
 * @param element - The element.
 * @param text - The shader's text.
 */
async function answered(element: Graphty, text: string): Promise<void> {
    let done = false;
    const adding = element.session.shaders.add(text).then((added) => {
        done = true;
        return added;
    });
    for (let i = 0; i < FRAMES && !done; i++) {
        await drawnFrames(element.graph.getScene(), 1);
    }

    assert.isTrue(done, "the shader got its answer");
    const added = await adding;
    assert.isTrue(added.ok, JSON.stringify(added));
}

/**
 * The bytes of a picture.
 * @param picture - A thumbnail's answer.
 * @returns Its bytes.
 */
async function bytesOf(picture: unknown): Promise<number[]> {
    if (!(picture instanceof Blob)) {
        throw new TypeError(`no picture: ${JSON.stringify(picture)}`);
    }

    return [...new Uint8Array(await picture.arrayBuffer())];
}

describe("two pasted shaders with one program", () => {
    it("answers both, and each pictures its own default", async () => {
        const element = await mounted();
        await answered(element, shaderText("user/orange", "#FFAA00"));
        await answered(element, shaderText("user/blue", "#0055FF"));
        assert.strictEqual(element.session.shaders.status("user/orange").state, "ready");
        assert.strictEqual(element.session.shaders.status("user/blue").state, "ready");
        const [orange, blue] = await Promise.all([
            element.session.shaders.thumbnail("user/orange"),
            element.session.shaders.thumbnail("user/blue"),
        ]);
        assert.notDeepEqual(await bytesOf(orange), await bytesOf(blue));
    });
});
