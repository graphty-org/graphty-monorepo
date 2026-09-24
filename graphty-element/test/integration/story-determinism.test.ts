/**
 * This test scans all story files to detect non-deterministic patterns that would
 * cause visual regression failures in Chromatic. It checks for:
 *
 * 1. Math.random() usage without a seeded RNG - random data generation will produce
 *    different results each time, causing layout differences
 * 2. Physics-based layouts (ngraph, d3, forceatlas2, spring, random) without proper
 *    configuration:
 *    - Missing seed in layoutConfig
 *    - Missing preSteps in the story's setup
 *    - Missing waitForGraphSettled in play function
 */
import fs from "node:fs";
import path from "node:path";

import { assert, describe, test } from "vitest";

// Physics-based layouts that require seeds for deterministic results
const PHYSICS_LAYOUTS = ["ngraph", "d3", "forceatlas2", "spring", "spring-electrical", "random"];

/**
 * The physics layouts the element runs as a SIMULATION, which is what makes a pre-step count a
 * story's own business rather than the visual-regression lane's.
 *
 * A simulation is advanced by RENDERED FRAMES -- one iteration per frame, by default -- so a
 * story that asks one for five hundred iterations and names no pre-step count is asking for five
 * hundred frames of animation, and how long that takes is a question about the browser rather
 * than about the graph. The other physics layouts arrive inside `setLayout`, finished, so nothing
 * about them depends on the frame clock. `preSteps` runs the iterations before the first frame is
 * drawn, off that clock entirely, and the arrangement is the same one either way.
 */
const SIMULATION_LAYOUTS = ["forceatlas2", "spring", "spring-electrical"];

// Layouts that don't support seeds but handle determinism through other means (e.g., diffThreshold)
// D3 force layout doesn't have seed support - it uses high diffThreshold instead
const LAYOUTS_WITHOUT_SEED_SUPPORT = ["d3"];

// Get all story files
function getStoryFiles(): string[] {
    const storiesDir = path.join(__dirname, "../../stories");
    const storyFiles: string[] = [];

    function walkDir(dir: string): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath);
            } else if (entry.name.endsWith(".stories.ts")) {
                storyFiles.push(fullPath);
            }
        }
    }

    walkDir(storiesDir);
    return storyFiles;
}

interface DeterminismIssue {
    file: string;
    line: number;
    issue: string;
    severity: "error" | "warning";
}

/**
 * The names of the file's own helpers that reach `waitForGraphSettled`, directly or through
 * another helper in the same file.
 *
 * WHY THIS EXISTS. This check used to ask whether the literal text "waitForGraphSettled" appeared
 * inside a story's own object literal. That reads as a settle check and is really a spelling
 * check: the moment a file lifts the settle into one shared helper -- which is what every story
 * file here does now, because the settle is followed by a dozen assertions nobody wants to repeat
 * twenty-two times -- the string leaves the story block and twenty-one correctly-settling stories
 * are reported as unsettled. Grepping the whole file instead would be the opposite error: one
 * story with a settle would excuse every other story in the file.
 *
 * So the call is followed one hop at a time. A story is settled when its play function calls
 * `waitForGraphSettled`, or calls a helper in this file that does, or calls a helper that calls a
 * helper that does. A story whose play function reaches no such helper is still an error, which is
 * the property that matters.
 * @param content - The story file's full source.
 * @returns Every local helper name from which a settle is reachable.
 */
function settlingHelperNames(content: string): Set<string> {
    // `const name = (...) => { ... }`, `const name = async (...) => { ... }`,
    // `function name(...) { ... }` and `async function name(...) { ... }`.
    const declaration = /(?:const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*(?::[^=]*)?=>|(?:async\s+)?function\s+(\w+)\s*\()/g;
    const bodies = new Map<string, string>();
    let match;

    while ((match = declaration.exec(content)) !== null) {
        const name = match[1] ?? match[2];
        if (!name) {
            continue;
        }

        // Take the helper's body by balancing braces from the first one after its signature.
        const open = content.indexOf("{", match.index + match[0].length - 1);
        if (open === -1) {
            continue;
        }

        let depth = 0;
        let end = open;
        for (let i = open; i < content.length; i++) {
            if (content[i] === "{") {
                depth++;
            } else if (content[i] === "}") {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }

        bodies.set(name, content.slice(open, end + 1));
    }

    const settling = new Set<string>();
    let grew = true;

    while (grew) {
        grew = false;
        for (const [name, body] of bodies) {
            if (settling.has(name)) {
                continue;
            }

            const reaches =
                body.includes("waitForGraphSettled") ||
                [...settling].some((known) => new RegExp(`\\b${known}\\s*\\(`).test(body));

            if (reaches) {
                settling.add(name);
                grew = true;
            }
        }
    }

    return settling;
}

/**
 * Every `export const Name: Story = {...}` block in a file, by story name.
 *
 * Collected in one pass because a story may take its arguments from another one in the same file
 * -- `args: { ...ForceAtlas2.args, ... }` -- and what it inherits counts as much as what it
 * writes. Each block runs from the export keyword to the brace that closes the object literal.
 * @param content - The story file's full source.
 * @returns The block and the line it starts on, per story, in the order they are written.
 */
function storyBlocks(content: string): Map<string, { block: string; line: number }> {
    const blocks = new Map<string, { block: string; line: number }>();
    const storyPattern = /export\s+const\s+(\w+):\s*Story\s*=\s*\{/g;
    let match;

    while ((match = storyPattern.exec(content)) !== null) {
        const storyStartIndex = match.index;
        let braceCount = 0;
        let storyEndIndex = storyStartIndex;
        let foundFirstBrace = false;

        for (let i = storyStartIndex; i < content.length; i++) {
            if (content[i] === "{") {
                braceCount++;
                foundFirstBrace = true;
            } else if (content[i] === "}") {
                braceCount--;
            }

            if (foundFirstBrace && braceCount === 0) {
                storyEndIndex = i;
                break;
            }
        }

        blocks.set(match[1], {
            block: content.slice(storyStartIndex, storyEndIndex + 1),
            line: content.slice(0, storyStartIndex).split("\n").length,
        });
    }

    return blocks;
}

/**
 * Whether a story names a pre-step count that applies in every lane, its own or an inherited one.
 *
 * A count of zero does not qualify: it is what `storySetup()` leaves behind outside the
 * visual-regression tool, and it is the state this check exists to find. A story that spreads
 * another story's arguments inherits whatever that one named, which is how the weighted variants
 * are covered without repeating the count.
 * @param storyName - The story to answer for.
 * @param blocks - Every story block in the file, from {@link storyBlocks}.
 * @param seen - Story names already visited, so a pair that spread each other cannot loop.
 * @returns True when a count of one or more reaches this story.
 */
function namesPreSteps(
    storyName: string,
    blocks: Map<string, { block: string; line: number }>,
    seen = new Set<string>(),
): boolean {
    if (seen.has(storyName)) {
        return false;
    }

    seen.add(storyName);

    const block = blocks.get(storyName)?.block;
    if (block === undefined) {
        return false;
    }

    if (/preSteps:\s*[1-9]\d*/.test(block)) {
        return true;
    }

    for (const spread of block.matchAll(/\.\.\.(\w+)\.args/g)) {
        if (namesPreSteps(spread[1], blocks, seen)) {
            return true;
        }
    }

    return false;
}

// Check a file for determinism issues
function checkFileForDeterminismIssues(filePath: string): DeterminismIssue[] {
    const issues: DeterminismIssue[] = [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = path.relative(path.join(__dirname, "../.."), filePath);
    const settlingHelpers = settlingHelperNames(content);

    // Check for Math.random() usage
    // This regex looks for Math.random() that is NOT inside a seededRandom function or similar
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for bare Math.random() calls
        if (line.includes("Math.random()")) {
            // Check if this is inside a seededRandom function definition (look at surrounding context)
            const contextStart = Math.max(0, i - 10);
            const contextEnd = Math.min(lines.length, i + 2);
            const context = lines.slice(contextStart, contextEnd).join("\n");

            // If we're inside a seeded random generator function, that's fine
            if (context.includes("seededRandom") || context.includes("createRng") || context.includes("seedrandom")) {
                continue;
            }

            issues.push({
                file: relativePath,
                line: lineNum,
                issue: "Math.random() used without seeded RNG - will produce non-deterministic results",
                severity: "error",
            });
        }
    }

    // Check the physics-based layouts, story block by story block. The blocks are collected
    // first because a story may inherit its arguments from another one in the same file.
    const blocks = storyBlocks(content);

    for (const [storyName, { block: storyBlock, line: storyLineNum }] of blocks) {
        // Check if this story uses a physics-based layout
        const layoutMatch = /layout:\s*["']([\w-]+)["']/.exec(storyBlock);
        if (!layoutMatch) {
            continue;
        }

        const layout = layoutMatch[1];
        if (!PHYSICS_LAYOUTS.includes(layout)) {
            continue;
        }

        // Check for seed in layoutConfig or aliased args
        // Storybook argTypes can map args like "randomSeed" or "ngraphSeed" to "graph.layoutOptions.seed"
        const hasSeed =
            /layoutConfig:\s*\{[^}]*seed:\s*\d+/s.test(storyBlock) ||
            /layoutOptions:\s*\{[^}]*seed:\s*\d+/s.test(storyBlock) ||
            // Check for aliased seed args like ngraphSeed, randomSeed, springSeed, fa2Seed, d3Seed
            /ngraphSeed:\s*\d+/.test(storyBlock) ||
            /randomSeed:\s*\d+/.test(storyBlock) ||
            /springSeed:\s*\d+/.test(storyBlock) ||
            /fa2Seed:\s*\d+/.test(storyBlock) ||
            /d3Seed:\s*\d+/.test(storyBlock);

        // Skip seed check for layouts that don't support seeds (they handle determinism differently)
        if (!hasSeed && layout !== "fixed" && !LAYOUTS_WITHOUT_SEED_SUPPORT.includes(layout)) {
            issues.push({
                file: relativePath,
                line: storyLineNum,
                issue: `Story "${storyName}" uses physics layout "${layout}" without a seed - will produce non-deterministic layouts`,
                severity: "error",
            });
        }

        // Check for preSteps in the story's setup.
        //
        // A SIMULATION IS HELD TO THE COUNT IT NAMES ITSELF. `storySetup()` fills in 2000 under
        // the visual-regression tool and ZERO everywhere else, so a call to it says nothing about
        // the lane that runs the story's play function -- and for a layout the element advances
        // one iteration per rendered frame, zero pre-steps is the whole of the wait. That is what
        // this check used to accept: it took the presence of a `storySetup(` call as proof, which
        // was true while only the visual-regression lane needed a settled picture and stopped
        // being true the day these layouts became simulations. Every other physics layout is
        // finished when `setLayout` returns, so the Chromatic default is all it needs.
        const simulation = SIMULATION_LAYOUTS.includes(layout);
        const hasPreSteps = simulation
            ? namesPreSteps(storyName, blocks)
            : /preSteps:\s*\d+/.test(storyBlock) ||
              /preSteps:\s*isChromatic/.test(storyBlock) ||
              /storySetup\s*\(/.test(storyBlock);

        if (!hasPreSteps) {
            issues.push({
                file: relativePath,
                line: storyLineNum,
                issue: simulation
                    ? `Story "${storyName}" uses simulation layout "${layout}" without a preSteps count of its own - storySetup() leaves preSteps at 0 outside Chromatic, so the layout's iterations are spent one per rendered frame`
                    : `Story "${storyName}" uses physics layout "${layout}" without preSteps - will not settle before Chromatic capture`,
                severity: "error",
            });
        }

        // Check for play function that reaches waitForGraphSettled -- in the story itself, or
        // through one of this file's own helpers. See settlingHelperNames above for why the hop
        // has to be followed rather than grepped for.
        const hasPlayFunction = /play:\s*async/.test(storyBlock);
        const hasWaitForSettled =
            storyBlock.includes("waitForGraphSettled") ||
            [...settlingHelpers].some((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(storyBlock));

        if (!hasPlayFunction || !hasWaitForSettled) {
            issues.push({
                file: relativePath,
                line: storyLineNum,
                issue: `Story "${storyName}" uses physics layout "${layout}" without waitForGraphSettled in play function - will not settle before Chromatic capture`,
                severity: "error",
            });
        }
    }

    return issues;
}

describe("Story Determinism", () => {
    const storyFiles = getStoryFiles();

    test("all story files should use deterministic patterns for Chromatic visual testing", () => {
        const allIssues: DeterminismIssue[] = [];

        for (const file of storyFiles) {
            const issues = checkFileForDeterminismIssues(file);
            allIssues.push(...issues);
        }

        // Filter to only errors for the assertion
        const errors = allIssues.filter((issue) => issue.severity === "error");

        if (errors.length > 0) {
            const errorMessages = errors.map((issue) => `\n  ${issue.file}:${issue.line}\n    ${issue.issue}`);
            assert.fail(
                `Found ${errors.length} determinism error(s) in stories:${errorMessages.join("")}\n\n` +
                    "To fix these issues:\n" +
                    "1. Replace Math.random() with a seeded RNG (e.g., seededRandom(42))\n" +
                    "2. Add 'seed: 42' to layoutConfig for physics-based layouts\n" +
                    "3. See stories/Layout.stories.ts for examples of correct patterns",
            );
        }

        // Also report warnings (but don't fail)
        const warnings = allIssues.filter((issue) => issue.severity === "warning");
        if (warnings.length > 0) {
            console.warn(`\nDeterminism warnings (${warnings.length}):`);
            for (const warning of warnings) {
                console.warn(`  ${warning.file}:${warning.line} - ${warning.issue}`);
            }
        }
    });

    test("checks all stories directory for files", () => {
        assert(storyFiles.length > 0, "Should find story files in stories/ directory");
    });
});
