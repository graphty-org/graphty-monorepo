/**
 * @file The labels guide's example, compiled against the published declarations with no cast.
 *
 * `graphty-label-change` must reach a listener as `CustomEvent<NodeLabelCounts>`, so `e.detail`
 * compiles. Nothing here runs; `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { NodeLabelCounts } from "@graphty/graphty-element";

/** The counts are read off the element, and the event's detail is the same type. */
export function readCountsWithoutACast(status: HTMLElement): void {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const render = ({ labeled, nodeHidden, hiddenByOverlap }: NodeLabelCounts): void => {
        status.textContent = `${labeled - nodeHidden - hiddenByOverlap} of ${labeled}`;
    };

    render(element.nodeLabelCounts);
    element.addEventListener("graphty-label-change", (e) => {
        render(e.detail);
    });
    element.layoutBehavior = { labels: { declutter: true } };
}

/** The event bubbles, so a listener on the document gets the same typed detail. */
export function listenOnTheDocument(status: HTMLElement): void {
    document.addEventListener("graphty-label-change", (e) => {
        status.textContent = String(e.detail.hiddenByOverlap);
    });
}
