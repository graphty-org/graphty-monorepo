/**
 * The files each loading step waits for, as the build writes them into the page for the loading
 * screen's log.
 */
import type { Rollup } from "vite";
import { describe, expect, it } from "vitest";

import { bootFiles } from "../../vite.boot-files";

/**
 * Just enough of a built chunk for bootFiles.
 * @param fileName - its file.
 * @param code - its code.
 * @param more - its imports, stylesheets and kind of entry.
 * @returns the chunk.
 */
function chunk(
    fileName: string,
    code: string,
    more: { imports?: string[]; css?: string[]; isEntry?: boolean; facade?: string } = {},
): Rollup.OutputChunk {
    return {
        type: "chunk",
        fileName,
        code,
        imports: more.imports ?? [],
        isEntry: more.isEntry ?? false,
        isDynamicEntry: more.facade !== undefined,
        facadeModuleId: more.facade ?? null,
        viteMetadata: { importedCss: new Set(more.css ?? []), importedAssets: new Set() },
    } as unknown as Rollup.OutputChunk;
}

describe("the loading steps' files", () => {
    it("lists the entry's imports and the frame's own, with their sizes", () => {
        const bundle = {
            "assets/index.js": chunk("assets/index.js", "1234", {
                isEntry: true,
                imports: ["assets/shared.js"],
                css: ["assets/index.css"],
            }),
            "assets/shared.js": chunk("assets/shared.js", "12"),
            "assets/index.css": { type: "asset", fileName: "assets/index.css", source: "abc" },
            "assets/Frame.js": chunk("assets/Frame.js", "123456", {
                facade: "/repo/graphty/src/workspace/frame/Frame.tsx",
                imports: ["assets/shared.js", "assets/panel.js"],
            }),
            "assets/panel.js": chunk("assets/panel.js", String.fromCodePoint(0xe9)),
            "assets/later.js": chunk("assets/later.js", "x", { facade: "/repo/graphty/src/Later.tsx" }),
        } as unknown as Rollup.OutputBundle;

        expect(bootFiles(bundle, "/base/")).toEqual({
            "entry script loaded": {
                "/base/assets/index.js": 4,
                "/base/assets/shared.js": 2,
                "/base/assets/index.css": 3,
            },
            "frame code loaded": { "/base/assets/Frame.js": 6, "/base/assets/panel.js": 2 },
        });
    });
});
