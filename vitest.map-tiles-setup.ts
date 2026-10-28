/**
 * @file In a browser project's `setupFiles`, with `mapTileCommands` from `vitest.map-tiles.mjs` in
 * its `commands`: map tiles come from a local fixture, and a test whose page asked an unknown host
 * for a tile fails, naming it. See `vitest.map-tiles.mjs`.
 */

import { afterEach, beforeAll } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answer every known tile server from the fixture, and refuse an unknown tile host. */
        serveMapTiles: () => Promise<void>;
        /** The unknown tile requests refused since the last call. */
        takeRefusedMapTiles: () => Promise<string[]>;
    }
}

beforeAll(async () => {
    await commands.serveMapTiles();
});

afterEach(async () => {
    const urls = await commands.takeRefusedMapTiles();
    if (urls.length > 0) {
        throw new Error(
            `This test asked a map tile host no fixture answers: ${urls.join(", ")}. ` +
                "Tests never reach a tile server; add the host to TILE_HOSTS in vitest.map-tiles.mjs.",
        );
    }
});
