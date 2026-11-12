/**
 * A reloaded tab gets its own entry's lock even when the page it replaces has not let go of it
 * yet, and a duplicated tab never takes it from its live original. The holder here is a frame of
 * the same origin, which shares the page's Web Locks: removing the frame is the old page going away.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { browserEnvironment, HANDOFF_MS } from "../../../src/autosave/elementAutosave";

const frames: HTMLIFrameElement[] = [];

afterEach(() => {
    vi.useRealTimers();
    for (const frame of frames.splice(0)) {
        frame.remove();
    }
});

/**
 * A frame that takes a lock and holds it until it is removed, and never answers who holds it.
 * @param name - The lock.
 * @returns The frame, once it holds the lock.
 */
async function holder(name: string): Promise<HTMLIFrameElement> {
    const frame = document.createElement("iframe");
    const held = new Promise<void>((resolve) => {
        const heard = (event: MessageEvent<unknown>): void => {
            if (event.data === `held ${name}`) {
                window.removeEventListener("message", heard);
                resolve();
            }
        };
        window.addEventListener("message", heard);
    });
    frame.srcdoc = `<script>navigator.locks.request(${JSON.stringify(name)}, () => {
        parent.postMessage(${JSON.stringify(`held ${name}`)}, "*");
        return new Promise(() => {});
    });</script>`;
    document.body.append(frame);
    frames.push(frame);
    await held;
    return frame;
}

/**
 * The next time a page asks who holds a lock.
 * @param name - The lock.
 * @returns The channel the ask came on, to answer on.
 */
function asked(name: string): Promise<BroadcastChannel> {
    const channel = new BroadcastChannel("graphty-autosave-locks");
    return new Promise((resolve) => {
        channel.onmessage = (event: MessageEvent<{ ask?: string }>) => {
            if (event.data.ask === name) {
                resolve(channel);
            }
        };
    });
}

describe("the autosave lock handoff after a reload", () => {
    it("takes the lock once the page holding it goes, and keeps it for this page", async () => {
        const name = `handoff-${crypto.randomUUID()}`;
        const frame = await holder(name);
        const ask = asked(name);
        const own = browserEnvironment().locks.own?.(name);
        const channel = await ask;
        // Nobody answers: the holder is a page on its way out. It goes.
        frame.remove();
        assert.isTrue(await own, "the reloaded page owns its lock");
        channel.close();
        const { held } = await navigator.locks.query();
        assert.isTrue(
            held?.some((lock) => lock.name === name),
            "the lock is held for this page's element",
        );
    });

    it("leaves the lock to a live page that says it holds it", async () => {
        const name = `handoff-${crypto.randomUUID()}`;
        await holder(name);
        const ask = asked(name);
        const own = browserEnvironment().locks.own?.(name);
        const channel = await ask;
        channel.postMessage({ held: name });
        assert.isFalse(await own, "a duplicated tab does not own its original's lock");
        channel.close();
    });

    it("gives up on a holder that neither lets go nor answers", async () => {
        const name = `handoff-${crypto.randomUUID()}`;
        await holder(name);
        // The bound is stepped on a fake clock, not waited out.
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const ask = asked(name);
        const own = browserEnvironment().locks.own?.(name);
        const channel = await ask;
        vi.advanceTimersByTime(HANDOFF_MS);
        assert.isFalse(await own, "a silent holder keeps its lock");
        channel.close();
    });
});
