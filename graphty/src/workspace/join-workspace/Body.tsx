import React from "react";

import { RecipeBody } from "./recipe/RecipeBody";

/**
 * The workspace's body, under its title bar. THE EXTENSION POINT: each build of the join
 * workspace replaces this file with its own layout. This build: the recipe, an ordered list of
 * step cards beside the preview and the table.
 * @returns the body.
 */
export function JoinBody(): React.JSX.Element {
    return <RecipeBody />;
}
