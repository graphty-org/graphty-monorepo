/**
 * Live check of every built-in source's examples (`descriptor.examples`): loads each one from its
 * public server, as `session.data.loadExample` in graphty-element would, and fails when one errors
 * or loads an empty graph. A count that drifts from the example's `counts` is a warning: public
 * data changes. Never run by pull request CI; the weekly links workflow runs it and files an issue
 * labelled `dead-network-examples` when it fails.
 *
 * Usage: `GRAPH_IO_LIVE=1 pnpm exec tsx scripts/live-examples.ts [--report <file>] [<id substring>]`.
 * `--report` writes a Markdown table of the results.
 */

import { writeFileSync } from "node:fs";

import { credentials, ImportError, listSources, loadFromSource } from "../src/index.js";

if (process.env.GRAPH_IO_LIVE !== "1") {
    process.stdout.write("set GRAPH_IO_LIVE=1 to call the live services\n");
    process.exit(0);
}

const reportAt = process.argv.indexOf("--report");
const reportFile = reportAt === -1 ? null : (process.argv[reportAt + 1] ?? null);
const only = process.argv.slice(2).find((arg, at, all) => !arg.startsWith("--") && all[at - 1] !== "--report");
// Wikidata answers 403 to a request without a descriptive User-Agent (issue #6217).
const USER_AGENT = "graphty-live-examples/1.0 (https://graphty.app)";

const rows: string[] = [];
let failed = 0;

for (const { id: source, descriptor } of listSources()) {
    for (const example of descriptor.examples ?? []) {
        if (only !== undefined && !example.id.includes(only)) {
            continue;
        }

        const started = Date.now();
        const login = example.publicLogin;
        let outcome: string;
        let status: "ok" | "warn" | "FAIL";
        try {
            const { snapshot } = await loadFromSource(source, example.params, {
                endpoint: example.endpoint,
                userAgent: USER_AGENT,
                ...(login === undefined ? {} : { credential: credentials.basic(login.username, login.password) }),
                limits: {
                    timeoutMs: 120_000,
                    ...(example.firstPage === undefined ? {} : { maxNodes: example.firstPage, onLimit: "stop" }),
                },
            });
            const { nodes, edges } = example.counts ?? {};
            // An example loaded whole should match its counts; a neighborhood or a first page cannot.
            const drift =
                example.whole !== false &&
                example.firstPage === undefined &&
                ((nodes !== undefined && nodes !== snapshot.nodeCount) ||
                    (edges !== undefined && edges !== snapshot.edgeCount));
            status = drift ? "warn" : "ok";
            if (snapshot.nodeCount === 0) {
                status = "FAIL";
            }
            const expected = drift ? `(counts say ${String(nodes)} / ${String(edges)})` : "";
            outcome = `${String(snapshot.nodeCount)} nodes / ${String(snapshot.edgeCount)} edges ${expected}`;
        } catch (error) {
            status = "FAIL";
            const issue = error instanceof ImportError ? error.issue : undefined;
            outcome = `${issue?.code ?? "error"}: ${error instanceof Error ? error.message : String(error)}`;
        }

        if (status === "FAIL") {
            failed++;
        }

        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        process.stdout.write(`${status.padEnd(4)} ${source} / ${example.id} (${seconds} s) ${outcome}\n`);
        rows.push(
            `| ${status} | ${source} | ${example.id} | ${example.endpoint ?? descriptor.defaultEndpoint ?? ""} | ${outcome.replaceAll("|", "/")} |`,
        );
    }
}

if (reportFile !== null) {
    writeFileSync(
        reportFile,
        ["| result | source | example | server | outcome |", "|---|---|---|---|---|", ...rows, ""].join("\n"),
    );
}

process.exitCode = failed === 0 ? 0 : 1;
