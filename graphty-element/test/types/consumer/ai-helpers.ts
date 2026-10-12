/**
 * @file The AI guide's helpers and questions examples (docs/guide/ai-assistant.md, "Helpers and
 * plans" and "Questions"), written from the guide alone and compiled against the published
 * declarations with no cast.
 *
 * The config must take `agents` (roles, or `{ roles, router, confirmPlans }`), `apiKeys` and
 * `questions`; `AiConfigError` must be a class with `code` and `params`; `ai-agent-start`,
 * `ai-agent-end` and `ai-question-asked` must reach an element listener with a typed `detail`; and
 * `answerAiQuestion` must take a choice by value. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import {
    type AiAgentRole,
    AiConfigError,
    type AiPlan,
    type AiQuestionRequest,
    type ExecutionResult,
} from "@graphty/graphty-element/ai";

/**
 * The guide's simple path: two helpers the main model hands tasks to.
 * @param myKey - The provider key.
 * @param log - Where the page writes what happened.
 * @returns The message's result.
 */
export async function twoHelpers(myKey: string, log: HTMLElement): Promise<ExecutionResult | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    element.addEventListener("ai-agent-start", (e) => {
        log.textContent = `${e.detail.agent} started: ${e.detail.task}`;
    });
    element.addEventListener("ai-agent-end", (e) => {
        const used = Number(e.detail.params.inputTokens ?? 0) + Number(e.detail.params.outputTokens ?? 0);
        log.textContent = `${e.detail.agent} ended ${e.detail.code} after ${String(used)} tokens`;
    });

    await element.enableAiControl({
        provider: "google",
        apiKey: myKey,
        agents: [
            { name: "counter", purpose: "Find and count nodes; changes nothing", commands: ["query"] },
            { name: "stylist", purpose: "Color and size nodes", commands: ["style"] },
        ],
    });

    return element.aiCommand("Find the nodes with degree 3 or more, then color them red");
}

/**
 * The advanced path: a function router, a second key, confirmed plans, and a rejected config.
 * @param googleKey - The main provider's key.
 * @param anthropicKey - The helper's provider's key.
 * @returns The reason a bad config was rejected, or null.
 */
export async function plannedHelpers(googleKey: string, anthropicKey: string): Promise<string | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    const roles: AiAgentRole[] = [
        { name: "counter", purpose: "Find and count nodes; changes nothing", commands: ["query"] },
        { name: "stylist", purpose: "Color and size nodes", commands: ["style"], provider: "anthropic" },
    ];
    const plan: AiPlan = { steps: [{ agents: ["counter"], order: "parallel" }, { agents: ["stylist"] }] };

    element.addEventListener("ai-approval-requested", (e) => {
        const { request } = e.detail;
        if (request.gate === "plan") {
            void element.resolveAiApproval(request.id, { approve: request.agent !== "stylist" });
        }
    });

    try {
        await element.enableAiControl({
            provider: "google",
            apiKey: googleKey,
            apiKeys: { anthropic: anthropicKey },
            agents: { roles, router: () => plan, confirmPlans: true },
        });
    } catch (error) {
        if (error instanceof AiConfigError) {
            return `${error.code} ${String(error.params.agent)} ${String(error.params.field)} ${String(error.params.reason)}`;
        }

        throw error;
    }

    await element.enableAiControl({
        provider: "google",
        apiKey: googleKey,
        agents: { roles, router: "classifier", classifierModel: "gemini-3.8-flash" },
    });
    return null;
}

/**
 * The guide's question card: the question and one button per choice, as text.
 * @param myKey - The provider key.
 * @param card - Where the page draws the question.
 * @returns The first message's result.
 */
export async function askTheReader(myKey: string, card: HTMLElement): Promise<ExecutionResult | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    const draw = (request: AiQuestionRequest): void => {
        card.replaceChildren();
        const question = document.createElement("p");
        question.textContent = request.question;
        card.append(question);
        for (const choice of request.choices) {
            const button = document.createElement("button");
            button.textContent = choice;
            button.onclick = async () => {
                card.replaceChildren();
                const final = await element.answerAiQuestion(request.id, request.multiple ? [choice] : choice);
                card.textContent = `${final.code ?? ""} ${final.llmText ?? ""}`;
            };
            card.append(button);
        }
    };

    element.addEventListener("ai-question-asked", (e) => {
        draw(e.detail.request);
    });
    element.addEventListener("ai-pending-resolved", (e) => {
        if (e.detail.kind === "question") {
            card.replaceChildren();
        }
    });

    await element.enableAiControl({ provider: "google", apiKey: myKey, history: "browser", questions: true });
    for (const open of element.getPendingAiQuestions()) {
        draw(open);
    }

    const first = await element.aiCommand("Highlight the nodes in my favorite department");
    if (first.code === "AI_QUESTION_ASKED" && (element.getAiStatus()?.pending?.questions ?? 0) === 0) {
        throw new Error("a question was asked but none is pending");
    }

    return first;
}
