/**
 * A zip written by a streaming zipper (Finder's Compress, Java's ZipOutputStream) declares no
 * sizes in its local headers; its entries must unzip like any other.
 */
import { Zip, ZipPassThrough } from "fflate";
import { assert, describe, it } from "vitest";

import { unzipModel } from "../../src/session/assets/unzip";

function streamedZip(files: Record<string, Uint8Array>): Uint8Array {
    const out: Uint8Array[] = [];
    const zip = new Zip((error, chunk) => {
        if (error) {
            throw error;
        }
        out.push(chunk);
    });
    for (const [name, data] of Object.entries(files)) {
        const entry = new ZipPassThrough(name);
        zip.add(entry);
        entry.push(data, true);
    }
    zip.end();
    const total = out.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const chunk of out) {
        bytes.set(chunk, at);
        at += chunk.length;
    }
    return bytes;
}

describe("unzipModel with data descriptors", () => {
    it("unzips an entry over 1,024 bytes whose header declares no size", async () => {
        const data = Uint8Array.from({ length: 4096 }, (_, i) => (i * 7919) % 251);
        const zip = streamedZip({ "kit/model.bin": data });
        // Bit 3 of the general-purpose flags: sizes follow the data.
        assert.strictEqual(zip[6] & 0x08, 0x08);
        const files = await unzipModel(zip, 1 << 20);
        assert.deepEqual([...(files.get("kit/model.bin") ?? [])], [...data]);
    });
});
