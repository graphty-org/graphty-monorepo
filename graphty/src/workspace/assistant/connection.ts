import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import { type AiCommandOptions, AiConfigError, type ExecutionResult } from "@graphty/graphty-element/ai";
import type { AiEffect, AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";
import { type GraphSession, type GraphtyErrorCode, isGraphtyError } from "@graphty/graphty-element/session";

import { goToComposer } from "../assistant-door/commands";
import { type AssistantChoice, effortConfig } from "../assistant-door/provider";
import { fileName, saveBlob } from "../export/choices";
import type { WorkspaceStore } from "../state/store";
import { isAway, watchWaiting } from "./away";
import { changeLines, endWords, isChange, MODEL_INSTRUCTIONS, WORDS } from "./words";

/** How long a run goes before the reader is told it is working (design 4.5). */
const WORKING_AFTER_MS = 1000;

/** Each element's assistant, set up or on its way: a project's element is new, so it sets up anew. */
const links = new WeakMap<GraphtyElement, Promise<void>>();

/** The elements whose exports are already saved, so setting one up again saves each file once. */
const saving = new WeakSet<GraphtyElement>();

/** Results that end a message for now and wait on the reader. */
const WAITING = new Set<Failure["code"]>(["AI_CONFIRMATION_NEEDED", "AI_QUESTION_ASKED"]);

/** What a message is about. */
export type ScopeKind = NonNullable<AiCommandOptions["scope"]>;

/**
 * What the next message is about: the whole graph unless the reader picked Selection.
 * @param session - the element's session.
 * @param picked - whether the reader picked Selection.
 * @returns the selection while one stands and was picked, else the graph.
 */
export function scopeKind(session: GraphSession | null, picked: boolean): ScopeKind {
    const { nodes = [], edges = [] } = session?.selection ?? {};
    return nodes.length + edges.length > 0 && picked ? "selection" : "graph";
}

/**
 * Saves what the assistant exports, with the panel open or not: a graph's document, a picture or a
 * video, named `<project>_<format>.<ext>`.
 * @param element - the element.
 * @param store - the workspace store.
 */
function saveExports(element: GraphtyElement, store: WorkspaceStore): void {
    if (saving.has(element)) {
        return;
    }
    saving.add(element);
    element.addEventListener("ai-export-ready", ({ detail: { format, data } }) => {
        // A picture's or a video's format is no catalog entry: its id is its extension.
        const entry = element.session.catalog.formats().find((each) => each.id === format);
        const extension = entry?.extensions[0]?.replace(/^\./, "") ?? format;
        const name = fileName(store.get().project?.name ?? "untitled", format, extension);
        saveBlob(typeof data === "string" ? new Blob([data], { type: entry?.mimeTypes[0] ?? "" }) : data, name);
    });
}

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
            ...effortConfig(choice),
            ...(apiKey === undefined ? {} : { apiKey }),
            toolset: "generated",
            keyPersistence: { enabled: true, storage: choice.remember ? "localStorage" : "sessionStorage" },
            // A chat belongs to the project: a new project, even on the same sample, starts empty.
            history: { store: "browser", byProject: true },
            instructions: MODEL_INSTRUCTIONS,
            questions: true,
            voice: { review: true, output: "off" },
        })
        .then(() => {
            watchWaiting(element, store);
            saveExports(element, store);
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

/** How a setup or a message failed, as the element coded it. */
export interface Failure {
    readonly code: AiResultCode | GraphtyErrorCode;
    readonly params: AiResultParams;
}

/**
 * What the element threw, as its code and facts: a `GraphtyError` or an `AiConfigError` keeps its
 * own; anything else is `fallback`.
 * @param error - what was thrown.
 * @param fallback - the code for a throw the element did not code.
 * @returns the code and its facts.
 */
export function failureOf(error: unknown, fallback: AiResultCode): Failure {
    if (isGraphtyError(error)) {
        const params = Object.entries(error.details).filter(
            (entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number",
        );
        return { code: error.code, params: Object.fromEntries(params) };
    }
    if (error instanceof AiConfigError) {
        return { code: error.code, params: error.params };
    }
    return { code: fallback, params: {} };
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
                      label: WORDS["assistant.notice.open"],
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
        // A request waiting on the reader was announced as waiting; Working would talk over it.
        const waiting = element.getPendingAiApprovals().length + element.getPendingAiQuestions().length > 0;
        if (here() && !waiting) {
            store.set({ announcement: WORDS["assistant.status.working"] });
        }
    }, WORKING_AFTER_MS);
    let ended: Failure & { success: boolean };
    // A throw while setting up is "not connected" unless the element coded it; one while running is a failure.
    let stage: AiResultCode = "AI_NOT_ENABLED";
    try {
        await linked(element, store, choice);
        stage = "AI_FAILED";
        const result = await running();
        ended = { code: result.code ?? "AI_FAILED", params: result.params ?? {}, success: result.success };
    } catch (error) {
        ended = { ...failureOf(error, stage), success: false };
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
    const lines = changeLines(element.session, changes);
    const said = [...lines, words?.line ?? WORDS["assistant.status.ready"]].join(". ");
    store.set((state) => ({
        assistantEnded:
            words === null ? null : { code: ended.code, params: ended.params, news: words.failed && !isAway(store) },
        assistantDraft: (words === null && !replaced) || state.assistantDraft !== "" ? state.assistantDraft : text,
        // A notice speaks its own words, so away from the panel they are said once.
        ...(words?.failed === true || isAway(store) ? {} : { announcement: said }),
    }));
    if (isAway(store)) {
        noticeAway(element, store, lines, provenance, words?.line);
    } else if (words?.failed === true && (element.getAiConversation()?.messages.length ?? 0) === 0) {
        // No turn to draw the ending row under (a setup that failed before any chat): a notice says it.
        store.set({ notice: { message: words.line, error: true } });
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
    store.set({
        assistantDraft: "",
        assistantEnded: null,
        assistantSpoken: null,
        assistantRefused: false,
    });
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
 * Answers a question; what the composer held goes to the model even when it is not a choice.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param id - the question.
 * @param answer - the choice or choices.
 * @param typed - what the composer held, if that is the answer.
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
    await follow(element, store, choice, typed, () => element.answerAiQuestion(id, answer, { typed: typed !== "" }));
}
