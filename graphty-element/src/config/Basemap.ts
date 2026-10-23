import type { MapSourceId } from "babylonjs-map";
import type { LocationFormat } from "babylonjs-map/location";
import type { GeoBounds, ProjectionId } from "babylonjs-map/projection";
import { z } from "zod";

/**
 * A named map source: one of babylonjs-map's keyless sources (`natural-earth`, the bundled
 * public-domain world image and the default, `natural-earth-gray`, the same picture as a plain
 * light gray backdrop, `openstreetmap`, `opentopomap`,
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
 * How the map looks past the box the layout fitted to the data: `continue` (the default) draws
 * the map on past it, so panning or zooming out still shows map; `clip` ends the picture at the
 * box.
 */
const beyond = z.enum(["continue", "clip"]).optional();

/**
 * The map the element draws under a geographic layout (the `location-map` layout): a named source,
 * a raster tile service, or one picture of a box of the earth. Drawn only while such a layout is
 * active, so it can be set once and survives switching layouts. Unset, the bundled Natural Earth
 * world image, which contacts no third party.
 * @since 3.31.0
 */
export const Basemap = z.union([
    z.strictObject({ source: z.string() as z.ZodType<BasemapSourceId>, attributionShown, beyond }),
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
        beyond,
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
        beyond,
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

/**
 * Where the location map layout read its locations: the two columns it used (with the half of the
 * pair it found by name, when only the other was set), the one column and the format it read
 * it in, or the column of place names and the kind of place it read them as. An application names the columns "Automatic" chose from this.
 * @since 3.31.0
 */
export type LocationSourceFact =
    | {
          readonly kind: "columns";
          readonly latitude: string;
          readonly longitude: string;
          readonly filled: "latitude" | "longitude" | null;
      }
    | { readonly kind: "location"; readonly column: string; readonly format: LocationFormat }
    | {
          readonly kind: "place";
          /** The column of place names. */
          readonly column: string;
          /** The kind of place it was read as; null when no name matched. */
          readonly role: "country" | "region" | "city" | null;
          /** The column that narrowed each name, or null. */
          readonly within: string | null;
          /** The credits owed for the place data used (GeoNames for cities), shown with the map's. */
          readonly attribution: readonly { readonly text: string; readonly url: string }[];
      };

/**
 * How the active location map layout lays out its map, as plain facts (`element.mapFrame`): the
 * surface, the box a flat map shows or a globe's radius, where the locations were read, and the
 * nodes it could not place.
 * @since 3.31.0
 */
export type MapFrameFact = {
    /** 2 in the 2D view, 3 in the 3D view. */
    readonly dimensions: 2 | 3;
    readonly location: LocationSourceFact;
    /** The ids of the nodes with no place on the map. */
    readonly unplaced: readonly (string | number)[];
    /**
     * The warnings the run reported about reading the locations (`W_LOCATION_*`), each a code and
     * its parameters, as its `layout-warning` events carried them.
     */
    readonly warnings: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
} & (
    | {
          readonly surface: "flat";
          readonly projection: ProjectionId;
          /** The box shown, `[[west, south], [east, north]]`; east passes 180 across the date line. */
          readonly bounds: GeoBounds;
          /** Scene units across the box's longer side. */
          readonly size: number;
      }
    | { readonly surface: "globe"; readonly radius: number }
);
