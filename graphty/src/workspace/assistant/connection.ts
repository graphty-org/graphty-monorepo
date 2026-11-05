import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { AiCommandOptions, ExecutionResult } from "@graphty/graphty-element/ai";
import type { AiEffect, AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";

import { goToComposer } from "../assistant-door/commands";
import type { AssistantChoice } from "../assistant-door/provider";
import type { WorkspaceStore } from "../state/store";
import { isAway, watchWaiting } from "./away";
import { effectLine, endWords, isChange, MODEL_INSTRUCTIONS, WORDS } from "./words";

/** How long a run goes before the reader is told it is working (design 4.5). */
const WORKING_AFTER_MS = 1000;

/** Each element's assistant, set up or on its way: a project's element is new, so it sets up anew. */
const links = new WeakMap<GraphtyElement, Promise<void>>();

/** Results that end a message for now and wait on the reader. */
const WAITING = new Set<AiResultCode>(["AI_CONFIRMATION_NEEDED", "AI_QUESTION_ASKED"]);

/**
 * Sets up the element's assistant. The key is the element's: given here once, and back from storage
 * on every fresh element after that.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider, model and where the key stays.
 * @param apiKey - a key the reader just gave.
 * @returns when it is ready.
 */
export function link(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    apiKey?: string,
): Promise<void> {
    const ready = element
        .enableAiControl({
            provider: choice.provider,
            model: choice.model,
            ...(apiKey === undefined ? {} : { apiKey }),
            toolset: "generated",
            keyPersistence: { enabled: true, storage: choice.remember ? "localStorage" : "sessionStorage" },
            history: "browser",
            instructions: MODEL_INSTRUCTIONS,
            questions: true,
            voice: { review: true, output: "off" },
        })
        .then(() => {
            watchWaiting(element, store);
            store.set((state) => ({ assistantLinks: state.assistantLinks + 1 }));
        });
    links.set(element, ready);
    // A setup that failed is tried again by whatever needs the assistant next.
    ready.catch(() => {
        if (links.get(element) === ready) {
            links.delete(element);
        }
    });
    return ready;
}

/**
 * The element's assistant, set up or on its way.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @returns when it is ready.
 */
export function linked(element: GraphtyElement, store: WorkspaceStore, choice: AssistantChoice): Promise<void> {
    return links.get(element) ?? link(element, store, choice);
}

/**
 * Ends the element's assistant.
 * @param element - the element.
 */
export function unlink(element: GraphtyElement): void {
    links.delete(element);
    element.disableAiControl();
}

/**
 * The newest turn's changes and the id its steps carry.
 * @param element - the element.
 * @returns them.
 */
function newestTurn(element: GraphtyElement): { changes: readonly AiEffect[]; provenance: string | undefined } {
    const messages = element.getAiConversation()?.messages ?? [];
    const readers = messages.filter((message) => message.role === "reader");
    const reader = messages.findLastIndex((message) => message.role === "reader");
    return {
        changes: messages
            .slice(reader + 1)
            .flatMap((message) => (message.role === "assistant" ? (message.effects ?? []) : []))
            .filter(isChange),
        provenance: readers.findLast((message) => message.provenance !== undefined)?.provenance,
    };
}

/**
 * Tells a reader away from the panel how a turn ended: one notice, with Undo when its step is the
 * newest, else with Open.
 * @param element - the element.
 * @param store - the workspace store.
 * @param lines - the turn's change lines.
 * @param provenance - the id its steps carry.
 * @param line - how it ended, when not in a reply.
 */
function noticeAway(
    element: GraphtyElement,
    store: WorkspaceStore,
    lines: readonly string[],
    provenance: string | undefined,
    line: string | undefined,
): void {
    const next = element.session.history.nextUndo;
    const undoable = lines.length > 0 && next?.kind === "undo" && next.step.provenance.message === provenance;
    store.set({
        notice: {
            message: lines.length > 0 ? lines.join(". ") : (line ?? WORDS["assistant.answered"]),
            action: undoable
                ? {
                      label: WORDS["assistant.undo"],
                      run: () => {
                          void element.session.undo();
                      },
                  }
                : {
                      label: WORDS["assistant.list.open"],
                      run: () => {
                          goToComposer(store);
                      },
                  },
        },
    });
}

/**
 * Follows one piece of a message to where it stops: for the reader, or at its end. A message that
 * fails or is stopped hands its words back to an empty composer. Closing the panel never stops it.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param text - what the reader wrote, to hand back.
 * @param running - starts the piece.
 */
async function follow(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    text: string,
    running: () => Promise<ExecutionResult>,
): Promise<void> {
    const project = store.get().project?.id;
    const here = (): boolean => store.get().project?.id === project;
    const working = setTimeout(() => {
        if (here()) {
            store.set({ announcement: WORDS["assistant.status.working"] });
        }
    }, WORKING_AFTER_MS);
    let ended: { code: AiResultCode; params: AiResultParams; success: boolean };
    try {
        await linked(element, store, choice);
        const result = await running();
        ended = { code: result.code ?? "AI_FAILED", params: result.params ?? {}, success: result.success };
    } catch {
        ended = { code: "AI_NOT_ENABLED", params: {}, success: false };
    }
    clearTimeout(working);
    if (!here() || WAITING.has(ended.code)) {
        return;
    }
    if (ended.code === "AI_ANSWER_INVALID") {
        store.set({ assistantRefused: true, assistantDraft: text });
        return;
    }
    // Set up anew under the run (a provider saved): it ended, and the assistant is here.
    const replaced = ended.code === "AI_DISPOSED" && element.isAiEnabled();
    const words = replaced ? null : endWords(ended.code, ended.params, choice.provider, ended.success);
    const { changes, provenance } = newestTurn(element);
    const lines = changes.map((effect) => effectLine(element.session, effect));
    const said = [...lines, words?.line ?? WORDS["assistant.status.ready"]].join(". ");
    store.set((state) => ({
        assistantEnded: words === null ? null : { code: ended.code, params: ended.params },
        assistantDraft: (words === null && !replaced) || state.assistantDraft !== "" ? state.assistantDraft : text,
        // A notice speaks its own words, so away from the panel they are said once.
        ...(words?.failed === true || isAway(store) ? {} : { announcement: said }),
    }));
    if (isAway(store)) {
        noticeAway(element, store, lines, provenance, words?.line);
    }
}

/**
 * Sends a message, whether or not the panel stays open.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param text - what the reader wrote.
 * @param options - what the message is about, and how it was said.
 */
export async function send(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    text: string,
    options: AiCommandOptions = {},
): Promise<void> {
    store.set({ assistantDraft: "", assistantEnded: null, assistantSpoken: null, assistantRefused: false });
    await follow(element, store, choice, text, () => element.aiCommand(text, options));
}

/**
 * Answers an approval card.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param id - the request.
 * @param approve - whether its calls run.
 */
export async function decide(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    id: string,
    approve: boolean,
): Promise<void> {
    store.set({ assistantEnded: null });
    await follow(element, store, choice, "", () => element.resolveAiApproval(id, { approve }));
}

/**
 * Answers a question; an answer that is not among its choices keeps it open.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param id - the question.
 * @param answer - the choice or choices.
 * @param typed - what the composer held, handed back if refused.
 */
export async function answerQuestion(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    id: string,
    answer: string | readonly string[],
    typed = "",
): Promise<void> {
    store.set({ assistantDraft: "", assistantEnded: null, assistantRefused: false });
    await follow(element, store, choice, typed, () => element.answerAiQuestion(id, answer));
}
