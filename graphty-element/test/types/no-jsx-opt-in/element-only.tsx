/**
 * @file A React program that imports graphty-element and does NOT opt in to its JSX types.
 *
 * Importing the element must not declare the tag: the JSX declaration is global, and a program
 * gets it only by asking for `@graphty/graphty-element/jsx`. Compiled on its own by
 * `tsconfig.no-jsx-opt-in.json`, so nothing else in the program can opt in for it.
 */

import "@graphty/graphty-element";

import type { Graphty } from "@graphty/graphty-element";
import type { JSX } from "react";

/** Without the opt-in, the tag is unknown. */
export function GraphView(): JSX.Element {
    // @ts-expect-error -- the tag is declared only for a program that opts in
    return <graphty-element />;
}

/** The element's own types still work without it. */
export const tag: Graphty | null = document.querySelector("graphty-element");
