import { canReplace, editSource, replaceSource } from "../data-page/request";
import { pickFile } from "../start/open";
import { useWorkspace } from "../state/WorkspaceContext";
import type { AttributeAction } from "./attributeActions";

/**
 * The verbs on a source, the same wherever it is picked (the Sources row's menu and the source
 * inspector's "..."): Edit source..., which opens the Data page to replace the source on its own
 * files and roles, and Replace with file.... Both replace the graph's one source, so a graph of
 * several loads, or of one load of several tables, offers neither (`canReplace`).
 * @returns a function giving the verbs, possibly none.
 */
export function useSourceActions(): () => AttributeAction[] {
    const { session, store } = useWorkspace();
    return () => {
        const sources = session?.data.sources() ?? [];
        if (!canReplace(sources)) {
            return [];
        }
        return [
            {
                label: "Edit source...",
                disabledReason: null,
                run: () => {
                    editSource(store, sources[0]);
                },
            },
            {
                label: "Replace with file...",
                disabledReason: null,
                run: () => {
                    void pickFile().then((file) => {
                        if (file !== undefined) {
                            replaceSource(store, sources[0], file);
                        }
                    });
                },
            },
        ];
    };
}
