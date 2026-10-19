#!/usr/bin/env node
// Reproduces issue #1297 against the real scanner and server: the SonarQube gate step must pass
// while test shards create and delete their output files during the scan.
//
// It plants leftover result files (browser-results.json and others like it) in every package,
// starts tools/sonar-gate.mjs, and deletes and rewrites those files in a tight loop until the gate
// exits. The gate failed with NoSuchFileException when the scanner walked the working tree; it
// passes when the scanner reads only the changed files it is given.
//
// Usage: node tools/sonar/scan-race.repro.mjs [runs=3] [gate=tools/sonar-gate.mjs]
// Needs what the gate needs (SONAR_HOST_URL and a token in the environment or .env) and a branch
// with at least one committed change against origin/master, so there is something to scan.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const top = process.cwd();
const runs = Number(process.argv[2] ?? 3);
const gate = process.argv[3] ?? "tools/sonar-gate.mjs";
const packages = readdirSync(top).filter((d) => existsSync(join(top, d, "package.json")));
const planted = packages.flatMap((p) => [
    join(top, p, "browser-results.json"),
    ...Array.from({ length: 20 }, (_, i) => join(top, p, `browser-results-${i}.json`)),
]);

function runGate() {
    return new Promise((resolve) => {
        for (const f of planted) writeFileSync(f, "{}");
        let out = "";
        let done = false;
        const child = spawn("node", [gate], { cwd: top });
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        // ponytail: one file at a time on setImmediate; enough to hit the scanner's walk every run.
        let i = 0;
        const churn = () => {
            if (done) return;
            const f = planted[i++ % planted.length];
            rmSync(f, { force: true });
            writeFileSync(f, "{}");
            setImmediate(churn);
        };
        churn();
        child.on("close", (code) => {
            done = true;
            resolve({ code, out });
        });
    });
}

let failed = 0;
try {
    for (let r = 1; r <= runs; r++) {
        const { code, out } = await runGate();
        const race = /NoSuchFileException|the scanner failed/.test(out);
        const checked = /SonarQube: scanning \d+ changed file/.test(out);
        const ok = code === 0 && !race && checked;
        if (!ok) failed++;
        console.log(`run ${r}: exit ${code}, scanned ${checked}, race ${race} -> ${ok ? "PASS" : "FAIL"}`);
        if (!ok) console.log(out.trim().split("\n").slice(-15).join("\n"));
    }
} finally {
    for (const f of planted) rmSync(f, { force: true });
}
console.log(failed ? `${failed} of ${runs} runs failed` : `all ${runs} runs passed`);
process.exit(failed ? 1 : 0);
