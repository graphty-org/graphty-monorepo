#!/usr/bin/env node
/**
 * Writes, or checks, the API report of a published package: one api-extractor report
 * (<package>/api/<entry>.api.md) per entry point in its package.json "exports" that has types.
 *
 * The report is the package's public API as a reviewer reads it: every exported name and its
 * signature, built from the published .d.ts files. It is committed, so a pull request that changes
 * the public API shows the change as a diff of the report, and CI fails until the report is
 * regenerated (CLAUDE.md, "Public API review").
 *
 * The check also fails when the committed report ADDS a property typed plain `string` to a result
 * type, compared with the report on the merge base with origin/master (or $API_REPORT_BASE). The
 * element is neutral about presentation (CLAUDE.md): a reason, status, kind or note it returns is
 * a string-literal union of codes or a `CodedFact` `{ code, params }`, never free text. Fields that
 * already exist never fail; see plainStringAdditions.
 *
 * Usage (after the package is built):
 *   node tools/api-report.mjs <package dir>           rewrite <package dir>/api/*.api.md
 *   node tools/api-report.mjs <package dir> --check   exit 1 when the built API differs from them,
 *                                                     or adds a plain string to a result type
 */
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
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

/** A result type by name: what a call returns about the consumer's graph. */
const RESULT_NAME = /(Result|Summary|Estimate|Recommendation|Explanation)$/;
/** The interface whose methods' return types (and sub-API properties) make a type a result type too. */
const SESSION_ROOT = "GraphSession";
/**
 * Property names that may be plain strings anywhere: identifiers and keys of the consumer's own
 * data, and catalog names (`plainName`, owner ruling on #1332). Keep it short; a reader-facing
 * reason, status, kind or note never belongs here. A name ending in `Id` or `Key` (`templateId`,
 * `coalesceKey`) is an identifier too.
 */
export const PLAIN_STRING_ALLOWLIST = new Set([
    // identifiers and keys
    "id",
    "key",
    "nodeId",
    "edgeId",
    "runId",
    "field",
    "column",
    // the column a load read (the weight's attribute, the columns an edge's ends came from)
    "attribute",
    "source",
    "target",
    // names the consumer or its data gave (an attribute, a set, a layer), and catalog names (#1332)
    "name",
    "technicalName",
    "plainName",
    // machine values: versions, hashes, timestamps, paths, media types, colors
    "revision",
    "digest",
    "dataDigest",
    "fingerprint",
    "version",
    "at",
    "startedAt",
    "path",
    "mediaType",
    "color",
]);

const DECLARATION =
    /^(?:export )?(?:declare )?(?:abstract )?(?:class|interface|type|enum|namespace|function|const) ([A-Za-z_$][\w$]*)/;
const PLAIN_STRING_PROPERTY = /^\s+(?:readonly )?([A-Za-z_$][\w$]*)\??: string(?: \| (?:undefined|null))*;$/;
const METHOD = /^\s+(?:readonly )?[A-Za-z_$][\w$]*\??(?:<[^(]*>)?\(/;

/**
 * Splits an api-extractor report into its top-level declarations.
 * @param text - the report
 * @returns declaration name -> its lines (the declaration line, then its indented members)
 */
export function parseReport(text) {
    const declarations = new Map();
    let current;
    for (const line of text.split("\n")) {
        const declared = DECLARATION.exec(line);
        if (declared) {
            current = [line];
            declarations.set(declared[1], current);
        } else if (/^\s/.test(line)) current?.push(line);
        else if (!/^[})\]]/.test(line)) current = undefined;
    }
    return declarations;
}

/**
 * Groups a declaration's indented lines into members: a member is one line, or several while a
 * bracket it opened is still open (a multi-line parameter list or object type).
 * @param lines - a declaration's lines after the first
 * @returns each member's text
 */
function members(lines) {
    const out = [];
    let depth = 0;
    for (const line of lines) {
        if (depth === 0) out.push(line);
        else out[out.length - 1] += `\n${line}`;
        for (const c of line) {
            if ("({[".includes(c)) depth++;
            else if (")}]".includes(c)) depth--;
        }
    }
    return out;
}

/**
 * The part of a member that is a type the caller receives: a method's return type, or a
 * property's type (the whole member). A method's parameters are inputs and are dropped.
 * @param member - one member's text
 * @returns the text to read type names and properties from
 */
function receivedType(member) {
    if (!METHOD.test(member)) return member;
    let depth = 0;
    for (let i = member.indexOf("("); i < member.length; i++) {
        if (member[i] === "(") depth++;
        else if (member[i] === ")" && --depth === 0) return member.slice(i + 1);
    }
    return member;
}

/**
 * The declarations a session hands back: GraphSession, then every type named in a return type,
 * property type, alias or heritage clause of a declaration already reached. Parameter types
 * (commands, options) are inputs and are not followed.
 * @param declarations - from parseReport
 * @returns the reached declaration names (empty when the report has no GraphSession)
 */
export function sessionReachable(declarations) {
    const reached = new Set();
    const queue = declarations.has(SESSION_ROOT) ? [SESSION_ROOT] : [];
    while (queue.length > 0) {
        const name = queue.pop();
        if (reached.has(name)) continue;
        reached.add(name);
        const [head, ...rest] = declarations.get(name);
        const texts = [head.replace(DECLARATION, ""), ...members(rest).map(receivedType)];
        for (const text of texts) {
            for (const [ref] of text.matchAll(/[A-Za-z_$][\w$]*/g)) {
                if (declarations.has(ref) && !reached.has(ref)) queue.push(ref);
            }
        }
    }
    return reached;
}

/**
 * Whether a result type may hold a plain string under this property name.
 * @param type - the declaring type's name
 * @param property - the property's name
 * @returns true for an identifier, a name, a machine value or a catalog description
 */
function allowedPlainString(type, property) {
    if (PLAIN_STRING_ALLOWLIST.has(property) || /[a-z](Id|Key)$/.test(property)) return true;
    // catalog descriptions describe the thing registered, not the consumer's graph (#1604)
    return property === "description" && type.endsWith("Descriptor");
}

/**
 * Every `Type.property` typed plain string in a report, optionally only on result types.
 * @param text - the report
 * @param resultsOnly - true to keep only result types and properties outside the allowlist
 * @returns `Type.property` -> why the type is a result type
 */
export function plainStringProperties(text, resultsOnly) {
    const declarations = parseReport(text);
    const reachable = resultsOnly ? sessionReachable(declarations) : undefined;
    const found = new Map();
    for (const [name, lines] of declarations) {
        const nameRule = RESULT_NAME.exec(name)?.[1];
        if (resultsOnly && !nameRule && !reachable.has(name)) continue;
        const rule = nameRule ? `its name ends in ${nameRule}` : `${SESSION_ROOT} returns it`;
        for (const line of members(lines.slice(1)).map(receivedType).join("\n").split("\n")) {
            const property = PLAIN_STRING_PROPERTY.exec(line)?.[1];
            if (property && !(resultsOnly && allowedPlainString(name, property)))
                found.set(`${name}.${property}`, rule);
        }
    }
    return found;
}

/**
 * The plain string properties a report adds to result types, compared with the base reports.
 * A property already typed plain string on the same type in any base report never fails, so
 * existing fields (tracked by their own issues) and a type newly reachable from the session pass.
 * @param baseTexts - the base reports
 * @param headTexts - the reports being checked
 * @returns one failure message per added property
 */
export function plainStringAdditions(baseTexts, headTexts) {
    const before = new Set(baseTexts.flatMap((t) => [...plainStringProperties(t, false).keys()]));
    const added = new Map(
        headTexts.flatMap((t) => [...plainStringProperties(t, true)]).filter(([k]) => !before.has(k)),
    );
    return [...added]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
            ([key, rule]) =>
                `${key} is a new plain string on a result type (${rule}). graphty-element is neutral about presentation: ` +
                `use an exported string-literal union of codes, or a CodedFact { code, params }. An identifier or a ` +
                `catalog name may be added to PLAIN_STRING_ALLOWLIST in tools/api-report.mjs.`,
        );
}

/**
 * Checks a package's committed reports against the merge base's for added plain string fields.
 * @param packageDir - the package's directory
 * @returns the failure messages
 */
function checkPlainStrings(packageDir) {
    const apiDir = join(resolve(packageDir), "api");
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: apiDir, encoding: "utf8" }).trim();
    // from the top: ls-tree run in a subfolder lists only that subfolder's part of the tree
    const git = (...args) => execFileSync("git", args, { cwd: top, encoding: "utf8", maxBuffer: 1 << 28 });
    const base = git("merge-base", "HEAD", process.env.API_REPORT_BASE ?? "origin/master").trim();
    const prefix = relative(top, apiDir);
    const files = readdirSync(apiDir).filter((f) => f.endsWith(".api.md"));
    const baseFiles = git("ls-tree", "--name-only", `${base}:${prefix}`)
        .split("\n")
        .filter((f) => f.endsWith(".api.md"));
    return plainStringAdditions(
        baseFiles.map((f) => git("show", `${base}:${prefix}/${f}`)),
        files.map((f) => readFileSync(join(apiDir, f), "utf8")),
    );
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
        console.error("public API changed: run npm run api:report in the package and commit the new report");
        process.exit(1);
    }
    const strings = flag ? checkPlainStrings(packageDir) : [];
    if (strings.length > 0) {
        for (const s of strings) console.error(`${packageDir}: ${s}`);
        process.exit(1);
    }
    console.log(`${packageDir}: API report ${flag ? "matches the build" : "written to api/"}`);
}
