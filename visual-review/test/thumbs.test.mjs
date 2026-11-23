import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { scaled, SPOT_KINDS } from "../trusted/lib/thumbs.mjs";

import { png } from "./story-test-fakes.mjs";

describe("scaled", () => {
    it("scales a PNG in a child process to at most 400 pixels across", async () => {
        const { png: out } = await scaled(async () => png(90, 800, 600), "now");
        const image = PNG.sync.read(out);
        expect([image.width, image.height]).toEqual([400, 300]);
        expect(image.data[0]).toBe(90);
    });

    it("makes the spotlit and zoomed tiles of a changed pair, one per kind", async () => {
        const made = await scaled(
            async () => ({ baseline: png(0, 800, 600), capture: png(200, 800, 600), threshold: 0.1, includeAA: false }),
            "last",
        );
        expect(Object.keys(made).sort()).toEqual([...SPOT_KINDS].sort());
        for (const tile of Object.values(made)) {
            expect(PNG.sync.read(tile).width).toBe(400);
        }
    });

    it("rejects with what reading the input threw, and goes on with the next task", async () => {
        await expect(
            scaled(async () => {
                throw new Error("the image is gone");
            }),
        ).rejects.toThrow("the image is gone");
        expect(PNG.sync.read((await scaled(async () => png(10, 8, 8))).png).width).toBe(8);
    });

    it("rejects with the child's error for an input that is not a PNG, and goes on with the next task", async () => {
        await expect(scaled(async () => Buffer.from("not a png"))).rejects.toThrow(/./);
        expect(PNG.sync.read((await scaled(async () => png(10, 8, 8))).png).width).toBe(8);
    });
});
