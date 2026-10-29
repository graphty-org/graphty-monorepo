import { assert, describe, it } from "vitest";

import { PendingWork } from "../../src/managers/PendingWork";

describe("PendingWork", () => {
    it("is idle until work starts, and names the first thing pending", () => {
        const work = new PendingWork();
        let loading = false;
        work.watch("basemap", "the map is loading", () => loading);
        assert.isTrue(work.idle);

        loading = true;
        assert.isFalse(work.idle);
        assert.equal(work.firstPending()?.reason, "the map is loading");

        const release = work.begin("picture", "a picture is loading");
        // An open token is named before a watch.
        assert.equal(work.firstPending()?.kind, "picture");
        release();
        loading = false;
        assert.isTrue(work.idle);
    });

    it("moves the picture counter when work lands, once per token", () => {
        const work = new PendingWork();
        let heard = 0;
        work.onChange(() => heard++);
        const release = work.begin("picture", "a picture is loading");
        const before = work.epoch;

        release();
        release();
        assert.equal(work.epoch, before + 1);
        assert.equal(heard, 1);
    });

    it("holds a token while a promise runs, also when it rejects", async () => {
        const work = new PendingWork();
        let fail!: (error: Error) => void;
        const tracked = work.track("load", "a download", new Promise<never>((_resolve, reject) => (fail = reject)));
        assert.isFalse(work.idle);

        fail(new Error("offline"));
        try {
            await tracked;
            assert.fail("the rejection is passed on");
        } catch (error) {
            assert.equal((error as Error).message, "offline");
        }

        assert.isTrue(work.idle);
    });

    it("keeps wait-only work out of the picture's answer", () => {
        const work = new PendingWork();
        work.watch("operation", "a queued operation", () => true, "wait");
        assert.isTrue(work.idle);
        assert.isNull(work.firstPending("picture"));
        assert.equal(work.firstPending("wait")?.kind, "operation");
    });
});
