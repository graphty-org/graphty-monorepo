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

    it("holds a wait-only token while a promise runs (issue #4219)", async () => {
        const work = new PendingWork();
        let done!: () => void;
        const tracked = work.track(
            "style",
            "suggested layers",
            new Promise<void>((resolve) => (done = resolve)),
            "wait",
        );
        assert.isTrue(work.idle, "a wait token does not hold the frame");
        assert.equal(work.firstPending("wait")?.reason, "suggested layers");

        done();
        await tracked;
        assert.isNull(work.firstPending("wait"));
    });

    it("settles once every wait token is released and every awaitable wait entry is done (issue #4219)", async () => {
        const work = new PendingWork();
        const order: string[] = [];
        let queued = 2;
        // An awaitable entry: the queue drains one operation per settle it is asked for.
        work.watch(
            "operation",
            "queued operations",
            () => queued > 0,
            "wait",
            () => {
                queued--;
                order.push(`drained to ${String(queued)}`);
                return Promise.resolve();
            },
        );
        // Entries settled() leaves to frames: picture work, and wait work with no promise.
        work.watch("layout", "the layout is running", () => true);
        work.watch("labels", "the label counts", () => true, "wait");
        work.begin("picture", "a tile is loading");

        let releaseLoad!: () => void;
        void work.track(
            "load",
            "a held load",
            new Promise<void>((resolve) => (releaseLoad = resolve)).then(() => {
                order.push("load released");
            }),
            "wait",
        );

        let settled = false;
        const wait = work.settled().then(() => {
            settled = true;
        });
        await Promise.resolve();
        assert.isFalse(settled, "an open wait token holds it");
        assert.deepEqual(order, []);

        releaseLoad();
        await wait;
        assert.deepEqual(order, ["load released", "drained to 1", "drained to 0"]);
    });
});
