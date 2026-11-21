import React, { Profiler } from "react";

import { countRender } from "./renderCounter";

/**
 * Marks a panel whose renders a test counts (`setRenderCounter`). Put it inside the panel's own
 * output, so it renders exactly when the panel or something in it does. React calls `onRender`
 * only in development and profiling builds; in the production app it is an inert wrapper.
 * @param props - Component props
 * @param props.id - the panel's name
 * @param props.children - the panel's output
 * @returns the output
 */
export function RenderCount({ id, children }: Readonly<{ id: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Profiler id={id} onRender={countRender}>
            {children}
        </Profiler>
    );
}
