import { StyleSchemaV1, StyleTemplate } from "./config";

/**
 * The element's configuration document: everything about a graph that is not a style layer.
 *
 * WHAT IT CARRIES. The id paths a record is read with, the view mode, the background, the layout
 * and its options, the algorithms to run on load, and the behaviour settings. Every one of those
 * is reachable from a property on `<graphty-element>`; this is where the element keeps them.
 *
 * WHAT IT NO LONGER CARRIES. A stack of jmespath-selector style layers, and the methods that
 * resolved one per element. Style layers are `session.styles`: addressed by a stable id rather
 * than by an array index, compiled once into a predicate rather than re-parsed per element, and
 * able to say what they painted and why. A document loaded from 1.x may still carry a `layers`
 * array and an `addDefaultStyle` flag; both parse and neither is read, because this object is a
 * strict schema and dropping a key would refuse a whole document over one field.
 *
 * NOT EXPORTED FROM THE PACKAGE. A consumer reads and writes layers through `session.styles` and
 * the element's own properties.
 */
export class Styles {
    readonly #read: () => StyleSchemaV1;

    /**
     * Creates a new Styles instance from a configuration document, or from a function that reads
     * one.
     * @param config - The parsed document, or the reader a graph builds its frozen view with.
     */
    constructor(config: StyleSchemaV1 | (() => StyleSchemaV1)) {
        this.#read = typeof config === "function" ? config : () => config;
    }

    /**
     * The configuration document.
     *
     * On a graph it is a FROZEN VIEW: the project settings from the session's `config` slice,
     * merged with the graph's view settings, rebuilt only when one of them changes. Two reads with
     * no change between them return the same object, and writing into it throws. Change a setting
     * through the element's properties, `Graph`'s setters or `session.config.set`.
     * @returns The document.
     */
    get config(): StyleSchemaV1 {
        return this.#read();
    }

    /**
     * Creates a Styles instance from a JSON string.
     * @param json - JSON string containing the configuration
     * @returns New Styles instance
     */
    static fromJson(json: string): Styles {
        const o = JSON.parse(json);
        return this.fromObject(o);
    }

    /**
     * Creates a Styles instance from a plain object.
     * @param obj - Object containing the configuration
     * @returns New Styles instance
     */
    static fromObject(obj: object): Styles {
        return new Styles(StyleTemplate.parse(obj));
    }

    /**
     * Fetches and creates a Styles instance from a URL.
     * @param url - URL to fetch the configuration from
     * @returns Promise resolving to new Styles instance
     */
    static async fromUrl(url: string): Promise<Styles> {
        const response = await fetch(url);
        if (!response.body) {
            throw new Error("JSON response had no body");
        }

        const data = await response.json();

        return Styles.fromObject(data);
    }

    /**
     * Creates a default Styles instance with minimal configuration.
     * @returns New default Styles instance
     */
    static default(): Styles {
        return Styles.fromObject({
            graphtyTemplate: true,
            majorVersion: "1",
        });
    }
}
