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

/** The guide's other snippets, in the order the page shows them. */
export async function otherSnippets(g: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const { time } = g.session;

    // Choosing the time column
    await time.setField({ edges: { start: "sent" } });
    const draft = await g.session.data.prepare({ type: "csv", config: { url: "emails.csv" } });
    const found = draft.findings.find((f) => f.code === "time.found");
    if (found) {
        console.log(found.params.column, found.params.from, found.params.to);
        await draft.load({ mapping: { tables: { [found.params.table]: { time: found.params.column } } } });
    }

    // Elements that exist for a span
    await time.window({ from: "2020-01-01", to: "2021-01-01" });
    await time.setField({ nodes: { start: "start", end: "end", spells: "spells" } });

    // Files that declare their time
    g.session.on("time:field", ({ field }) => {
        console.log(field);
    });
    await g.session.data.import({ type: "gexf", config: { url: "dynamics.gexf" } });

    // Reading the data's time
    const extent = time.extent();
    const bins = time.bins({ count: 50 });
    const visible = time.bins({ count: 50, scope: "visible" });
    console.log(extent?.from, bins?.[0]?.start, visible?.length);

    // Moving the window
    await time.window({ from: "2026-01-01", to: "2026-02-01", step: "day" });
    await time.stepBy(1);
    await time.seek("end");
    await time.window(null);
    await time.commit();
    console.log(time.current, time.committed);

    // Settings
    await time.setSettings({ step: "week", mode: "cumulative", results: "rerun", missing: "outside" });
    console.log(time.settings.outside, time.current?.step);

    // Fading older edges
    await time.setSettings({ ageFade: 0.2 });
    time.play();

    // Every window at once
    const { rows } = await time.series({ step: "month", measures: ["density"] });
    for (const row of rows) {
        console.log(row.from, row.visible.edges, row.values.density);
    }

    // Time zones
    await time.setField({ edges: { start: "sent", parseZone: "America/New_York" } });
    await time.setSettings({ step: "month", timeZone: "America/New_York" });
    await time.stepBy(1);
    const days = time.bins({ step: "day" });
    const at = time.parse("2026-03-08", { timeZone: "Asia/Kolkata" });
    console.log(days?.length, at, time.timeZone);
}
