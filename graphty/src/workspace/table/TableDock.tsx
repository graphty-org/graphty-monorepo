import type React from "react";

import { Stub } from "../frame/Stub";
import { FromDataList } from "../style/FromDataList";

/**
 * The table dock (tier1-design.md section 2.9): Nodes, Edges and one tab per group run. Its
 * Columns chooser opens the Style tab package's From data list.
 *
 * A stub until the Table dock package replaces this file.
 * @returns Gray lines naming what goes here
 */
export function TableDock(): React.JSX.Element {
    return (
        <>
            <Stub>Table</Stub>
            <FromDataList />
        </>
    );
}
