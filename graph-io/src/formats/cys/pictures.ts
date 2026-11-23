/**
 * The pictures a Cytoscape session carries for its image annotations. Cytoscape desktop keeps an image annotation's
 * picture under the URL it was loaded from (`URL=file:/C:/Users/.../sample-2.png` in the network's `__Annotations`
 * column) and saves the picture itself in the session, as `apps/org.cytoscape.ding.customgraphicsmgr/<id>.png`, with
 * `image_metadata.props` naming each id's URL (`40=<class>,40,<url>,<tags>`); opening the session draws the saved
 * picture whatever the URL. The reader gives such an annotation the saved picture as a `data:` URL, so it draws
 * wherever the file is opened, as a yEd file's embedded pictures do.
 */

import { readText } from "../../common/input.js";
import { ImportReportBuilder } from "../../common/report.js";
import { ImportError } from "../../types.js";
import { FORMAT } from "./constants.js";
import { PICTURE_FOLDER, type Session, type SessionEntry } from "./session.js";
import { type CyTable } from "./tables.js";
import { parseJavaProperties } from "./vizmap-props.js";

/** The column Cytoscape desktop keeps a network's annotations in. */
const ANNOTATIONS_COLUMN = "__Annotations";

/** A picture's media type by its file extension. */
const MEDIA: Readonly<Record<string, string>> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
};

/**
 * The URL each saved picture was loaded from, by the picture's id, from `image_metadata.props`.
 * @param text - the file, decoded
 * @returns the ids by URL
 */
function pictureIds(text: string): Map<string, string> {
    const ids = new Map<string, string>();
    for (const [id, value] of parseJavaProperties(text)) {
        // Cytoscape splits the value at its commas: class, id, URL, tags
        const url = value.split(",")[2] as string | undefined;
        if (url !== undefined && url !== "" && !ids.has(url)) {
            ids.set(url, id);
        }
    }
    return ids;
}

/**
 * Bytes as base64.
 * @param bytes - the bytes
 * @returns base64
 */
function base64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCodePoint(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

/**
 * Resolves the URLs of a session's image annotations to the pictures it saved, reading the pictures only when an
 * annotation names one.
 */
export class SessionPictures {
    private ids: Promise<Map<string, string>> | null = null;
    private readonly urls = new Map<string, Promise<string | null>>();
    /** The names of the entries read, which are not skipped. */
    readonly read = new Set<string>();

    /**
     * Read nothing yet.
     * @param session - the session
     * @param entries - its entries under {@link PICTURE_FOLDER}
     */
    constructor(
        private readonly session: Session,
        private readonly entries: readonly SessionEntry[],
    ) {}

    /**
     * A network table's rows with each image annotation's URL replaced by its saved picture, where the session saved
     * one.
     * @param table - the table
     * @param report - the report a damaged entry fails
     * @returns the rows by key, the table's own when nothing changed
     */
    async resolveRows(table: CyTable, report: ImportReportBuilder): Promise<ReadonlyMap<string, readonly string[]>> {
        const at = table.columns.findIndex((c) => c.name === ANNOTATIONS_COLUMN);
        if (at < 0 || this.entries.length === 0) {
            return table.rows;
        }
        const rows = new Map<string, readonly string[]>();
        for (const [key, cells] of table.rows) {
            rows.set(key, await this.resolve(at, cells, report));
        }
        return rows;
    }

    /**
     * A row's cells with each image annotation's URL replaced by its saved picture.
     * @param at - the index of the annotations column
     * @param cells - the row's cells
     * @param report - the report a damaged entry fails
     * @returns the cells, the same array when nothing changed
     */
    private async resolve(
        at: number,
        cells: readonly string[],
        report: ImportReportBuilder,
    ): Promise<readonly string[]> {
        const cell = cells[at] as string | undefined;
        if (!cell?.includes("URL=")) {
            return cells;
        }
        let out = cell;
        for (const [, url] of cell.matchAll(/(?:^|\|)URL=([^|\r\n]*)/g)) {
            const picture = await this.pictureOf(url, report);
            if (picture !== null) {
                out = out.replaceAll(`URL=${url}`, `URL=${picture}`);
            }
        }
        return out === cell ? cells : cells.map((c, i) => (i === at ? out : c));
    }

    /**
     * The saved picture loaded from a URL, as a `data:` URL.
     * @param url - the URL the annotation names
     * @param report - the report a damaged entry fails
     * @returns the picture, or null when the session saved none for it
     */
    private pictureOf(url: string, report: ImportReportBuilder): Promise<string | null> {
        let pending = this.urls.get(url);
        if (pending === undefined) {
            pending = this.readPicture(url, report);
            this.urls.set(url, pending);
        }
        return pending;
    }

    /**
     * Read the saved picture loaded from a URL.
     * @param url - the URL
     * @param report - the report a damaged entry fails
     * @returns the picture, or null
     */
    private async readPicture(url: string, report: ImportReportBuilder): Promise<string | null> {
        this.ids ??= this.readIds(report);
        const id = (await this.ids).get(url);
        const entry = this.entries.find((e) => {
            const name = e.path.slice(PICTURE_FOLDER.length);
            return name.slice(0, name.lastIndexOf(".")) === id;
        });
        const media =
            entry === undefined ? undefined : MEDIA[entry.path.slice(entry.path.lastIndexOf(".") + 1).toLowerCase()];
        if (entry === undefined || media === undefined) {
            return null;
        }
        const bytes = await this.session.read(entry, report);
        this.read.add(entry.name);
        return `data:${media};base64,${base64(bytes)}`;
    }

    /**
     * Read `image_metadata.props`.
     * @param report - the report a damaged entry fails
     * @returns the ids by URL, none when the session has no such file
     */
    private async readIds(report: ImportReportBuilder): Promise<Map<string, string>> {
        const props = this.entries.find((e) => e.path === `${PICTURE_FOLDER}image_metadata.props`);
        if (props === undefined) {
            return new Map();
        }
        const bytes = await this.session.read(props, report);
        this.read.add(props.name);
        try {
            // java.util.Properties.store writes ISO-8859-1
            const text = await readText(bytes, new ImportReportBuilder(FORMAT, 0), {
                signal: null,
                encoding: "iso-8859-1",
                allowEmpty: true,
            });
            return pictureIds(text);
        } catch (err) {
            // a props file that is not text names no picture: the annotations keep their URLs
            if (err instanceof ImportError) {
                return new Map();
            }
            throw err;
        }
    }
}
