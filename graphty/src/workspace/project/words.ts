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
