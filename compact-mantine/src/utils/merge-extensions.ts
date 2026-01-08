/**
 * Type utility to detect overlapping keys between two object types.
 * Returns `never` if there are overlapping keys, otherwise returns the second type.
 */
type NoOverlap<T, U> = keyof T & keyof U extends never ? U : never;

/**
 * Merges two component extension objects, with TypeScript enforcing no duplicate keys.
 * If the same component exists in both objects, a compile-time error occurs.
 * @param a - First extension object
 * @param b - Second extension object (must not have keys overlapping with a)
 * @returns Merged object containing all properties from both inputs
 * @example
 * ```ts
 * // This compiles - no overlap
 * const merged = mergeExtensions(
 *     { Button: Button.extend({...}) },
 *     { TextInput: TextInput.extend({...}) }
 * );
 *
 * // This fails to compile - Checkbox exists in both
 * const invalid = mergeExtensions(
 *     { Checkbox: Checkbox.extend({...}) },
 *     { Checkbox: Checkbox.extend({...}) }  // Error!
 * );
 * ```
 */
export function mergeExtensions<A extends object, B extends object>(
    a: A,
    b: NoOverlap<A, B>,
): A & B {
    return { ...a, ...b } as A & B;
}

/**
 * Merges three component extension objects, with TypeScript enforcing no duplicate keys.
 * @param a - First extension object
 * @param b - Second extension object (must not overlap with a)
 * @param c - Third extension object (must not overlap with a or b)
 * @returns Merged object containing all properties from all inputs
 */
export function mergeExtensions3<
    A extends object,
    B extends object,
    C extends object,
>(a: A, b: NoOverlap<A, B>, c: NoOverlap<A & B, C>): A & B & C {
    return { ...a, ...b, ...c } as A & B & C;
}

/**
 * Merges four component extension objects, with TypeScript enforcing no duplicate keys.
 * This is the primary function used for combining input, button, control, and display extensions.
 * @param a - First extension object
 * @param b - Second extension object (must not overlap with a)
 * @param c - Third extension object (must not overlap with a or b)
 * @param d - Fourth extension object (must not overlap with a, b, or c)
 * @returns Merged object containing all properties from all inputs
 */
export function mergeExtensions4<
    A extends object,
    B extends object,
    C extends object,
    D extends object,
>(
    a: A,
    b: NoOverlap<A, B>,
    c: NoOverlap<A & B, C>,
    d: NoOverlap<A & B & C, D>,
): A & B & C & D {
    return { ...a, ...b, ...c, ...d } as A & B & C & D;
}

/**
 * Merges seven component extension objects, with TypeScript enforcing no duplicate keys.
 * This is used for combining all extension categories: input, button, control, display,
 * feedback, navigation, and overlay extensions.
 * @param a - First extension object
 * @param b - Second extension object (must not overlap with a)
 * @param c - Third extension object (must not overlap with a or b)
 * @param d - Fourth extension object (must not overlap with a, b, or c)
 * @param e - Fifth extension object (must not overlap with a, b, c, or d)
 * @param f - Sixth extension object (must not overlap with a, b, c, d, or e)
 * @param g - Seventh extension object (must not overlap with a, b, c, d, e, or f)
 * @returns Merged object containing all properties from all inputs
 */
export function mergeExtensions7<
    A extends object,
    B extends object,
    C extends object,
    D extends object,
    E extends object,
    F extends object,
    G extends object,
>(
    a: A,
    b: NoOverlap<A, B>,
    c: NoOverlap<A & B, C>,
    d: NoOverlap<A & B & C, D>,
    e: NoOverlap<A & B & C & D, E>,
    f: NoOverlap<A & B & C & D & E, F>,
    g: NoOverlap<A & B & C & D & E & F, G>,
): A & B & C & D & E & F & G {
    return { ...a, ...b, ...c, ...d, ...e, ...f, ...g } as A & B & C & D & E & F & G;
}
