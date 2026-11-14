import React from "react";

import { CardsBody } from "./cards/CardsBody";

/**
 * The workspace's body, under its title bar. THE EXTENSION POINT: each build of the join
 * workspace replaces this file with its own layout. This build: the join cards, one card per
 * join, each asking what every row of its table becomes, beside the preview and the table.
 * @returns the body.
 */
export function JoinBody(): React.JSX.Element {
    return <CardsBody />;
}
