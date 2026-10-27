/**
 * @file No test reaches a map tile server. A browser test that draws a map over a tiled source
 * (OpenStreetMap, OpenTopoMap, ...) is answered from a local fixture tile instead, because the
 * servers' usage policies forbid automated traffic (https://operations.osmfoundation.org/policies/tiles/)
 * and a test must not depend on the network.
 *
 * `mapTileCommands` goes in a browser project's `commands`, and `vitest.map-tiles-setup.ts` in its
 * `setupFiles`: the setup installs the fixture before the file's tests run, and after each test
 * fails it if the page asked an unknown host for something shaped like a tile (`/{z}/{x}/{y}`),
 * which is a tile source this list has not met. That request is refused, never sent.
 */

import { Buffer } from "node:buffer";
import { URL } from "node:url";

/** Every host a source in babylonjs-map's `mapSources` loads tiles from (its tests check this). */
export const TILE_HOSTS = [
    "tile.openstreetmap.org",
    "a.tile.opentopomap.org",
    "b.tile.opentopomap.org",
    "c.tile.opentopomap.org",
    "gibs.earthdata.nasa.gov",
    "basemap.nationalmap.gov",
    "tiles.maps.eox.at",
];

/** A 1 x 1 light gray PNG: every tile the fixture serves. */
const FIXTURE_TILE = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGO4CwAA3wDeKXlwtgAAAABJRU5ErkJggg==",
    "base64",
);

/** A path that ends in three numbers, the shape of a `{z}/{x}/{y}` tile, with or without an extension. */
const TILE_PATH = /\/\d+\/\d+\/\d+(?:\.(?:png|jpe?g|webp|pbf))?$/i;

/** Hosts a test serves itself. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * Whether a URL asks a known tile server for anything.
 * @param url - The request's URL.
 * @returns True when the fixture answers it.
 */
export function isTileServer(url) {
    return TILE_HOSTS.includes(new URL(url).hostname);
}

/**
 * Whether a URL asks a host this list does not know for something shaped like a tile.
 * @param url - The request's URL.
 * @returns True when the guard refuses it.
 */
function isUnknownTile(url) {
    return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !LOCAL_HOSTS.has(url.hostname) &&
        !isTileServer(url) &&
        TILE_PATH.test(url.pathname)
    );
}

/** The browser contexts the fixture is installed in, and the unknown tile requests each refused. */
const refused = new WeakMap();

/** The browser commands; typed in vitest.map-tiles.d.mts. */
export const mapTileCommands = {
    /**
     * Answer every known tile server from the fixture, and refuse an unknown tile host.
     * @param ctx - The browser command context.
     */
    async serveMapTiles(ctx) {
        if (refused.has(ctx.context)) {
            return;
        }
        refused.set(ctx.context, []);
        await ctx.context.route(isTileServer, (route) =>
            route.fulfill({ status: 200, contentType: "image/png", body: FIXTURE_TILE }),
        );
        await ctx.context.route(isUnknownTile, (route) => {
            refused.get(ctx.context)?.push(route.request().url());
            return route.abort("blockedbyclient");
        });
    },
    /**
     * The unknown tile requests refused since the last call.
     * @param ctx - The browser command context.
     * @returns Their URLs.
     */
    takeRefusedMapTiles(ctx) {
        const urls = refused.get(ctx.context) ?? [];
        refused.set(ctx.context, []);
        return urls;
    },
};
