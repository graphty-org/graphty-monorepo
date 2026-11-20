import { defineRegistration } from "../commands/registry";
import { sourceStepsOn } from "../features";
import { stagedSources, startAdd } from "./actions";
import { ADD_KEY } from "./keys";
import { STAGED_WORDS } from "./words";

/**
 * The staged sources' window keys (the source-steps experiment): Add (Shift+D) adds the staged
 * source whose section holds focus, else the newest one.
 */
export const registration = defineRegistration({
    owner: "source-steps",
    commands: [
        {
            id: "source.add-staged",
            label: STAGED_WORDS.add,
            group: "Data",
            keys: [ADD_KEY],
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) &&
                session !== null &&
                workspace.get().sourceCard === null &&
                stagedSources(session).length > 0,
            run: ({ session, workspace }) => {
                if (session === null) {
                    return undefined;
                }
                const focused = document.activeElement?.closest<HTMLElement>("[data-staged]")?.dataset.staged;
                const source = focused ?? stagedSources(session).at(-1)?.key;
                return source === undefined ? undefined : startAdd(workspace, session, source);
            },
        },
    ],
});
