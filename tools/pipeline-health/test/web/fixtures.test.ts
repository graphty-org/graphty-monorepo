// The dashboard's committed fixtures (web/fixtures/*.json) must be what web/fixtures/build.ts writes.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, expect, it } from "vitest";

const committed = fileURLToPath(new URL("../../web/fixtures/", import.meta.url));
const out = mkdtempSync(join(tmpdir(), "health-fixtures-"));
afterAll(() => rmSync(out, { recursive: true, force: true }));

const jsonFiles = (dir: string): string[] =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".json"))
        .sort();

it("the fixture builder reproduces every committed fixture", async () => {
    process.env.HEALTH_FIXTURES_OUT = out;
    try {
        await import("../../web/fixtures/build.js");
    } finally {
        delete process.env.HEALTH_FIXTURES_OUT;
    }
    const built = jsonFiles(out);
    expect(built).toEqual(jsonFiles(committed));
    for (const f of built) {
        const read = (dir: string): unknown => JSON.parse(readFileSync(join(dir, f), "utf8"));
        expect(read(out), `${relative(process.cwd(), join(committed, f))} differs from build.ts`).toEqual(
            read(committed),
        );
    }
});
