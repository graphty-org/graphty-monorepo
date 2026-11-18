import type { Plugin, Rollup } from "vite";

type OutputBundle = Rollup.OutputBundle;
type OutputChunk = Rollup.OutputChunk;

/** A step of the loading screen's log, by its name there, and the files it waits for with their sizes. */
export type BootFiles = Record<string, Record<string, number>>;

/** The dynamic import whose files the log's "frame code loaded" step waits for (src/workspace/frameLoader.ts). */
const FRAME = "/src/workspace/frame/Frame.tsx";

/**
 * A chunk and every chunk it imports statically, with their stylesheets: what the browser must
 * fetch before the chunk runs.
 * @param bundle - the build's output.
 * @param start - the chunk's file name.
 * @returns the file names, in no particular order.
 */
function closure(bundle: OutputBundle, start: string): Set<string> {
    const seen = new Set<string>();
    const visit = (name: string): void => {
        const chunk = bundle[name];
        if (seen.has(name) || chunk?.type !== "chunk") {
            return;
        }
        seen.add(name);
        chunk.viteMetadata?.importedCss.forEach((css) => seen.add(css));
        chunk.imports.forEach(visit);
    };
    visit(start);
    return seen;
}

/**
 * The files the loading screen's measured steps wait for: the entry script and its imports, and the
 * open project's frame code less what the entry already brought.
 * @param bundle - the build's output.
 * @param base - the site's base path, which the page's request addresses start with.
 * @returns each step's files, by their address path, with their size in bytes.
 */
export function bootFiles(bundle: OutputBundle, base: string): BootFiles {
    const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === "chunk");
    const entry = chunks.find((c) => c.isEntry);
    const frame = chunks.find((c) => c.isDynamicEntry && c.facadeModuleId?.endsWith(FRAME));
    const entryFiles = entry ? closure(bundle, entry.fileName) : new Set<string>();
    const sized = (names: Iterable<string>): Record<string, number> =>
        Object.fromEntries(
            [...names].map((name) => {
                const out = bundle[name];
                const body = out.type === "chunk" ? out.code : out.source;
                return [base + name, typeof body === "string" ? Buffer.byteLength(body) : body.byteLength];
            }),
        );
    const files: BootFiles = {};
    if (entry) {
        files["entry script loaded"] = sized(entryFiles);
    }
    if (frame) {
        files["frame code loaded"] = sized([...closure(bundle, frame.fileName)].filter((n) => !entryFiles.has(n)));
    }
    return files;
}

/**
 * Writes the files the loading screen's steps wait for into the built page, as
 * `<script type="application/json" id="graphty-boot-files">`, so its log can say how much of each
 * has arrived (index.html). The dev server has no bundle and writes nothing.
 * @returns the Vite plugin.
 */
export function bootFilesPlugin(): Plugin {
    let base = "/";
    return {
        name: "graphty-boot-files",
        apply: "build",
        configResolved(config) {
            ({ base } = config);
        },
        transformIndexHtml: {
            order: "post",
            handler: (_html, ctx) =>
                ctx.bundle
                    ? [
                          {
                              tag: "script",
                              attrs: { type: "application/json", id: "graphty-boot-files" },
                              // "<" escaped so no file name can end the script element.
                              children: JSON.stringify(bootFiles(ctx.bundle, base)).replaceAll("<", String.raw`\u003c`),
                              injectTo: "head",
                          },
                      ]
                    : [],
        },
    };
}
