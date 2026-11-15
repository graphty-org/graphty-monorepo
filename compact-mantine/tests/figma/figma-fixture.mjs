#!/usr/bin/env node
// The Figma tests read figma-fixture.json, beside this file: of the Figma study's captures
// (design/ui/figma, outside git), exactly the fields the tests read -- per capture, the elements
// they pick and, per element, the box, identity fields and computed styles they compare. The token
// tests (tests/theme/tokens.test.ts) read figma-variables.json: Figma's CSS variables, light and
// dark (the study's tokens/css-variables(-dark).json). So the tests run anywhere, CI included,
// without the 943 MB study.
//
//   node tests/figma/figma-fixture.mjs build   regenerate both: run the browser tests with the study,
//                                              recording every field they read (needs the study)
//   node tests/figma/figma-fixture.mjs check   every value in both equals the study's (skips, exit 0,
//                                              when the study is not here); also run by
//                                              tools/check-figma-lock.mjs
//
// Regenerate after changing which captures, elements or properties a test reads; a test that
// reads something the fixture lacks fails with a message naming this script.
import { execFileSync } from "node:child_process";
import console from "node:console";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { studyDir } from "../../../tools/check-figma-lock.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = resolve(HERE, "../..");
const FIXTURE = join(HERE, "figma-fixture.json");
const VARIABLES = "figma-variables.json";

const CAPTURE_FIELDS = ["url", "viewport", "rect"];
const ELEMENT_FIELDS = ["tag", "cls", "testid", "role", "aria", "text", "box"];

const readCapture = (dir, path) => JSON.parse(readFileSync(join(dir, `${path}.styles.json`), "utf8"));

/**
 * The fixture for a set of recorded reads.
 * @param dir the study
 * @param lines `path<TAB>index<TAB>field` lines, as the harness records them (index `-` for the capture)
 * @returns the fixture, keys in a fixed order
 */
export function buildFixture(dir, lines) {
    const byPath = new Map();
    for (const line of new Set(lines)) {
        if (!line) continue;
        const [path, index, field] = line.split("\t");
        if (!byPath.has(path)) byPath.set(path, []);
        byPath.get(path).push([index, field]);
    }
    const fixture = {};
    for (const path of [...byPath.keys()].sort((a, b) => a.localeCompare(b))) {
        const capture = readCapture(dir, path);
        const reads = byPath.get(path);
        const entry = {};
        for (const f of CAPTURE_FIELDS) {
            if (reads.some(([i, r]) => i === "-" && r === f) && Object.hasOwn(capture, f)) entry[f] = capture[f];
        }
        entry.count = capture.elements.length;
        const wanted = new Map();
        for (const [i, r] of reads) {
            if (i === "-") continue;
            if (!wanted.has(Number(i))) wanted.set(Number(i), new Set());
            wanted.get(Number(i)).add(r);
        }
        entry.elements = {};
        for (const i of [...wanted.keys()].sort((a, b) => a - b)) {
            const el = capture.elements[i];
            const fields = wanted.get(i);
            const out = {};
            for (const f of ELEMENT_FIELDS) if (fields.has(f) && Object.hasOwn(el, f)) out[f] = el[f];
            const styleKeys = [...fields]
                .filter((f) => f.startsWith("style."))
                .map((f) => f.slice(6))
                .filter((k) => Object.hasOwn(el.style, k))
                .sort((a, b) => a.localeCompare(b));
            if (fields.has("style") || styleKeys.length > 0) {
                out.style = Object.fromEntries(styleKeys.map((k) => [k, el.style[k]]));
            }
            entry.elements[i] = out;
        }
        fixture[path] = entry;
    }
    return fixture;
}

/**
 * Figma's CSS variables, as figma-variables.json holds them.
 * @param dir the study
 * @returns `{ light, dark }`, each variable name to value, names sorted
 */
export function buildVariables(dir) {
    const vars = (file) => {
        const all = JSON.parse(readFileSync(join(dir, "tokens", file), "utf8")).vars;
        return Object.fromEntries(
            Object.keys(all)
                .sort((a, b) => a.localeCompare(b))
                .map((k) => [k, all[k]]),
        );
    };
    return { light: vars("css-variables.json"), dark: vars("css-variables-dark.json") };
}

/**
 * The fixture as text: one capture header and one element per line, so a change reads as a small diff.
 * @param fixture the fixture
 * @returns the file's content
 */
export function serialize(fixture) {
    const captures = Object.entries(fixture).map(([path, { elements, ...head }]) => {
        const rows = Object.entries(elements).map(([i, e]) => `    ${JSON.stringify(i)}: ${JSON.stringify(e)}`);
        const header = JSON.stringify(head).slice(0, -1);
        return `  ${JSON.stringify(path)}: ${header}, "elements": {\n${rows.join(",\n")}\n  }}`;
    });
    return `{\n${captures.join(",\n")}\n}\n`;
}

/**
 * Where the fixture differs from the study.
 * @param dir the study
 * @param [fixturePath] the fixture file
 * @returns one line per difference; empty when it matches
 */
export function checkFixture(dir, fixturePath = FIXTURE) {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
    const bad = [];
    const variablesPath = join(dirname(fixturePath), VARIABLES);
    if (existsSync(variablesPath)) {
        const want = buildVariables(dir);
        const got = JSON.parse(readFileSync(variablesPath, "utf8"));
        for (const scheme of ["light", "dark"]) {
            if (!isDeepStrictEqual(got[scheme], want[scheme]))
                bad.push(`${VARIABLES} ${scheme}: differs from the study`);
        }
    }
    for (const [path, entry] of Object.entries(fixture)) {
        let capture;
        try {
            capture = readCapture(dir, path);
        } catch (error) {
            bad.push(`${path}: not readable in the study (${error.message})`);
            continue;
        }
        const { elements, count, ...head } = entry;
        if (count !== capture.elements.length)
            bad.push(`${path}: ${count} elements, the study has ${capture.elements.length}`);
        for (const [f, v] of Object.entries(head)) {
            if (!isDeepStrictEqual(v, capture[f])) bad.push(`${path} ${f}: differs from the study`);
        }
        for (const [i, e] of Object.entries(elements)) {
            const el = capture.elements[Number(i)];
            if (!el) {
                bad.push(`${path} #${i}: not in the study`);
                continue;
            }
            for (const [f, v] of Object.entries(e)) {
                if (f === "style") {
                    for (const [k, sv] of Object.entries(v)) {
                        if (el.style[k] !== sv) bad.push(`${path} #${i} ${k}: ${sv}, the study has ${el.style[k]}`);
                    }
                } else if (!isDeepStrictEqual(v, el[f])) {
                    bad.push(`${path} #${i} ${f}: ${JSON.stringify(v)}, the study has ${JSON.stringify(el[f])}`);
                }
            }
        }
    }
    return bad;
}

/**
 * Run the browser tests against the study, recording what they read, and write the fixture.
 * @param dir the study
 */
function build(dir) {
    const tmp = mkdtempSync(join(tmpdir(), "figma-fixture-"));
    const record = join(tmp, "reads.tsv");
    writeFileSync(record, "");
    try {
        execFileSync("pnpm", ["exec", "vitest", "run", "--project=browser"], {
            cwd: PACKAGE,
            stdio: "inherit",
            env: { ...process.env, FIGMA_FIXTURE_RECORD: record, FIGMA_STUDY_DIR: dir },
        });
        const fixture = buildFixture(dir, readFileSync(record, "utf8").split("\n"));
        writeFileSync(FIXTURE, serialize(fixture));
        writeFileSync(join(HERE, VARIABLES), `${JSON.stringify(buildVariables(dir), null, 1)}\n`);
        console.log(`wrote ${FIXTURE}: ${Object.keys(fixture).length} captures`);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const mode = process.argv[2] ?? "check";
    const dir = studyDir(PACKAGE);
    if (!dir) {
        if (mode === "build") {
            console.error("The Figma study (design/ui/figma) is not in this checkout; set FIGMA_STUDY_DIR.");
            process.exit(1);
        }
        console.log("The Figma study (design/ui/figma) is not in this checkout: the fixture was not checked.");
        process.exit(0);
    }
    if (mode === "build") build(dir);
    const bad = checkFixture(dir);
    if (bad.length > 0) {
        console.error(`tests/figma/figma-fixture.json differs from the Figma study in ${dir}:`);
        for (const b of bad) console.error(`  ${b}`);
        process.exit(1);
    }
    console.log("tests/figma/figma-fixture.json matches the Figma study");
}
