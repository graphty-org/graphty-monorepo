import type { PointerInfoPre, Scene } from "@babylonjs/core";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
import { assert, describe, test, vi } from "vitest";

/** The hover reads in flight, oldest first, each settled by hand. */
const { reads } = vi.hoisted(() => ({
    reads: [] as ((id: string | undefined) => void)[],
}));

// Every hover answers late, as WebGPU's node ID target does once a read takes several frames.
vi.mock("../../src/render/PickService", () => ({
    filterPointerPicks: (): void => undefined,
    pickNodeId: (): undefined => undefined,
    hoverNodeId: (): Promise<{ id: string | undefined }> =>
        new Promise((resolve) => {
            reads.push((id) => {
                resolve({ id });
            });
        }),
}));

const { nodePointerRosterOf } = await import("../../src/NodeBehavior");

/**
 * A scene with just what the roster's observers use, and a way to send it a pointer move.
 * @returns The scene and the move sender.
 */
function fakeScene(): { scene: Scene; move: () => void } {
    let pre: ((info: PointerInfoPre) => void) | undefined;
    const scene = {
        pointerX: 10,
        pointerY: 10,
        metadata: undefined,
        onPrePointerObservable: {
            add: (callback: (info: PointerInfoPre) => void): void => {
                pre = callback;
            },
        },
        onPointerObservable: { add: (): void => undefined },
        getEngine: () => ({ getInputElement: (): null => null }),
    } as unknown as Scene;
    return {
        scene,
        move: () => {
            pre?.({ type: PointerEventTypes.POINTERMOVE } as PointerInfoPre);
        },
    };
}

/** Let settled reads' callbacks run. */
async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("a hover answered after newer pointer moves (#8016)", () => {
    test("a pointer that keeps moving hears each answer late, never an older one over a newer one", async () => {
        reads.length = 0;
        const { scene, move } = fakeScene();
        const roster = nodePointerRosterOf(scene);

        move();
        move();
        move();
        assert.strictEqual(reads.length, 3);

        // The first move's answer lands after two newer moves: it is still heard.
        reads[0]("a");
        await settle();
        assert.strictEqual(roster.overId, "a");

        // The newest answer lands next and replaces it.
        reads[2]("c");
        await settle();
        assert.strictEqual(roster.overId, "c");

        // The middle answer lands last: older than one already heard, so it is dropped.
        reads[1]("b");
        await settle();
        assert.strictEqual(roster.overId, "c");

        // A newer move's answer, even "nothing under the pointer", is heard.
        move();
        reads[3](undefined);
        await settle();
        assert.strictEqual(roster.overId, undefined);
    });
});
