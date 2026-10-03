/**
 * Small text helpers shared across the app.
 */

/**
 * Turn a slug into a heading, so a category the catalogue gains gets a readable label without
 * anyone adding a row to a table.
 * @param slug - A lower-case, hyphen-separated name.
 * @returns The name with each word capitalised.
 */
export function titleCase(slug: string): string {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
