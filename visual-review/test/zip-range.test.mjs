import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { referenceSubset } from "../trusted/lib/github.mjs";
import { artifactReader, zipEntries, zipEntry } from "../trusted/lib/zip-range.mjs";
import { copyFixture, fakeGh, tempDir } from "./helpers.mjs";

// A plain zip of every file under dir, stored or deflated by turns, the way upload-artifact writes one.
function zipOf(dir) {
    const walk = (d) =>
        readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const locals = [];
    const central = [];
    let offset = 0;
    walk(dir).forEach((path, i) => {
        const name = Buffer.from(relative(dir, path));
        const data = readFileSync(path);
        const method = i % 2 ? 8 : 0;
        const body = method ? deflateRawSync(data) : data;
        const head = Buffer.alloc(30);
        head.writeUInt32LE(0x04034b50, 0);
        head.writeUInt16LE(method, 8);
        head.writeUInt32LE(crc32(data), 14);
        head.writeUInt32LE(body.length, 18);
        head.writeUInt32LE(data.length, 22);
        head.writeUInt16LE(name.length, 26);
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0);
        cd.writeUInt16LE(method, 10);
        cd.writeUInt32LE(crc32(data), 16);
        cd.writeUInt32LE(body.length, 20);
        cd.writeUInt32LE(data.length, 24);
        cd.writeUInt16LE(name.length, 28);
        cd.writeUInt32LE(offset, 42);
        locals.push(head, name, body);
        central.push(cd, name);
        offset += 30 + name.length + body.length;
    });
    const cdBytes = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length / 2, 8);
    end.writeUInt16LE(central.length / 2, 10);
    end.writeUInt32LE(cdBytes.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cdBytes, end]);
}

const readerOf = (zip, reads = []) => ({
    size: zip.length,
    read: async (start, end) => {
        reads.push([start, end]);
        return zip.subarray(start, end);
    },
});

describe("zip range reads", () => {
    it("reads one entry without reading the rest", async () => {
        const { dir } = copyFixture("compact-mantine", join(tempDir("zip-"), "c"));
        const zip = zipOf(dir);
        const reads = [];
        const z = readerOf(zip, reads);
        const entries = await zipEntries(z.read, z.size);
        const json = await zipEntry(z.read, entries.get("results.json"));
        expect(JSON.parse(json.toString("utf8")).project).toBe("compact-mantine");
        const png = await zipEntry(z.read, entries.get("button--primary.dark.png"));
        expect(png.equals(readFileSync(join(dir, "button--primary.dark.png")))).toBe(true);
        expect(reads.reduce((n, [s, e]) => n + e - s, 0)).toBeLessThan(zip.length + 65557);
    });

    it("answers null for a file that is not a zip", async () => {
        const z = readerOf(Buffer.alloc(100));
        expect(await zipEntries(z.read, z.size)).toBeNull();
    });

    // A one-file zip of results.json, changed by `edit(zip, at)`, where `at` gives the offsets of
    // its central directory entry and its end record.
    const edited = (edit) => {
        const dir = tempDir("zip-one-");
        writeFileSync(join(dir, "results.json"), "{}");
        const zip = zipOf(dir);
        const eocd = zip.length - 22;
        edit(zip, { central: zip.readUInt32LE(eocd + 16), eocd });
        return readerOf(zip);
    };

    it("answers null for a zip64 archive and for a broken central directory", async () => {
        const zip64 = edited((zip, { eocd }) => zip.writeUInt16LE(0xffff, eocd + 10));
        expect(await zipEntries(zip64.read, zip64.size)).toBeNull();
        const bigEntry = edited((zip, { central }) => zip.writeUInt32LE(0xffffffff, central + 20));
        expect(await zipEntries(bigEntry.read, bigEntry.size)).toBeNull();
        const broken = edited((zip, { central }) => zip.writeUInt32LE(0, central));
        expect(await zipEntries(broken.read, broken.size)).toBeNull();
    });

    it("answers null for an encrypted entry, an unknown method, or an entry with no local header", async () => {
        const z = edited(() => undefined);
        const entry = (await zipEntries(z.read, z.size)).get("results.json");
        expect((await zipEntry(z.read, entry)).toString()).toBe("{}");
        expect(await zipEntry(z.read, { ...entry, flags: 1 })).toBeNull();
        expect(await zipEntry(z.read, { ...entry, method: 12 })).toBeNull();
        const moved = edited((zip) => zip.writeUInt32LE(0, 0));
        expect(await zipEntry(moved.read, entry)).toBeNull();
    });
});

describe("artifactReader", () => {
    // GitHub's archive URL: a redirect to a blob that serves byte ranges of `zip` (or answers `status`).
    const github = (zip, { location = "https://blob.test/a.zip", status = 206 } = {}) => {
        const calls = [];
        const fetchImpl = async (url, init) => {
            calls.push([url, init.headers]);
            if (url === "https://api.test/zip") {
                return { headers: new Headers(location ? { location } : {}), status: 302 };
            }
            const [, from, to] = /bytes=(\d+)-(\d+)/.exec(init.headers.range).map(Number);
            const body = zip.subarray(from, to + 1);
            return {
                status,
                headers: new Headers({ "content-range": `bytes ${from}-${to}/${zip.length}` }),
                arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.length),
            };
        };
        return { fetchImpl, calls };
    };

    it("follows the archive's redirect with the token and reads byte ranges of the blob", async () => {
        const zip = Buffer.from("0123456789");
        const { fetchImpl, calls } = github(zip);
        const reader = await artifactReader("https://api.test/zip", "tok", fetchImpl);
        expect(reader.size).toBe(10);
        expect((await reader.read(2, 5)).toString()).toBe("234");
        expect(calls[0]).toEqual(["https://api.test/zip", { authorization: "Bearer tok" }]);
        expect(calls.at(-1)).toEqual(["https://blob.test/a.zip", { range: "bytes=2-4" }]);
    });

    it("answers null with no redirect or a blob that does not serve ranges", async () => {
        const zip = Buffer.from("0123456789");
        expect(
            await artifactReader("https://api.test/zip", "tok", github(zip, { location: null }).fetchImpl),
        ).toBeNull();
        expect(await artifactReader("https://api.test/zip", "tok", github(zip, { status: 200 }).fetchImpl)).toBeNull();
    });

    it("fails a range read the blob does not answer with its range", async () => {
        const zip = Buffer.from("0123456789");
        const ok = github(zip);
        const reader = await artifactReader("https://api.test/zip", "tok", ok.fetchImpl);
        const expired = github(zip, { status: 403 });
        const stale = await artifactReader("https://api.test/zip", "tok", async (url, init) =>
            init.headers.range === "bytes=0-0" ? ok.fetchImpl(url, init) : expired.fetchImpl(url, init),
        );
        expect(reader).not.toBeNull();
        await expect(stale.read(0, 4)).rejects.toThrow("range 0-3 answered 403");
    });
});

describe("referenceSubset", () => {
    it("downloads results.json and only the images of new and unseeded items", async () => {
        const { dir } = copyFixture("compact-mantine", join(tempDir("zip-"), "c"));
        const zip = zipOf(dir);
        const gh = fakeGh({ artifacts: { 7: ["visual-compact-mantine-1"] } });
        const out = await referenceSubset(gh, { id: 7 }, "compact-mantine", tempDir("ref-"), async () => readerOf(zip));
        expect(readdirSync(out).sort()).toEqual(["badge--default.light.png", "results.json"]);
        expect(
            readFileSync(join(out, "badge--default.light.png")).equals(
                readFileSync(join(dir, "badge--default.light.png")),
            ),
        ).toBe(true);
    });

    it("answers false when the run has no capture of the project, and null when the reader cannot open it", async () => {
        const gh = fakeGh({ artifacts: { 7: ["visual-compact-mantine-1"] } });
        expect(await referenceSubset(gh, { id: 7 }, "graphty-element", tempDir("ref-"), async () => null)).toBe(false);
        expect(await referenceSubset(gh, { id: 7 }, "compact-mantine", tempDir("ref-"), async () => null)).toBeNull();
    });

    it("answers false for the not-affected marker, so the walk does not download it whole (#4318)", async () => {
        const dir = tempDir("marker-");
        writeFileSync(join(dir, "skipped.json"), "{}");
        const gh = fakeGh({ artifacts: { 7: ["visual-compact-mantine-1"] } });
        const zip = zipOf(dir);
        expect(
            await referenceSubset(gh, { id: 7 }, "compact-mantine", tempDir("ref-"), async () => readerOf(zip)),
        ).toBe(false);
    });
});
