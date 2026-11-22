import type { BrowserCommand } from "vitest/node";

/** Where the local copy of Babylon.js's GLSL compilers is kept. */
export declare const COMPILERS_DIR: string;
/** Make sure the local copy holds glslang and twgsl, downloading what is missing. */
export declare function fetchBabylonCompilers(): Promise<void>;
/** The browser command that answers the page's compiler requests from the local copy. */
export declare const babylonCompilerCommands: {
    serveBabylonCompilers: BrowserCommand<[]>;
};
/** Serve the compilers from the local copy in every browser project of a vitest config. */
export declare function withBabylonCompilers<T>(config: T): T;
