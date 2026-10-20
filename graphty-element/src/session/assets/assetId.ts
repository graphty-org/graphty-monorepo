/**
 * @file What an asset id is, on its own: style channels check it without loading the asset
 * library, its digests or its intake.
 */

/** An asset id: `"asset:<sha256>"`, `"asset:<name>"` or `"asset:sample/<name>"`. */
export type AssetId = `asset:${string}`;

/** The prefix reserved for the element's own sample models. */
export const SAMPLE_PREFIX = "asset:sample/";

/** Letters, digits, `.`, `_`, `-` and `/`, starting with a letter or digit, at most 256 long. */
const ASSET_ID = /^asset:[A-Za-z0-9][A-Za-z0-9._\-/]{0,255}$/;

/**
 * Whether a string is an asset id rather than a URL.
 * @param value - The string a style layer named.
 * @returns True for `asset:` followed by a name of letters, digits, `.`, `_`, `-` and `/`.
 */
export function isAssetId(value: unknown): value is AssetId {
    return typeof value === "string" && ASSET_ID.test(value) && !value.includes("..") && !value.endsWith("/");
}
