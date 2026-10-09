/** The words Recent projects shows for an entry. */

const THIS_YEAR = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});
const OTHER_YEAR = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

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
 * When a project was last saved or opened, as a note's time is written ("Oct 9, 5:58 AM"), with
 * the year only when it is not this year. It never breaks across lines: a Recent row that wraps
 * moves the whole date down rather than leave "AM" alone on a line.
 * @param at - ms since the epoch.
 * @param now - the time to compare the year with.
 * @returns the date and time, its spaces non-breaking.
 */
export function whenWords(at: number, now = Date.now()): string {
    const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
    return (sameYear ? THIS_YEAR : OTHER_YEAR).format(at).replaceAll(/\s/g, "\u00a0");
}
