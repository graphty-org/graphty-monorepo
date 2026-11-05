/**
 * @file The timeline guide's first example (docs/guide/timeline.md), compiled against the published
 * declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it against
 * `dist/`. `test/browser/timeline-guide.test.ts` runs the same script.
 */

import "@graphty/graphty-element";

/** The guide's script, as a function over the page's elements. */
export async function quickStart(): Promise<void> {
    const g = document.querySelector("graphty-element");
    const play = document.querySelector<HTMLButtonElement>("#play");
    if (g === null || play === null) {
        return;
    }

    await new Promise((r) => {
        g.addEventListener("data-loaded", r, { once: true });
    });
    const { time } = g.session;
    await time.ready; // the time field is indexed
    play.onclick = () => (time.playing ? time.pause() : time.play({ step: "day" }));
    g.session.on("time:step", (s) => {
        console.log(s.from, s.to, s.entered.edges);
    });
}

/** The guide's jump to the selection's span. */
export async function jumpToSelection(g: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const { nodes, edges } = g.session.selection;
    const span = g.session.time.spanOf({ nodes, edges, incident: true });
    if (span !== null) {
        await g.session.time.window(span);
    }
}
