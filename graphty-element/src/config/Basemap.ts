import type { MapSourceId } from "babylonjs-map";
import { z } from "zod";

/**
 * A named map source: one of babylonjs-map's keyless sources (`natural-earth`, the bundled
 * public-domain world image and the default, `openstreetmap`, `opentopomap`,
 * `nasa-gibs-blue-marble`, `usgs-topo`, `usgs-imagery`, `eox-s2cloudless-2016`), or `none` for the
 * layout with no picture under it.
 * @since 3.31.0
 */
export type BasemapSourceId = MapSourceId | "none";

const projection = z.enum(["web-mercator", "equirectangular"]);
const bounds = z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]);
/**
 * Whether the element draws the map's credits in the canvas's bottom-right corner (the default).
 * Every map source's terms require visible credits: set false only when the page shows
 * `basemapStatus.attribution` itself.
 */
const attributionShown = z.boolean().optional();

/**
 * The map the element draws under a geographic layout (the `location-map` layout): a named source,
 * a raster tile service, or one picture of a box of the earth. Drawn only while such a layout is
 * active, so it can be set once and survives switching layouts. Unset, the bundled Natural Earth
 * world image, which contacts no third party.
 * @since 3.31.0
 */
export const Basemap = z.union([
    z.strictObject({ source: z.string() as z.ZodType<BasemapSourceId>, attributionShown }),
    z.strictObject({
        /** An XYZ URL template: `{z}`, `{x}`, `{y}`, `{-y}`, `{s}` and `{r}`. */
        tiles: z.string().min(1),
        /** The credit the provider requires, shown whenever its tiles are. */
        attribution: z.string(),
        projection: projection.optional(),
        tileSize: z.number().int().positive().optional(),
        minZoom: z.number().int().nonnegative().optional(),
        maxZoom: z.number().int().nonnegative().optional(),
        subdomains: z.array(z.string()).optional(),
        attributionShown,
    }),
    z.strictObject({
        /** The picture's URL. */
        image: z.string().min(1),
        /** The box it shows, `[[west, south], [east, north]]` in degrees; default the whole world. */
        bounds: bounds.optional(),
        /** The projection it is drawn in; default equirectangular. */
        projection: projection.optional(),
        attribution: z.string().optional(),
        attributionShown,
    }),
]);

/** See {@link Basemap}. @since 3.31.0 */
export type BasemapConfig = z.infer<typeof Basemap>;

/**
 * What the map under a geographic layout is doing, for an application to show: which source,
 * whether its pictures are loading, drawn, or failed (so the bundled world shows instead), and
 * the credits of everything drawn, which must be visible whenever the map is.
 * @since 3.31.0
 */
export interface BasemapStatus {
    /** The source drawn: its id, `tiles`, `image`, or `none`. */
    readonly source: string;
    /** `off` when no geographic layout is active or the source is `none`. */
    readonly state: "off" | "loading" | "ready" | "fallback";
    /** The credits of every source drawn, without repeats. */
    readonly attribution: readonly string[];
}
