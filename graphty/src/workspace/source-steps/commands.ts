import { defineRegistration } from "../commands/registry";
import { sourceStepsOn } from "../features";
import { stagedSources } from "./actions";
import { openJoinWorkspace } from "./join";
import { JOIN_WORKSPACE_KEY } from "./keys";
import { WORKSPACE_WORDS } from "./words";

/**
 * The join workspace's window key (the source-steps experiment): Shift+J opens it, as the Data
 * place's Join + does, once there is a source to join. Inside the workspace the same key adds a
 * card, which the workspace binds itself.
 */
export const registration = defineRegistration({
    owner: "source-steps",
    commands: [
        {
            id: "source.join-workspace",
            label: WORKSPACE_WORDS.open,
            group: "Data",
            keys: [JOIN_WORKSPACE_KEY],
            experiment: true,
            /** @experimental source-steps */
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) &&
                session !== null &&
                workspace.get().joinWorkspace === false &&
                stagedSources(session).length + session.data.sources().length >= 1,
            run: ({ workspace }) => {
                openJoinWorkspace(workspace);
            },
        },
    ],
});
