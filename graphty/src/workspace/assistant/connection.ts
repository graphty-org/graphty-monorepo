import type { Graphty as GraphtyElement } from "@graphty/graphty-element";

import type { AssistantChoice } from "../assistant-door/provider";
import type { WorkspaceStore } from "../state/store";
import { endWords, MODEL_INSTRUCTIONS, WORDS } from "./words";

/** How long a run goes before the reader is told it is working (design 4.5). */
const WORKING_AFTER_MS = 1000;

/** Each element's assistant, set up or on its way: a project's element is new, so it sets up anew. */
const links = new WeakMap<GraphtyElement, Promise<void>>();

/** Results that end a message for now and wait on the reader. */
const WAITING = new Set(["AI_CONFIRMATION_NEEDED", "AI_QUESTION_ASKED"]);

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
        })
        .then(() => {
            store.set((state) => ({ assistantLinks: state.assistantLinks + 1 }));
        });
    links.set(element, ready);
    return ready;
}

/**
 * The element's assistant, set up once its graph has opened, so a saved conversation of that graph
 * is the one it reopens.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @returns when it is ready.
 */
export function linked(element: GraphtyElement, store: WorkspaceStore, choice: AssistantChoice): Promise<void> {
    const known = links.get(element);
    if (known !== undefined) {
        return known;
    }
    const opening = store.get().opened ?? Promise.resolve();
    const ready = opening.catch(() => undefined).then(() => link(element, store, choice));
    links.set(element, ready);
    return ready;
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
 * Sends a message, whether or not the panel stays open: closing it never stops a run. A message
 * that fails or is stopped hands its words back to an empty composer.
 * @param element - the element.
 * @param store - the workspace store.
 * @param choice - the provider and model.
 * @param text - what the reader wrote.
 */
export async function send(
    element: GraphtyElement,
    store: WorkspaceStore,
    choice: AssistantChoice,
    text: string,
): Promise<void> {
    const project = store.get().project?.id;
    const here = (): boolean => store.get().project?.id === project;
    store.set({ assistantDraft: "", assistantEnded: null });
    const working = setTimeout(() => {
        if (here()) {
            store.set({ announcement: WORDS["assistant.status.working"] });
        }
    }, WORKING_AFTER_MS);
    let ended: { code: string; params: Readonly<Record<string, string | number>>; success: boolean };
    try {
        await linked(element, store, choice);
        const result = await element.aiCommand(text);
        ended = { code: result.code ?? "AI_FAILED", params: result.params ?? {}, success: result.success };
    } catch {
        ended = { code: "AI_NOT_ENABLED", params: {}, success: false };
    }
    clearTimeout(working);
    if (!here() || WAITING.has(ended.code)) {
        return;
    }
    const words = endWords(ended.code, ended.params, choice.provider, ended.success);
    store.set((state) => ({
        assistantEnded: words === null ? null : { code: ended.code, params: ended.params },
        assistantDraft: words === null || state.assistantDraft !== "" ? state.assistantDraft : text,
        ...(words?.failed === true ? {} : { announcement: words?.line ?? WORDS["assistant.status.ready"] }),
    }));
}
