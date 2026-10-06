/**
 * @file A React 19 consumer of `<graphty-element>`, compiled against the published declarations.
 *
 * The one opt-in line is the whole integration: after it, the tag type-checks with rich values
 * for its properties (`nodeData`, `algorithmsOnLoad`, `acceleration`), a typed `ref` and typed
 * event listeners, and a wrong value is an error. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 *
 * Its counterpart, `test/types/no-jsx-opt-in/element-only.tsx`, is compiled on its own and
 * proves the tag is NOT declared for a program that imports the element without opting in.
 */

import "@graphty/graphty-element";
import type {} from "@graphty/graphty-element/jsx";

import type { Graphty } from "@graphty/graphty-element";
import { type JSX, useRef } from "react";

/** The canonical example of the React guide. */
export function GraphView(): JSX.Element {
    const ref = useRef<Graphty>(null);

    return (
        <graphty-element
            ref={ref}
            nodeData={[{ id: "a" }, { id: "b" }]}
            edgeData={[{ source: "a", target: "b" }]}
            algorithmsOnLoad={["degree", { algorithm: "pagerank", style: { size: [1, 5] } }]}
            runAlgorithmsOnLoad
            acceleration="off"
            layoutBehavior={{ labels: { declutter: true } }}
            layout-2d
            style={{ display: "block", height: 400 }}
            ongraph-settled={(event) => {
                console.log(event.detail.type);
            }}
            ongraphty-node-click={(event) => {
                console.log(event.detail.nodeId);
            }}
        />
    );
}

/** A wrong value is a compile error, not a string the element has to reject at run time. */
export function WrongValues(): JSX.Element {
    return (
        <>
            {/* @ts-expect-error -- acceleration is a policy, not any string */}
            <graphty-element acceleration="sometimes" />
            {/* @ts-expect-error -- algorithmsOnLoad is a list, not a string */}
            <graphty-element algorithmsOnLoad="degree" />
            {/* @ts-expect-error -- no such property */}
            <graphty-element nodeDta={[]} />
        </>
    );
}
