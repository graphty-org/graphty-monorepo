import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { geminiKey, geminiRouter, scanForKey, siteFile, takeRequest, TIER6_CAP } from "./tier6.mjs";

const scratch = () => mkdtempSync(join(tmpdir(), "tier6-"));
const FAKE = "planted-fake-key-0123456789";

test("the counter reaches the cap under parallel appends and never allows one over it", async () => {
    const file = join(scratch(), "count");
    const worker = `import { takeRequest } from ${JSON.stringify(new URL("./tier6.mjs", import.meta.url).href)};
        let n = 0;
        for (let i = 0; i < 700; i++) if (takeRequest(${JSON.stringify(file)}).ok) n++;
        console.log(n);`;
    const run = () =>
        new Promise((done) => {
            const c = spawn(process.execPath, ["--input-type=module", "-e", worker]);
            let out = "";
            c.stdout.on("data", (d) => (out += d));
            c.on("close", () => done(Number(out)));
        });
    const allowed = await Promise.all(Array.from({ length: 6 }, run));
    const total = allowed.reduce((a, b) => a + b, 0);
    assert.ok(statSync(file).size >= TIER6_CAP);
    assert.ok(total <= TIER6_CAP, `${total} allowed`);
    assert.ok(total >= TIER6_CAP - 6, `${total} allowed`);
    assert.equal(takeRequest(file).ok, false);
});

test("refuses at the cap, and a refused request does not grow the count", () => {
    const file = join(scratch(), "count");
    writeFileSync(file, "x".repeat(TIER6_CAP - 1));
    assert.deepEqual(takeRequest(file), { ok: true, count: TIER6_CAP });
    assert.deepEqual(takeRequest(file), { ok: false, count: TIER6_CAP });
    assert.equal(statSync(file).size, TIER6_CAP);
});

test("the key scan finds a planted key in a text file and a binary file, and passes a clean folder", () => {
    const dir = scratch();
    mkdirSync(join(dir, "saved"));
    writeFileSync(join(dir, "clean.txt"), "nothing here");
    assert.deepEqual(scanForKey(dir, FAKE), []);
    writeFileSync(join(dir, "steps.log"), `sent ${FAKE} along`);
    writeFileSync(join(dir, "saved", "01.png"), Buffer.concat([Buffer.from([0, 255, 137]), Buffer.from(FAKE)]));
    assert.deepEqual(scanForKey(dir, FAKE).sort(), ["saved/01.png", "steps.log"]);
});

test("/site.json is answered for tier 6 only, and names no site", () => {
    assert.deepEqual(JSON.parse(siteFile("6", "/site.json")), { features: ["assistant"] });
    assert.equal(siteFile("6", "/index.html"), null);
    for (const tier of ["2", "3", "5", null]) assert.equal(siteFile(tier, "/site.json"), null);
});

test("the key is read from the one variable, and a missing file or variable is null", () => {
    const dir = scratch();
    const env = join(dir, ".env");
    writeFileSync(env, `OTHER=1\nGOOGLE_API_KEY=${FAKE}\n`);
    assert.equal(geminiKey(env), FAKE);
    assert.equal(process.env.OTHER, undefined);
    writeFileSync(env, "OTHER=1\n");
    assert.equal(geminiKey(env), null);
    assert.equal(geminiKey(join(dir, "nothing")), null);
});

// a route as Playwright hands it over, recording what the handler did
function fakeRoute(method) {
    const did = {};
    return {
        did,
        request: () => ({
            method: () => method,
            url: () => "https://generativelanguage.googleapis.com/v1beta/models/m:streamGenerateContent?alt=sse",
            headers: () => ({ accept: "*/*", "x-goog-api-key": "placeholder" }),
        }),
        continue: async (o) => void (did.continued = o ?? {}),
        fulfill: async (o) => void (did.fulfilled = o),
    };
}

test("the route swaps in the key and counts; a preflight is neither; at the cap it refuses", async () => {
    const file = join(scratch(), "count");
    const logs = [];
    let refused = 0;
    const handler = geminiRouter({ key: FAKE, file, cap: 1, onRefused: () => refused++, log: (l) => logs.push(l) });

    const preflight = fakeRoute("OPTIONS");
    await handler(preflight);
    assert.deepEqual(preflight.did, { continued: {} });
    assert.throws(() => statSync(file));

    const call = fakeRoute("POST");
    await handler(call);
    assert.deepEqual(call.did.continued.headers, { accept: "*/*", "x-goog-api-key": FAKE });
    assert.equal(statSync(file).size, 1);
    assert.deepEqual(logs, ["gemini request 1: POST /v1beta/models/m:streamGenerateContent"]);

    const over = fakeRoute("POST");
    await handler(over);
    assert.equal(over.did.fulfilled.status, 429);
    assert.equal(over.did.continued, undefined);
    assert.equal(refused, 1);
});
