/**
 * @file Where the decoders' WebAssembly is served from, and which decoders may load.
 *
 * By default each decoder module finds its files in this package's `dist/wasm/` folder, as
 * `new URL("../wasm/<file>", import.meta.url)`, which Vite, webpack and Parcel copy into a build.
 * A page that serves them from somewhere else, or a build that leaves a decoder out, says so here
 * before its first model loads.
 */

/** What {@link configureDecoders} takes. */
export interface DecoderOptions {
    /**
     * The folder the decoder files are served from (a copy of `babylonjs-models/dist/wasm/`), as
     * an absolute URL or one relative to the page. Default: beside the package's own modules.
     */
    readonly baseUrl?: string | URL;
    /** `false` turns the Draco decoder off: a glTF with Draco geometry is refused with `E_MODEL_DECODER_UNAVAILABLE`. */
    readonly draco?: false;
    /** `false` turns the KTX2 transcoders off: a glTF that requires KTX2 pictures is refused, one that only uses them draws its fallback. */
    readonly ktx2?: false;
    /** `false` turns the meshopt decoder off: a glTF with meshopt geometry is refused. */
    readonly meshopt?: false;
    /** `false` turns the OpenUSD importer off: a USD or USDZ model is refused with `E_MODEL_DECODER_UNAVAILABLE`. */
    readonly usd?: false;
}

let settings: DecoderOptions = {};

/**
 * Say where the decoder files are served from, or turn a decoder off. Call it before the first
 * model that needs a decoder loads: a decoder reads its file locations once, when it is first used.
 * Each call merges into what earlier calls set.
 * @param options - The base URL, and the decoders to turn off.
 */
export function configureDecoders(options: DecoderOptions): void {
    settings = { ...settings, ...options };
}

/**
 * Whether a decoder may load.
 * @param kind - The decoder.
 * @returns False when {@link configureDecoders} turned it off.
 */
export function allowed(kind: "draco" | "ktx2" | "meshopt" | "usd"): boolean {
    return settings[kind] !== false;
}

/**
 * The absolute URL of one decoder file.
 * @param name - The file's name in `dist/wasm/`.
 * @param packaged - Where the package keeps it, as its module names it.
 * @returns The configured folder's copy, or the packaged one.
 */
export function decoderFile(name: string, packaged: URL): string {
    if (settings.baseUrl === undefined) {
        return packaged.href;
    }

    const page = (globalThis as { document?: { baseURI: string } }).document?.baseURI;
    const base = new URL(String(settings.baseUrl), page);
    return new URL(name, base.href.endsWith("/") ? base : `${base.href}/`).href;
}
