/**
 * @file The joins guide's examples (docs/guide/joins.md), compiled against the published
 * declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it against
 * `dist/`. `test/session/joins-guide-example.test.ts` runs them.
 */

/**
 * The guide's canonical example, then its door-entries, shared-value and mapping-table examples.
 * @param file - the values table
 * @param doorEntries - the door log
 * @param identifiers - the accounts' phones and devices
 * @param symbolToEnsembl - the mapping table
 */
export async function joins(file: File, doorEntries: File, identifiers: File, symbolToEnsembl: File): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const { data } = element.session;

    const draft = await data.prepare({ config: { file } }, { onto: "graph" });
    const suggestion = draft.suggestJoin();
    console.log(draft.joinReport(suggestion));
    await draft.load({ join: suggestion });

    const join = data.joins().at(-1);
    if (join) {
        await data.editJoin(join.source, { ...join.choices, ignoreCase: true });
        await data.removeSource(join.source);
    }

    const doors = await data.prepare({ config: { file: doorEntries } }, { onto: "graph" });
    await doors.load({ join: { ...doors.suggestJoin(), aggregate: { time: ["count", "first", "last"] } } });

    const ids = await data.prepare({ config: { file: identifiers } }, { onto: "graph" });
    const linked = ids.suggestJoin();
    if (linked.link) {
        await ids.load({ join: { ...linked, shape: "link" } });
    }

    const crosswalk = await data.prepare({ config: { file: symbolToEnsembl } });
    const lookup = crosswalk.lookup();
    crosswalk.dispose();
    const expression = await data.prepare({ config: { file } }, { onto: "graph" });
    await expression.load({ join: { keys: [{ file: "symbol", graph: "id" }], lookup, mapping: { many: "first" } } });
}
