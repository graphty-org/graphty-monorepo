/**
 * The starting cameras are ordinary saved cameras (design/ui/camera-views-tours-and-capture.md,
 * section 3.3): no app code branches on their names or on the camera views they follow. The
 * camera view ids appear only in the app's words for them (`viewWords.ts`) and in the starting
 * list the workspace writes once into a new project (`Workspace.tsx`); the starting names appear
 * in the toolbar, the Views place and Export only as those words. Tests and stories are fixtures
 * and are not searched. Master's camera code, which runs only with the camera-views experiment off
 * (the standard views in toolbar/commands.ts, master's Image and Video outputs), is left out too:
 * it goes when the experiment graduates.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const IDS = /\b(topView|bottomView|sideView|frontView|isometric)\b/;
const NAMES = /["'`](Top|Bottom|Front|Side|Isometric)["'`]/;
const WORDS = "workspace/toolbar/viewWords.ts";
/** Master's Image and Video outputs, kept whole for the camera-views experiment off. */
const MASTER = ["workspace/export/ImageOutput.tsx:", "workspace/export/VideoOutput.tsx:"];

/**
 * Whether a match is master's camera code, kept while the camera-views experiment is off: a line of
 * master's outputs, or a line naming master's standard view commands (`view.front` and the rest).
 * @param line - "file:line: text".
 * @returns true for master's code.
 */
function master(line: string): boolean {
    return MASTER.some((file) => line.startsWith(file)) || /"view\.(front|side|top|isometric)"/.test(line);
}

/**
 * The app's source files under a folder, tests and stories left out.
 * @param folder - the folder, relative to src.
 * @returns the paths relative to src.
 */
function sources(folder: string): string[] {
    return readdirSync(join(SRC, folder), { recursive: true, encoding: "utf8" })
        .map((file) => join(folder, file).replaceAll("\\", "/"))
        .filter(
            (file) =>
                /\.tsx?$/.test(file) &&
                !file.includes("__tests__/") &&
                !/\.(test|stories)\.tsx?$/.test(file) &&
                !file.includes("/stories/"),
        );
}

/**
 * Every line of the files matching a pattern.
 * @param files - the files, relative to src.
 * @param pattern - the pattern.
 * @returns "file:line: text" for each match.
 */
function matches(files: string[], pattern: RegExp): string[] {
    return files.flatMap((file) =>
        readFileSync(join(SRC, file), "utf8")
            .split("\n")
            .flatMap((line, at) => (pattern.test(line) ? [`${file}:${at + 1}: ${line.trim()}`] : [])),
    );
}

describe("no special cameras", () => {
    const places = ["workspace/toolbar", "workspace/views-place", "workspace/export"].flatMap(sources);

    it("finds the toolbar, the Views place and Export", () => {
        assert.include(places, WORDS);
        assert.isTrue(places.some((file) => file.startsWith("workspace/views-place/")));
        assert.isTrue(places.some((file) => file.startsWith("workspace/export/")));
    });

    it("names no camera view id in the toolbar, the Views place or Export, except in viewWords", () => {
        assert.deepEqual(
            matches(places, IDS).filter((line) => !line.startsWith(`${WORDS}:`) && !master(line)),
            [],
        );
    });

    it("quotes no starting camera's name in the toolbar, the Views place or Export, except in viewWords", () => {
        assert.deepEqual(
            matches(places, NAMES).filter((line) => !line.startsWith(`${WORDS}:`) && !master(line)),
            [],
        );
    });

    it("names the camera view ids across the app only in Workspace.tsx's starting list and viewWords", () => {
        const found = matches(sources("."), IDS).filter((line) => !master(line));
        assert.deepEqual(
            [...new Set(found.map((line) => line.slice(0, line.indexOf(":"))))].sort(),
            ["workspace/Workspace.tsx", WORDS].sort(),
        );
        // In Workspace.tsx, only the starting list: each line names a camera and the view it follows.
        for (const line of found.filter((each) => each.startsWith("workspace/Workspace.tsx:"))) {
            assert.match(line, /\{ name: "\w+", follows: "\w+"(, key: "\d")? \}/, line);
        }
    });
});
