/**
 * Removing graphty-element from the page stops the model downloads it started (#10329): the
 * request is aborted, the waiting `add` settles as stopped, and the element inserted again
 * downloads the same URL afresh.
 */

import { assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import type { ProgressChange } from "../../../src/session/shared";
import { cleanups, filesOf, mount } from "./helpers";

describe("removing the element", () => {
    it("aborts a model download it started, settles it as stopped, and downloads it again once re-added", async () => {
        const [bytes] = (await filesOf("glb")).values();
        const url = "https://models.example.com/remove/stalled.glb";
        let requests = 0;
        let aborted = false;
        const spy = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
            requests++;
            const first = requests === 1;
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(bytes.slice(0, 8));
                    if (!first) {
                        controller.enqueue(bytes.slice(8));
                        controller.close();
                        return;
                    }

                    // The first answer sends 8 bytes and then nothing, until the download is stopped.
                    init?.signal?.addEventListener("abort", () => {
                        aborted = true;
                        controller.error(new DOMException("stopped", "AbortError"));
                    });
                },
            });
            return Promise.resolve(new Response(body, { status: 200 }));
        });
        cleanups.push(() => {
            spy.mockRestore();
        });

        const element = await mount();
        const heard: ProgressChange[] = [];
        let begun: () => void = () => undefined;
        const started = new Promise<void>((resolve) => {
            begun = resolve;
        });
        // No signal: before #10329 nothing but `accept` could stop this download.
        const adding = element.session.assets.add(url, {
            onProgress: (change) => {
                heard.push(change);
                if (change.phase === "progress" && change.completed === 8) {
                    begun();
                }
            },
        });
        await started;

        element.remove();
        const error = await adding.catch((e: unknown) => e);
        assert.instanceOf(error, DOMException);
        assert.strictEqual(error.name, "AbortError");
        assert.isTrue(aborted, "the request was aborted");
        assert.deepInclude(heard.at(-1), { phase: "end", outcome: "canceled" });

        // Inserted again, the element holds a working asset state and fetches the URL afresh.
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        const again = await element.session.assets.add(url);
        assert.strictEqual(again.state, "accepted", JSON.stringify(again.problems));
        assert.strictEqual(requests, 2, "the stopped download was fetched again");
    });
});
