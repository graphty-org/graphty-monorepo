/**
 * A fake notify command for tests. Usage: `node fake-notify.mjs <log file> <behavior> ...args`.
 * It appends one JSON line `{pid, args}` to the log file, then by behavior: `ok` exits 0, `fail`
 * prints to stderr and exits 1, `hang` never exits.
 */
import { appendFileSync } from "node:fs";

const [log, behavior, ...args] = process.argv.slice(2);
appendFileSync(log, `${JSON.stringify({ pid: process.pid, args })}\n`);
if (behavior === "fail") {
    process.stderr.write("pushover: invalid user key\n");
    process.exit(1);
}
if (behavior === "hang") setInterval(() => {}, 1000);
