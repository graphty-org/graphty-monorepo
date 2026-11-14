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
    /** The file's path in the repository ("data/karate.graphml"). */
    readonly path: string;
    /** A branch, tag or commit; default the repository's default branch. */
    readonly ref?: string | undefined;
}
