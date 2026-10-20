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

const DAY_MS = 24 * 3600 * 1000;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/**
 * When a project was last saved or opened, as a reader says it: "2 hours ago", "Yesterday",
 * "Oct 9", or with the year when it is not this year's.
 * @param at - ms since the epoch.
 * @param now - the time to count from.
 * @returns the words.
 */
export function agoWords(at: number, now: number = Date.now()): string {
    const minutes = Math.floor((now - at) / 60_000);
    if (minutes < 1) {
        return "Just now";
    }
    if (minutes < 60) {
        return `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }
    const then = new Date(at);
    const today = new Date(now);
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (at >= midnight) {
        const hours = Math.floor(minutes / 60);
        return `${String(hours)} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    if (at >= midnight - DAY_MS) {
        return "Yesterday";
    }
    return then.getFullYear() === today.getFullYear() ? MONTH_DAY.format(then) : MONTH_DAY_YEAR.format(then);
}

/**
 * When a project was last saved or opened.
 * @param at - ms since the epoch.
 * @returns the date and time.
 */
export function whenWords(at: number): string {
    return WHEN.format(at);
}
