/**
 * @file Reading an instant on a named zone's wall clock, and back.
 *
 * A wall clock is written here as the number of milliseconds the same date and time would be in
 * UTC, so the plain UTC calendar arithmetic in `./parse` runs on it unchanged.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** The zone every default reads in. Its arithmetic never goes near `Intl`. */
export const UTC_ZONE = "UTC";

const MS_PER_DAY = 86_400_000;
/** The furthest instant a `Date` holds, either side of 1970. */
const MAX_INSTANT = 8.64e15;

/** One formatter per zone: building one costs far more than using it. */
const formats = new Map<string, Intl.DateTimeFormat>();

/**
 * The formatter that reads an instant's fields in a zone. It asks for the era, so a BCE year does
 * not read as its positive twin.
 * @param zone - The zone.
 * @returns The formatter.
 * @throws A `RangeError` for a name that is no zone.
 */
function formatOf(zone: string): Intl.DateTimeFormat {
    let format = formats.get(zone);
    if (format === undefined) {
        format = new Intl.DateTimeFormat("en-US", {
            timeZone: zone,
            calendar: "gregory",
            era: "short",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hourCycle: "h23",
        });
        formats.set(zone, format);
    }

    return format;
}

/**
 * Whether a value names a time zone.
 * @param zone - The value.
 * @returns True for a name `Intl` knows.
 */
export function isTimeZone(zone: unknown): zone is string {
    if (typeof zone !== "string") {
        return false;
    }

    try {
        formatOf(zone);
        return true;
    } catch {
        return false;
    }
}

/**
 * How far a zone's clock is ahead of UTC at an instant, to the second (a zone's offset before
 * standard time is not a whole number of minutes).
 * @param at - The instant.
 * @param zone - The zone.
 * @returns The offset in milliseconds.
 */
function offsetAt(at: number, zone: string): number {
    if (Number.isNaN(at)) {
        return 0;
    }

    const seconds = Math.floor(Math.max(-MAX_INSTANT, Math.min(MAX_INSTANT, at)) / 1000) * 1000;
    const fields: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
    for (const { type, value } of formatOf(zone).formatToParts(seconds)) {
        fields[type] = value;
    }

    const year = Number(fields.year);
    const date = new Date(0);
    date.setUTCFullYear(fields.era === "BC" ? 1 - year : year, Number(fields.month) - 1, Number(fields.day));
    date.setUTCHours(Number(fields.hour), Number(fields.minute), Number(fields.second));

    return date.getTime() - seconds;
}

/**
 * An instant as a zone's clock shows it.
 * @param at - The instant.
 * @param zone - The zone.
 * @returns The wall clock.
 */
export function wallClock(at: number, zone: string): number {
    return zone === UTC_ZONE ? at : at + offsetAt(at, zone);
}

/**
 * The instant a zone's clock shows a wall clock. A time a change skipped reads in the offset before
 * it, which lands as far past the gap as the time was into it, so a removed midnight is the day's
 * first moment. A time a change repeated reads as the first of the two.
 * @param wall - The wall clock.
 * @param zone - The zone.
 * @returns The instant.
 */
export function instantOfWall(wall: number, zone: string): number {
    if (zone === UTC_ZONE) {
        return wall;
    }

    // ponytail: two `Intl` reads a value, about 9 us against 0.6 us in UTC, so a million text values
    // in a named zone parse in about 9 s; cache offsets per day if that build matters.
    const before = offsetAt(wall - MS_PER_DAY, zone);
    const after = offsetAt(wall + MS_PER_DAY, zone);
    if (before === after) {
        return wall - before;
    }

    const earlier = wall - Math.max(before, after);
    const later = wall - Math.min(before, after);
    if (wallClock(earlier, zone) === wall) {
        return earlier;
    }

    return wallClock(later, zone) === wall ? later : wall - before;
}
