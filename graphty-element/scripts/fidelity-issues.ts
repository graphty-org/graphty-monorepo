/**
 * Reports the style fidelity known failures that no open issue tracks: each listed element whose reasons cite no
 * issue, or cite only issues and pull requests that are closed. A known failure stays on the list until its issue is
 * fixed, so each one reported needs a new issue cited for it, or a fix (#7015). It asks GitHub for every cited
 * number's state in one GraphQL query (`gh`), and reports without failing: the lists already hold such entries.
 *
 *     npm run fidelity:issues
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { citedIssues, type KnownRecords, untrackedKnown } from "../test/fidelity/oracle/floors";

const FILES = ["test/fidelity/oracle-known-failures.json", "test/fidelity/baseline-scores.json"];

const files = FILES.map((path) => ({ path, records: JSON.parse(readFileSync(path, "utf8")) as KnownRecords }));
const cited = [...new Set(files.flatMap((f) => (f.records.reasons ?? []).flatMap((r) => citedIssues(r.reason))))];

const fields = cited
    .map(
        (n) =>
            `i${String(n)}: issueOrPullRequest(number: ${String(n)}) { ... on Issue { state } ... on PullRequest { state } }`,
    )
    .join(" ");
const query = `{ repository(owner: "graphty-org", name: "graphty-monorepo") { ${fields} } }`;
// a number that is neither an issue nor a pull request comes back null with an error beside the data; read the data
const res = spawnSync("gh", ["api", "graphql", "-f", `query=${query}`], { encoding: "utf8" });
const body = JSON.parse(res.stdout || "{}") as {
    data?: { repository?: Record<string, { state?: string } | null> };
};
const states = body.data?.repository;
if (states === undefined) {
    console.error(`gh api graphql failed: ${res.stderr}`);
    process.exit(1);
}
const open = new Set(cited.filter((n) => states[`i${String(n)}`]?.state === "OPEN"));

for (const { path, records } of files) {
    const untracked = untrackedKnown({ ...records, reasons: records.reasons ?? [] }, open);
    const bySet = new Map<string, number>();
    for (const u of untracked) {
        const label = u.cited.length === 0 ? "no issue cited" : u.cited.map((n) => `#${String(n)}`).join(" ");
        bySet.set(label, (bySet.get(label) ?? 0) + 1);
    }
    console.log(`${path}: ${String(untracked.length)} known failures no open issue tracks`);
    for (const [label, count] of [...bySet].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${String(count).padStart(5)}  ${label}`);
    }
}
