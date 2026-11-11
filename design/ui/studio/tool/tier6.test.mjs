import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
    browserNoise,
    callsShort,
    geminiKey,
    geminiRouter,
    scanForKey,
    sessionSlots,
    siteFile,
    takeRequest,
    TIER6_CAP,
} from "./tier6.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scratch = () => mkdtempSync(join(tmpdir(), "tier6-"));
const FAKE = "planted-fake-key-0123456789";

test("the counter reaches the cap under parallel appends and never allows one over it", async () => {
    const file = join(scratch(), "count");
    const worker = `import { takeRequest } from ${JSON.stringify(new URL("./tier6.mjs", import.meta.url).href)};
        let n = 0;
        for (let i = 0; i < 1100; i++) if (takeRequest(${JSON.stringify(file)}).ok) n++;
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

test("a tier 6 session is held to the criteria's 4 live browsers; another tier and BROWSER_SLOTS are not", () => {
    assert.deepEqual(sessionSlots("6", {}), { BROWSER_SLOTS: "4" });
    assert.deepEqual(sessionSlots("6", { BROWSER_SLOTS: "2" }), { BROWSER_SLOTS: "2" });
    assert.deepEqual(sessionSlots("2", {}), {});
});

test("the calls left must carry every session of the round at its limit", () => {
    const file = join(scratch(), "count");
    assert.equal(callsShort(file, 12), null);
    writeFileSync(file, "x".repeat(TIER6_CAP - 480));
    assert.equal(callsShort(file, 12), null);
    writeFileSync(file, "x".repeat(TIER6_CAP - 479));
    assert.match(callsShort(file, 12), /^479 of the tier's 5000 Gemini requests are left and 12 sessions may use 480/);
});

test("the gate of a tier whose criteria score no bar by a script asks for no bars run, and holds it to the cap", async () => {
    const studio = resolve(here, "..");
    const tier = join(studio, "tier6/rounds");
    const rd = join(tier, "round-97");
    const frozen = readFileSync(join(studio, "tier6/criteria.md"), "utf8").match(/build ([0-9a-f]{7,40})/)[1];
    const walk = async (name) => {
        const d = join(tier, "r97/pilot/T91A", name);
        await mkdir(d, { recursive: true });
        await writeFile(join(d, "session.json"), JSON.stringify({ commit: frozen, keyboardOnlyMode: false }));
        await writeFile(join(d, "01.png"), "");
    };
    const count = join(scratch(), "count");
    const gate = () =>
        spawnSync(process.execPath, [join(here, "real.mjs"), "--gate", rd], {
            encoding: "utf8",
            env: { ...process.env, REAL_TIER: "", REAL_GEMINI_COUNT: count },
        });
    const clean = () => Promise.all([rd, join(tier, "r97")].map((d) => rm(d, { recursive: true, force: true })));
    await clean();
    try {
        await mkdir(rd, { recursive: true });
        await writeFile(join(rd, "plan.md"), "| r97-s01 | T91 | A: volunteers | Ruth | `empty` |\n");
        await walk("success");
        await walk("detours");
        writeFileSync(count, "x".repeat(TIER6_CAP - 39));
        let r = gate();
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, /^FAIL: 39 of the tier's 5000 Gemini requests are left/m);
        writeFileSync(count, "x".repeat(TIER6_CAP - 40));
        r = gate();
        assert.equal(r.status, 0, r.stdout);
        assert.doesNotMatch(r.stdout, /bars/);
    } finally {
        await clean();
    }
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

test("the browser's report of a refused cross-origin call is noise, and the app's own failures are not", () => {
    const cors =
        "console error: Access to fetch at 'https://api.openai.com/v1/responses' from origin 'http://127.0.0.1:39151' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.";
    for (const l of [
        cors,
        "failed request: https://api.openai.com/v1/responses (net::ERR_FAILED)",
        "console error: Failed to load resource: net::ERR_FAILED",
    ])
        assert.ok(browserNoise(l), l);
    for (const l of [
        "script error: x is undefined",
        "console error: Uncaught TypeError: a is null",
        "failed request: 429 https://generativelanguage.googleapis.com/v1beta/models",
        "failed request: /data/x.json (net::ERR_FAILED)",
        "failed request: https://upload.wikimedia.org/a.png (net::ERR_BLOCKED_BY_ORB)",
    ])
        assert.ok(!browserNoise(l), l);
});

test("--leaks reads a path a participant writes into its notes as text, and a path it opens as a leak", () => {
    const own = scratch();
    const tasks = resolve(here, "../tier6/tasks.md");
    const log = (calls) => {
        const f = join(own, `${calls.length}-${Math.random().toString(36).slice(2)}.jsonl`);
        const lines = [
            { type: "user", message: { content: `YOU ARE A STUDY PARTICIPANT. Read only ${own}/briefing.md.` } },
            ...calls.map(([name, input]) => ({
                type: "assistant",
                message: { content: [{ type: "tool_use", name, input }] },
            })),
        ];
        writeFileSync(f, lines.map((x) => JSON.stringify(x)).join("\n") + "\n");
        return f;
    };
    const leaks = (f) => spawnSync(process.execPath, [join(here, "real.mjs"), "--leaks", own, f], { encoding: "utf8" });
    const notes = `I wondered whether ${tasks} or criteria.md held the answer, and did not look.`;
    const clean = log([
        ["Write", { file_path: join(own, "transcript.md"), content: notes }],
        ["Edit", { file_path: join(own, "transcript.md"), old_string: "x", new_string: notes }],
        ["Bash", { command: `cat >> ${own}/transcript.md <<'EOF'\n${notes}\nEOF`, description: notes }],
    ]);
    let r = leaks(clean);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /none opened a file outside the session folder/);
    for (const [name, input] of [
        ["Read", { file_path: tasks }],
        ["Bash", { command: `python3 - <<'EOF'\nprint(open('${tasks}').read())\nEOF` }],
        ["Bash", { command: `cat ${tasks} >> ${own}/transcript.md <<'EOF'\nnotes\nEOF` }],
    ]) {
        r = leaks(log([[name, input]]));
        assert.equal(r.status, 1, `${name} ${JSON.stringify(input)}: ${r.stdout}${r.stderr}`);
        assert.match(r.stdout, /VOID: .*tasks\.md/);
    }
});

test("the participant prompt leaves the reader's history to the briefing", () => {
    const wf = readFileSync(resolve(here, "../../../../.claude/workflows/design-studio.js"), "utf8");
    const participate = wf.slice(wf.indexOf("const participate ="), wf.indexOf("const attempts ="));
    assert.ok(participate.includes("YOU ARE A STUDY PARTICIPANT: ${who}"));
    assert.ok(participate.includes("const who = `the person ${brief} describes."));
    assert.doesNotMatch(participate.replace(/^\s*\/\/.*$/gm, ""), /RETURNING|FIRST-TIME|USERS/i);
});
