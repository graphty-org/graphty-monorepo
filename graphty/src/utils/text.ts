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

/**
 * Each item of a list with a React key that stays unique when values repeat: the item's value,
 * numbered by how many times the same value came before it.
 * @param items - The list, in order.
 * @param valueOf - The item's value.
 * @returns The items, each with its key.
 */
export function keyed<T>(items: readonly T[], valueOf: (item: T) => string): { key: string; item: T }[] {
    const seen = new Map<string, number>();
    return items.map((item) => {
        const value = valueOf(item);
        const before = seen.get(value) ?? 0;
        seen.set(value, before + 1);
        return { key: `${value}#${String(before)}`, item };
    });
}
