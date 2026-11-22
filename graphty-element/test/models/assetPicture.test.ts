/**
 * @file `pictureAddress`: every node that names an image asset still on its way draws none and draws again once it
 * is held, not only the first node that asked.
 */
import { assert, describe, it } from "vitest";

import { pictureAddress } from "../../src/models/assetPicture";

describe("pictureAddress", () => {
    it("waits every node naming one pending asset, and calls each once it is ready", async () => {
        let resolve: () => void = () => undefined;
        const ready = new Promise<void>((done) => {
            resolve = done;
        });
        let accepted = false;
        const session = {
            assets: {
                find: () => ({ id: "a1", state: accepted ? "accepted" : "pending", kind: "image" }),
                files: () => new Map([["p.png", new Uint8Array([1, 2, 3])]]),
                ready: () => ready,
            },
        };
        const called: string[] = [];
        assert.isNull(pictureAddress(session, "asset:a1", () => called.push("first")));
        assert.isNull(
            pictureAddress(session, "asset:a1", () => called.push("second")),
            "the second node waits too",
        );

        accepted = true;
        resolve();
        await ready;
        await Promise.resolve();
        assert.deepEqual(called, ["first", "second"]);
        assert.match(pictureAddress(session, "asset:a1", () => called.push("third")) ?? "", /^blob:/);
    });

    it("hands a URL back as it is", () => {
        assert.strictEqual(
            pictureAddress({}, "https://example.com/p.png", () => undefined),
            "https://example.com/p.png",
        );
    });
});
