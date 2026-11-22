import type { GraphSession } from "@graphty/graphty-element/session";

import { count } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { panelsInView } from "../time/timeActions";
import { fileStyleNotesWords } from "./fileStyleWords";

/**
 * After a load, tells the reader in one short line that the file's styles were drawn with differences, from the
 * element's notes on that load (`lastImport().styles.notes`), with Show to open Data sources, which lists each kind
 * of difference once. Says nothing when the load drew the styles as the file says, or did not draw them.
 * @param workspace - the workspace store.
 * @param session - the session that just loaded.
 */
export function noticeFileStyles(workspace: WorkspaceStore, session: GraphSession): void {
    const kinds = fileStyleNotesWords(session.data.lastImport()?.styles?.notes ?? []).length;
    if (kinds > 0) {
        workspace.set({
            notice: {
                message: `File styles drawn with ${count(kinds, "difference")}`,
                action: {
                    label: "Show",
                    run: () => {
                        workspace.set({ page: "panels", place: "data", ...panelsInView() });
                    },
                },
            },
        });
    }
}
