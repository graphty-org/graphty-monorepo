/** The words Recent projects shows for an entry. */

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/**
 * A project's size as the element last reported it.
 * @param nodes - its node count, or null.
 * @returns "77 nodes", or an empty string.
 */
export function sizeWords(nodes: number | null): string {
    if (nodes === null) {
        return "";
    }
    return `${nodes.toLocaleString("en-US")} ${nodes === 1 ? "node" : "nodes"}`;
}

/**
 * When a project was last saved or opened.
 * @param at - ms since the epoch.
 * @returns the date and time.
 */
export function whenWords(at: number): string {
    return WHEN.format(at);
}
