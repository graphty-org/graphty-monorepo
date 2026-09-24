/**
 * @file Every method a guide teaches on `element` or `graph` is a method that exists.
 *
 * `docs/guide/web-component.md` taught `element.takeScreenshot()` and
 * `element.checkScreenshotCapability()`, and `docs/guide/javascript-api.md` taught
 * `graph.takeScreenshot()` and `graph.captureVideo()`. None of the four has ever existed: the
 * real names are `captureScreenshot`, `canCaptureScreenshot` and `captureAnimation`, which
 * `docs/guide/screenshots.md` uses correctly on the same page of the site. A reader following
 * either of the two wrong guides got `TypeError: element.takeScreenshot is not a function`, and
 * nothing in the repository disagreed with the page.
 *
 * This reads the guides the way a reader does -- the code blocks -- and checks the names against
 * the two classes. It cannot check what a call DOES, only that the door exists, which is exactly
 * the class of error that shipped.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

/**
 * The members a guide may name on `element` or `graph` that are not declared by either class.
 *
 * Every entry is either a DOM member the element inherits or a public field whose own type
 * declares it, so a reader really can call it. The list is short and explicit on purpose: a name
 * that is not a real door has to be argued for here rather than passing unnoticed.
 */
const INHERITED = new Set([
    // EventTarget and HTMLElement, which `<graphty-element>` is one of.
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "setAttribute",
    "getAttribute",
    "removeAttribute",
    "remove",
    "style",
    "classList",
    "id",
    // Public fields whose own types declare what follows the dot.
    "scene",
    "engine",
    "canvas",
    "camera",
    "styles",
    "session",
    "eventManager",
    "operationQueue",
    "element",
]);

/**
 * Every `.md` file under a directory, at any depth.
 * @param dir - where to start
 * @returns the paths
 */
function markdownUnder(dir: string): string[] {
    const found: string[] = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            found.push(...markdownUnder(path));
        } else if (entry.name.endsWith(".md")) {
            found.push(path);
        }
    }

    return found;
}

/**
 * The names a source file declares: methods, getters, setters and fields.
 * @param file - the source file to read
 * @returns the declared names
 */
function declaredMembers(file: string): Set<string> {
    const source = readFileSync(file, "utf8");
    const names = new Set<string>();

    for (const match of source.matchAll(/^\s{4}(?:(?:public|private|protected|static|readonly|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*[(:<]/gm)) {
        names.add(match[1]);
    }

    return names;
}

/**
 * Every `<receiver>.<name>(` a guide's code blocks call.
 * @param file - the guide
 * @param receiver - the variable the guide calls on
 * @returns the calls, with the line each is on
 */
function callsOn(file: string, receiver: string): { name: string; line: number }[] {
    const lines = readFileSync(file, "utf8").split("\n");
    const calls: { name: string; line: number }[] = [];
    let inCode = false;

    lines.forEach((text, index) => {
        if (text.trimStart().startsWith("```")) {
            inCode = !inCode;

            return;
        }

        if (!inCode) {
            return;
        }

        // Quoted text is stripped first, so a URL like "https://example.com/graph.json" is not
        // read as a call to `graph.json`.
        const code = text.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');

        for (const match of code.matchAll(new RegExp(`\\b${receiver}\\.([A-Za-z_$][\\w$]*)`, "g"))) {
            calls.push({ name: match[1], line: index + 1 });
        }
    });

    return calls;
}

/**
 * Guides that rebind one of the two names to something else, and are skipped for that name.
 *
 * `custom-algorithms.md` writes `const graph = this.algorithmGraph("undirected")` -- the
 * algorithm's own read-only view of the data, which is a different object with a different API.
 * Every `graph.` on that page is about that object, so checking it against the renderer's class
 * would be checking the wrong class.
 */
const REBOUND: Record<string, readonly string[]> = {
    graph: ["docs/guide/extending/custom-algorithms.md"],
};

const GUIDES = markdownUnder("docs/guide");

describe("the names the guides teach", () => {
    for (const [receiver, file] of [
        ["element", "src/graphty-element.ts"],
        ["graph", "src/Graph.ts"],
    ] as const) {
        it(`every \`${receiver}.<name>\` in a guide is declared by ${file}`, () => {
            const declared = declaredMembers(file);
            const wrong: string[] = [];

            for (const guide of GUIDES) {
                if (REBOUND[receiver]?.includes(guide.split("\\").join("/"))) {
                    continue;
                }

                for (const call of callsOn(guide, receiver)) {
                    if (!declared.has(call.name) && !INHERITED.has(call.name)) {
                        wrong.push(`${guide}:${String(call.line)} teaches ${receiver}.${call.name}`);
                    }
                }
            }

            assert.deepStrictEqual(wrong, [], `a guide teaches a name ${file} does not declare`);
        });
    }
});
