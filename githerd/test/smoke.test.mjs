import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PACKAGE_DIR, readVersion } from "../lib/version.mjs";

const BIN = fileURLToPath(new URL("../bin/githerd.mjs", import.meta.url));
const OWN_VERSION = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")).version;

describe("readVersion", () => {
    let dir;
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "githerd-version-"));
        writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "1.2.3" }));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("prefers version.json over package.json", () => {
        writeFileSync(join(dir, "version.json"), JSON.stringify({ version: "9.9.9", codeHash: "abc123" }));
        expect(readVersion(dir)).toEqual({ version: "9.9.9", codeHash: "abc123" });
    });

    it("falls back to package.json, with no code hash", () => {
        expect(readVersion(dir)).toEqual({ version: "1.2.3", codeHash: null });
    });

    it("reports no code hash when version.json lacks one", () => {
        writeFileSync(join(dir, "version.json"), JSON.stringify({ version: "9.9.9" }));
        expect(readVersion(dir)).toEqual({ version: "9.9.9", codeHash: null });
    });

    it("throws on an unreadable version.json instead of hiding it", () => {
        writeFileSync(join(dir, "version.json"), "{");
        expect(() => readVersion(dir)).toThrow(SyntaxError);
    });

    it("reads the package's own package.json by default", () => {
        expect(readVersion()).toEqual({ version: OWN_VERSION, codeHash: null });
    });
});

describe("githerd version", () => {
    it("prints the version", () => {
        expect(execFileSync(process.execPath, [BIN, "version"], { encoding: "utf8" })).toBe(`${OWN_VERSION}\n`);
    });

    it("exits 2 with usage on an unknown command", () => {
        const r = spawnSync(process.execPath, [BIN, "nope"], { encoding: "utf8" });
        expect(r.status).toBe(2);
        expect(r.stderr).toContain("usage: githerd");
    });
});
