/**
 * The parameters of the GitHub source. Experimental.
 */

/**
 * Which file to load from a GitHub repository. Experimental.
 * @category Network sources
 */
export interface GithubParams {
    /** The repository, `owner/name` ("graphty-org/graphty-monorepo"). */
    readonly repository: string;
    /** The file's path in the repository ("data/karate.graphml"), or with `release`, the asset's name. */
    readonly path: string;
    /** A branch, tag or commit; default the repository's default branch. Not used with `release`. */
    readonly ref?: string | undefined;
    /** A release's tag, or "latest": `path` then names one of the release's assets. */
    readonly release?: string | undefined;
}
