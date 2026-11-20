import { defineRegistration } from "../commands/registry";
import { sourceStepsOn } from "../features";
import { cancelCard, commitCard, stagedSources, startAdd } from "./actions";
import { joinCardOf, nodeField1, openJoin, previewing } from "./join";
import { ADD_KEY, COMMIT_KEY, JOIN_KEY, PREVIEW_KEY, READER_EDITS_KEY, SIDE_KEY } from "./keys";
import { canPreview, openDraft, showSide, startPreview, undoInCard } from "./preview";
import { toggleReaderEdits } from "./steps";
import { JOIN_WORDS, PREVIEW_WORDS, STAGED_WORDS, STEP_WORDS } from "./words";

/** Where Enter belongs to the control under focus: it presses, opens, toggles or walks it. */
const OWN_ENTER =
    "a, button, input, select, textarea, [role='combobox'], [role='switch'], [role='radio'], [role='checkbox'], " +
    "[role='option'], [role='grid'], [role='menu'], [role='listbox'], [role='dialog']";

/**
 * Whether Enter is the card's Commit where focus is: not on a control whose own Enter presses,
 * opens or toggles it (a closed list field, a switch, a radio), nor in a grid, menu or list that
 * walks with it. The Commit button commits by its own Enter.
 * @returns true when Enter commits.
 */
function enterCommits(): boolean {
    return (document.activeElement?.closest(OWN_ENTER) ?? null) === null;
}

/**
 * The staged sources' window keys (the source-steps experiment): Add (Shift+D) adds the staged
 * source whose section holds focus, else the newest one. Join (J) opens the Join card with that
 * source as Field 2, or, with focus in the inspector of a node, with that node's type as Field 1.
 * Cancel (Esc) closes the open card wherever focus is, once an inner control had its Esc.
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
        {
            // Escape while a card is open, taken from Clear selection: the card's form takes it
            // first, this catches it once focus left the form (the dock, a segmented control).
            id: "source.cancel-card",
            label: STAGED_WORDS.cancel,
            group: "Data",
            whileShownKeys: ["Escape"],
            inPalette: false,
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) && session !== null && workspace.get().sourceCard !== null,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    cancelCard(workspace, session);
                }
            },
        },
        {
            id: "source.preview",
            label: PREVIEW_WORDS.preview,
            group: "Data",
            keys: [PREVIEW_KEY],
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) => {
                const card = joinCardOf(workspace.get().sourceCard);
                return sourceStepsOn(session) && session !== null && card !== null && canPreview(card);
            },
            run: ({ session, workspace }) => (session === null ? undefined : startPreview(workspace, session)),
        },
        {
            // Enter while the Join card previews, the step card is open or the Add card has no open
            // question, wherever focus is but on something Enter presses.
            id: "source.commit-card",
            label: PREVIEW_WORDS.commit,
            group: "Data",
            whileShownKeys: [COMMIT_KEY],
            inPalette: false,
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) &&
                session !== null &&
                (previewing(workspace.get().sourceCard) ||
                    workspace.get().sourceCard?.kind === "step" ||
                    (workspace.get().sourceCard?.kind === "add" &&
                        openDraft(session)?.preview().questions.length === 0)) &&
                enterCommits(),
            run: ({ session, workspace }) => (session === null ? undefined : commitCard(workspace, session)),
        },
        {
            id: "source.before-after",
            label: PREVIEW_WORDS.beforeAfter,
            group: "Data",
            keys: [SIDE_KEY],
            experiment: true,
            feature: "source-steps",
            shown: ({ session }) =>
                sourceStepsOn(session) && session !== null && openDraft(session)?.displayed === true,
            run: ({ session }) => (session === null ? undefined : showSide(session)),
        },
        {
            id: "source.reader-edits",
            label: STEP_WORDS.readerEdits,
            group: "Data",
            keys: [READER_EDITS_KEY],
            experiment: true,
            feature: "source-steps",
            shown: ({ session }) => sourceStepsOn(session) && session !== null && session.data.edits().length > 0,
            run: ({ workspace }) => {
                toggleReaderEdits(workspace);
            },
        },
        {
            // Undo while the Join card previews takes back the draft's newest change, not the
            // project's: the project's history waits for the commit.
            id: "source.undo-in-card",
            label: PREVIEW_WORDS.undo,
            group: "Data",
            whileShownKeys: ["Mod+Z"],
            inPalette: false,
            experiment: true,
            feature: "source-steps",
            shown: ({ session, workspace }) =>
                sourceStepsOn(session) && session !== null && previewing(workspace.get().sourceCard),
            run: ({ session, workspace }) => {
                if (session !== null) {
                    undoInCard(workspace, session);
                }
            },
        },
    ],
});
