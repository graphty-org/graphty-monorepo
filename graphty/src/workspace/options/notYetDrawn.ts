/**
 * Run options graphty-element offers that the app does not draw yet: the per-run weight of
 * closeness and HITS and PageRank's edge direction (issue #313). Their controls come with the
 * per-card Weight and Direction design; until then a run takes the element's default, which
 * computes as these algorithms always have.
 */
const NOT_YET_DRAWN: Readonly<Record<string, readonly string[]>> = {
    closeness: ["weight"],
    hits: ["weight"],
    pagerank: ["directed"],
};

/**
 * Whether the app draws an algorithm's option.
 * @param algorithm - The algorithm's key, or undefined for a form that sets up no algorithm.
 * @param option - The option's name.
 * @returns False for an option whose control is not designed yet.
 */
export function drawnYet(algorithm: string | undefined, option: string): boolean {
    return algorithm === undefined || !(NOT_YET_DRAWN[algorithm]?.includes(option) ?? false);
}
