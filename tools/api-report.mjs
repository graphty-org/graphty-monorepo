#!/usr/bin/env node
/**
 * Writes, or checks, the API report of a published package: one api-extractor report
 * (<package>/api/<entry>.api.md) per entry point in its package.json "exports" that has types.
 *
 * The report is the package's public API as a reviewer reads it: every exported name and its
 * signature, built from the published .d.ts files. It is committed, so a pull request that changes
 * the public API shows the change as a diff of the report, and CI fails until the report is
 * regenerated and the owner has approved it (the `api-approved` label; CLAUDE.md, "Public API
 * review").
 *
 * Usage (after the package is built):
 *   node tools/api-report.mjs <package dir>           rewrite <package dir>/api/*.api.md
 *   node tools/api-report.mjs <package dir> --check   exit 1 when the built API differs from them
 */
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The entry points of a package.json "exports" map that have types.
 * @param exportsField - the "exports" value
 * @returns [report name, .d.ts path relative to the package] pairs; "." is named "index"
 */
export function entryPoints(exportsField) {
    const map = typeof exportsField === "string" || exportsField?.types ? { ".": exportsField } : (exportsField ?? {});
    return Object.entries(map)
        .filter(([, target]) => typeof target === "object" && typeof target?.types === "string")
        .map(([key, target]) => [key === "." ? "index" : key.replace(/^\.\//, "").replaceAll("/", "-"), target.types]);
}

/**
 * Runs api-extractor on one entry point.
 * @param dir - the package's directory
 * @param name - the report name
 * @param types - the entry point's .d.ts, relative to dir
 * @param temp - a scratch folder for api-extractor
 * @param check - true to compare with the committed report instead of writing it
 * @returns a message when the report differs (or cannot be compared), else undefined
 */
function reportEntry(dir, name, types, temp, check) {
    const config = ExtractorConfig.prepare({
        configObject: {
            projectFolder: dir,
            mainEntryPointFilePath: join(dir, types),
            compiler: { overrideTsconfig: { compilerOptions: { skipLibCheck: true } } },
            apiReport: { enabled: true, reportFileName: name, reportFolder: join(dir, "api"), reportTempFolder: temp },
            newlineKind: "lf",
            docModel: { enabled: false },
            dtsRollup: { enabled: false },
            tsdocMetadata: { enabled: false },
            // The report is the review surface; documentation and release-tag lint is not this check's job.
            messages: {
                compilerMessageReporting: { default: { logLevel: "none" } },
                extractorMessageReporting: { default: { logLevel: "none" } },
                tsdocMessageReporting: { default: { logLevel: "none" } },
            },
        },
        configObjectFullPath: join(dir, "api-extractor.json"),
        packageJsonFullPath: join(dir, "package.json"),
    });
    const result = Extractor.invoke(config, {
        localBuild: !check,
        // its console lines ("report created", the TypeScript version notice) are noise here
        messageCallback: (m) => (m.handled = true),
    });
    if (result.apiReportChanged) return `${name}: differs from api/${name}.api.md`;
    if (!result.succeeded) return `${name}: could not be compared with api/${name}.api.md`;
    return undefined;
}

/**
 * Writes or checks every report of a package.
 * @param packageDir - the package's directory
 * @param check - true to compare with the committed reports instead of writing them
 * @returns the messages describing what differs; empty when nothing does (or when writing)
 */
export function apiReport(packageDir, check) {
    const dir = resolve(packageDir);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const apiDir = join(dir, "api");
    const entries = entryPoints(pkg.exports);
    // api-extractor silently writes nothing into a folder that does not exist
    if (!check) mkdirSync(apiDir, { recursive: true });
    const temp = mkdtempSync(join(tmpdir(), "api-report-"));
    let differ;
    try {
        differ = entries.map(([name, types]) => reportEntry(dir, name, types, temp, check)).filter(Boolean);
    } finally {
        rmSync(temp, { recursive: true, force: true });
    }
    const expected = new Set(entries.map(([name]) => `${name}.api.md`));
    const stale = existsSync(apiDir) ? readdirSync(apiDir).filter((f) => !expected.has(f)) : [];
    if (!check) {
        for (const f of stale) rmSync(join(apiDir, f));
        return [];
    }
    return [...differ, ...stale.map((f) => `api/${f} is not an entry point of package.json "exports" any more`)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [packageDir, flag] = process.argv.slice(2);
    if (!packageDir || (flag && flag !== "--check")) {
        console.error("usage: node tools/api-report.mjs <package dir> [--check]");
        process.exit(2);
    }
    const differ = apiReport(packageDir, flag === "--check");
    if (differ.length > 0) {
        for (const d of differ) console.error(`${packageDir}: ${d}`);
        console.error(
            "public API changed: run npm run api:report in the package and get the owner's approval " +
                "(the api-approved label) for the new report",
        );
        process.exit(1);
    }
    console.log(`${packageDir}: API report ${flag ? "matches the build" : "written to api/"}`);
}
