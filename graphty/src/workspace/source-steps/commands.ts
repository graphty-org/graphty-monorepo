import { defineRegistration } from "../commands/registry";
import { sourceStepsOn } from "../features";
import { stagedSources, startAdd } from "./actions";
import { nodeField1, openJoin } from "./join";
import { ADD_KEY, JOIN_KEY } from "./keys";
import { JOIN_WORDS, STAGED_WORDS } from "./words";

/**
 * The staged sources' window keys (the source-steps experiment): Add (Shift+D) adds the staged
 * source whose section holds focus, else the newest one. Join (J) opens the Join card with that
 * source as Field 2, or, with focus in the inspector of a node, with that node's type as Field 1.
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
        {
            id: "source.join",
            label: JOIN_WORDS.join,
            group: "Data",
            keys: [JOIN_KEY],
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) &&
                session !== null &&
                workspace.get().sourceCard === null &&
                stagedSources(session).length + session.data.sources().length >= 2,
            run: ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const focus = document.activeElement;
                const staged = focus?.closest<HTMLElement>("[data-staged]")?.dataset.staged;
                const node =
                    staged === undefined &&
                    (focus?.closest("[data-inspected='node']") ?? null) !== null &&
                    session.selection.nodes.length === 1
                        ? session.selection.nodes[0]
                        : undefined;
                const field1 = node === undefined ? null : nodeField1(session, node);
                openJoin(workspace, session, {
                    ...(field1 === null ? {} : { field1 }),
                    ...(staged === undefined ? {} : { field2: staged }),
                });
            },
        },
    ],
});
