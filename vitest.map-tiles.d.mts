import type { BrowserCommand } from "vitest/node";

/** Every host a source in babylonjs-map's `mapSources` loads tiles from. */
export declare const TILE_HOSTS: readonly string[];
/** Whether a URL asks a known tile server for anything. */
export declare function isTileServer(url: string | URL): boolean;
/** The browser commands that serve map tiles from a fixture and report refused tile requests. */
export declare const mapTileCommands: {
    serveMapTiles: BrowserCommand<[]>;
    takeRefusedMapTiles: BrowserCommand<[]>;
};
