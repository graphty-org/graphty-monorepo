import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { BenchmarkSession } from "../../benchmarks/benchmark-result";
import { generateHTML } from "../../scripts/generate-performance-report";

const systemInfo = {
    platform: "linux",
    arch: "x64",
    nodeVersion: "v22.0.0",
    cpu: { model: "test", cores: 1, speed: 1 },
    memory: { totalGB: 1 },
    libraryVersion: "0.0.0",
} as BenchmarkSession["systemInfo"];

const session: BenchmarkSession = {
    sessionId: "test",
    timestamp: "2026-01-01T00:00:00.000Z",
    systemInfo,
    testType: "quick",
    results: [
        {
            algorithm: "BFS",
            graphType: "sparse",
            graphSize: 10,
            edges: 20,
            executionTime: 1,
            memoryUsage: 1,
            memoryPerVertex: 1,
            timestamp: "2026-01-01T00:00:00.000Z",
        },
    ],
};

function externalScripts(html: string): string[] {
    return html.match(/<script\b[^>]*\bsrc=[^>]*>/g) ?? [];
}

describe("benchmark reports load only pinned scripts", () => {
    const reportsDir = join(import.meta.dirname, "../../benchmark-results");
    const reports = {
        generated: generateHTML([session]),
        "index.html": readFileSync(join(reportsDir, "index.html"), "utf8"),
        "performance-report.html": readFileSync(join(reportsDir, "performance-report.html"), "utf8"),
    };

    it.each(Object.entries(reports))("%s", (_name, html) => {
        const scripts = externalScripts(html);

        expect(scripts.length).toBeGreaterThan(0);
        for (const script of scripts) {
            expect(script).toMatch(/src="[^"]*@\d+\.\d+\.\d+\/[^"]+"/);
            expect(script).toMatch(/integrity="sha384-[A-Za-z0-9+/]+={0,2}"/);
            expect(script).toMatch(/crossorigin="anonymous"/);
        }
    });
});
