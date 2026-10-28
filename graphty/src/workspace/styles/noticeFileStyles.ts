import type { GraphSession } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { fileStyleNotesWords } from "./fileStyleWords";

/**
 * After a load, tells the reader what the file's styles lost, from the element's notes on that
 * load (`lastImport().styles.notes`): one notice, each kind of difference once. Says nothing when
 * the load drew the styles as the file says, or did not draw them.
 * @param workspace - the workspace store.
 * @param session - the session that just loaded.
 */
export function noticeFileStyles(workspace: WorkspaceStore, session: GraphSession): void {
    const sentences = fileStyleNotesWords(session.data.lastImport()?.styles?.notes ?? []);
    if (sentences.length > 0) {
        workspace.set({
            notice: { message: `The file's styles are drawn, with these differences: ${sentences.join(" ")}` },
        });
    }
}
