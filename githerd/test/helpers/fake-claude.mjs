/**
 * A fake `claude -p` for the runner tests. The first argument is a scenario file; the rest is the
 * real command line. It records `{argv, env, cwd, pid}` in `$GITHERD_RUN_DIR/fake-claude.json`, then
 * plays the scenario:
 *
 * - `init`: "auto" (default) writes a matching `system`/`init` line built from `--tools`; an object
 *   is merged over it; null writes none.
 * - `lines`: stream lines written after init.
 * - `guardDenials`: lines appended to `$GITHERD_RUN_DIR/denials.jsonl`.
 * - `result`: the `result` line (omitted when null).
 * - `stderr`: text written to stderr after the stream lines.
 * - `hang`: true keeps running (and starts a grandchild in the same process group) until killed.
 * - `exitCode`: the exit code (default 0).
 */
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [scenarioFile, ...argv] = process.argv.slice(2);
const scenario = JSON.parse(readFileSync(scenarioFile, "utf8"));
const runDir = /** @type {string} */ (process.env.GITHERD_RUN_DIR);
writeFileSync(
    join(runDir, "fake-claude.json"),
    JSON.stringify({ argv, env: process.env, cwd: process.cwd(), pid: process.pid }),
);

const out = (/** @type {any} */ line) => process.stdout.write(`${JSON.stringify(line)}\n`);
const tools = argv[argv.indexOf("--tools") + 1].split(" ").filter((t) => t !== "mcp__githerd");
const init = scenario.init === undefined ? "auto" : scenario.init;
if (init !== null) {
    out({
        type: "system",
        subtype: "init",
        session_id: "sess-1",
        permissionMode: "auto",
        mcp_servers: [{ name: "githerd", status: "connected" }],
        tools: [...tools, "mcp__githerd__githerd_status"],
        ...(init === "auto" ? {} : init),
    });
}
for (const line of scenario.lines ?? []) out(line);
if (scenario.stderr) process.stderr.write(scenario.stderr);
for (const d of scenario.guardDenials ?? []) appendFileSync(join(runDir, "denials.jsonl"), `${JSON.stringify(d)}\n`);
if (scenario.hang) {
    const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    appendFileSync(join(runDir, "grandchild.pid"), String(grandchild.pid));
    setInterval(() => {}, 1000);
} else {
    if (scenario.result) out({ type: "result", session_id: "sess-1", ...scenario.result });
    process.exitCode = scenario.exitCode ?? 0;
}
