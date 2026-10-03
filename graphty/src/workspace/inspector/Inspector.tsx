import type React from "react";

import { Stub } from "../frame/Stub";
import { LayoutGroup } from "../layout/LayoutGroup";
import { StyleTab } from "../style/StyleTab";

/**
 * The inspector (tier1-design.md section 2.7): the frame, the state bar and the Style and Values
 * tabs for every tier 1 kind. Its Style tab is the Style tab package's, and the graph's Style tab
 * holds the Layout group.
 *
 * A stub until the Inspector package replaces this file.
 * @returns Gray lines naming what goes here
 */
export function Inspector(): React.JSX.Element {
    return (
        <>
            <Stub>Inspector</Stub>
            <StyleTab />
            <LayoutGroup />
        </>
    );
}
