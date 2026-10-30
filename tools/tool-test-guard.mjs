// Loaded into every tool test, and every node process it starts, by tools/run-ci-workflow-tests.mjs
// (`node --import`, carried on in NODE_OPTIONS). A tool test must never reach the real GitHub, the results store or
// the main checkout's shared tmp/ state: in #3392 a test of the CI verification filed a real quarantine issue (#3370)
// for its fixture test. The runner strips the credentials and CI variables and puts a `gh` on PATH that refuses;
// this refuses `fetch` to any host but loopback and any write under TOOL_TEST_GUARD_PROTECT. Every refusal throws
// and is appended to TOOL_TEST_GUARD_LOG, which fails the test file even when the tool under test swallows the error.
// A test that needs one of these stubs it (a fake gh first on its PATH, a local server on port 0, its own temp dir).
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { resolve, sep } from "node:path";

const log = process.env.TOOL_TEST_GUARD_LOG;
const protect = process.env.TOOL_TEST_GUARD_PROTECT;

function refuse(what) {
    const line = `tool-test-guard: refused ${what} (pid ${process.pid}); stub it in the test`;
    if (log) fs.appendFileSync(log, line + "\n");
    throw new Error(line);
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (!LOOPBACK.has(url.hostname)) refuse(`a network call to ${url.origin}`);
    return realFetch(input, init);
};

if (protect) {
    const inside = (p) => {
        const abs = resolve(String(p instanceof URL ? p.pathname : p));
        return abs === protect || abs.startsWith(protect + sep);
    };
    const guard = (obj, names) => {
        for (const name of names) {
            const real = obj[name];
            obj[name] = function (...args) {
                const paths =
                    name === "renameSync" || name === "copyFileSync" || name === "cpSync"
                        ? args.slice(0, 2)
                        : [args[0]];
                const hit = paths.find((p) => (typeof p === "string" || p instanceof URL) && inside(p));
                if (hit) refuse(`a write to ${hit}, in the main checkout's shared tmp/`);
                return real.apply(this, args);
            };
        }
    };
    const SYNC = [
        "writeFileSync",
        "appendFileSync",
        "mkdirSync",
        "rmSync",
        "unlinkSync",
        "renameSync",
        "copyFileSync",
        "cpSync",
    ];
    guard(fs, SYNC);
    guard(
        fs.promises,
        SYNC.map((n) => n.replace(/Sync$/, "")),
    );
    syncBuiltinESMExports();
}
