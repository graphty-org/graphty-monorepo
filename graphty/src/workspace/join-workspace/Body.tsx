import React from "react";

import { CanvasBody } from "./canvas/CanvasBody";

/**
 * The workspace's body, under its title bar. THE EXTENSION POINT: each build of the join
 * workspace replaces this file with its own layout. This build draws the model canvas: source
 * boxes joined by wires over the bar of joins, the preview over the paged rows on the right.
 * @returns the body.
 */
export function JoinBody(): React.JSX.Element {
    return <CanvasBody />;
}
