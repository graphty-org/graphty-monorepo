// Flag (design section 8): the owner marks a moment that felt wrong. One entry, sent at once, holds a
// short id shown in the headset ("F7"), the graph state, the enabled techniques and the last 10 s of
// input, so a report like "F7 felt wrong" maps straight to a slice of the log.

import type { Framework } from "./runtime";

/**
 * Create the Flag action.
 * @param fw - the framework
 * @param show - shows the flag id in the headset
 * @returns the action
 */
export function createFlag(fw: Framework, show: (id: string) => void): () => void {
    let n = 0;
    return () => {
        n++;
        const id = `F${n}`;
        const s = fw.commands.state;
        fw.log.log("flag", {
            id,
            state: {
                selection: [...s.selection],
                hidden: [...s.hidden],
                shown: [...s.shown],
                colorBy: s.colorBy,
                sizeBy: s.sizeBy,
                filter: s.filter,
                notes: s.notes.length,
                history: fw.commands.history.map((h) => h.label),
            },
            enabled: fw.techniques.filter((t) => fw.isOn(t.id)).map((t) => t.id),
            wins: fw.wins.slice(-10),
            input: fw.input?.recent() ?? null,
        });
        void fw.log.flush();
        show(id);
    };
}
