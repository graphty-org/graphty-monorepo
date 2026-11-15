import type { SourceKey } from "@graphty/graphty-element/session";

import { editSource, replaceSource } from "../data-page/request";
import { pickFile } from "../start/open";
import { useWorkspace } from "../state/WorkspaceContext";
import type { AttributeAction } from "./attributeActions";

/**
 * The verbs on a source, the same wherever it is picked (the Sources row's menu and the source
 * inspector's "..."): Edit source..., which opens the Data page to replace the load on its own
 * files and roles, and Replace with file.... Each replaces that one load; every other load stays.
 * A network load is edited in its own form, and a joined table on the join screen.
 * @returns a function giving a load's verbs, possibly none.
 */
export function useSourceActions(): (key: SourceKey) => AttributeAction[] {
    const { session, store } = useWorkspace();
    return (key) => {
        const loaded = session?.data.sources().find((each) => each.key === key);
        if (session === null || loaded === undefined || loaded.kind === "server") {
            return [];
        }
        const replace: AttributeAction = {
            label: "Replace with file...",
            disabledReason: null,
            run: () => {
                void pickFile().then((file) => {
                    if (file !== undefined) {
                        replaceSource(store, loaded, file);
                    }
                });
            },
        };
        if (loaded.kind === "join") {
            return [replace];
        }
        return [
            {
                label: "Edit source...",
                disabledReason: null,
                run: () => {
                    editSource(store, session, loaded);
                },
            },
            replace,
        ];
    };
}
