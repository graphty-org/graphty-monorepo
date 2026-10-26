// A 32-bin log-scale histogram of positive values (durations in ms, mostly): bin edges run from LO to HI by a
// constant factor, so a quantile read from merged histograms is within one bin (a factor of about 1.43) of the
// exact value. Values at or below LO land in bin 0, at or above HI in the last bin.

export const BINS = 32;
/** 1 second and 33 hours: every duration the dashboard judges sits between them. */
export const LO = 1000;
export const HI = 1.2e8;
export const FACTOR = (HI / LO) ** (1 / BINS);

export type Histogram = number[];

export const emptyHistogram = (): Histogram => new Array<number>(BINS).fill(0);

/**
 *
 * @param value
 */
export function binOf(value: number): number {
    if (Number.isNaN(value) || value <= LO) {
        return 0;
    }
    return Math.min(BINS - 1, Math.floor(Math.log(value / LO) / Math.log(FACTOR)));
}

/**
 *
 * @param h
 * @param value
 * @param count
 */
export function addValue(h: Histogram, value: number, count = 1): void {
    h[binOf(value)] += count;
}

/**
 *
 * @param into
 * @param from
 */
export function mergeInto(into: Histogram, from: Histogram): void {
    for (let i = 0; i < BINS; i++) {
        into[i] += from[i] ?? 0;
    }
}

/**
 * The q-quantile (0..1) as the geometric middle of its bin; undefined for an empty histogram.
 * @param h
 * @param q
 */
export function quantile(h: Histogram, q: number): number | undefined {
    const total = h.reduce((a, b) => a + b, 0);
    if (total === 0) {
        return undefined;
    }
    const rank = Math.max(1, Math.ceil(q * total));
    let seen = 0;
    for (let i = 0; i < BINS; i++) {
        seen += h[i];
        if (seen >= rank) {
            return LO * FACTOR ** (i + 0.5);
        }
    }
    return HI;
}
