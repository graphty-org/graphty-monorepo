/**
 * @file The AI guide's history-and-approvals example (docs/guide/ai-assistant.md), written from
 * the guide alone and compiled against the published declarations with no cast.
 *
 * `ai-approval-requested` must reach an element listener with a typed `request`, the config must
 * take `history` and `approvals` (a policy too), `resolveAiApproval` must take edited arguments,
 * and the conversation methods must return what the guide says. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { AiApprovalRequest, AiConversationSnapshot, ExecutionResult } from "@graphty/graphty-element/ai";
import { AI_CONVERSATION_FORMAT, AI_CONVERSATION_FORMAT_VERSION } from "@graphty/graphty-element/catalog";

/**
 * The guide's simple path: remember the conversation and ask before changing the graph.
 * @param myKey - The provider key.
 * @param card - Where the page draws its approval card.
 * @returns The first message's result.
 */
export async function rememberAndAsk(myKey: string, card: HTMLElement): Promise<ExecutionResult | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    // Listen BEFORE enabling, so a request saved before a reload reaches you too.
    element.addEventListener("ai-approval-requested", (e) => {
        const { request } = e.detail;
        card.replaceChildren();
        for (const call of request.calls) {
            const line = document.createElement("pre");
            line.textContent = `${call.tool} ${JSON.stringify(call.arguments)}`;
            card.append(line);
        }

        for (const approve of [true, false]) {
            const button = document.createElement("button");
            button.textContent = approve ? "Approve" : "Deny";
            button.onclick = async () => {
                card.replaceChildren();
                const final = await element.resolveAiApproval(request.id, { approve });
                card.textContent = `${final.code ?? ""} ${final.llmText ?? ""}`;
            };
            card.append(button);
        }
    });
    element.addEventListener("ai-pending-resolved", (e) => {
        if (e.detail.kind === "approval") {
            card.replaceChildren();
        }
    });

    await element.enableAiControl({
        provider: "google",
        apiKey: myKey,
        history: "browser",
        approvals: "writes",
    });

    const first = await element.aiCommand("Remove every node with degree 0");
    if (first.code === "AI_CONFIRMATION_NEEDED") {
        const pending: readonly AiApprovalRequest[] = element.getPendingAiApprovals();
        card.dataset.waiting = String(pending.length + (element.getAiStatus()?.pending?.approvals ?? 0));
    }

    return first;
}

/**
 * The advanced path: a policy, history options and edited arguments.
 * @param myKey - The provider key.
 * @param request - A request the page was asked.
 * @returns The message's final result.
 */
export async function policyAndEdits(myKey: string, request: AiApprovalRequest): Promise<ExecutionResult | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    await element.enableAiControl({
        provider: "google",
        apiKey: myKey,
        history: { store: "browser", key: "sales-dashboard", dataKey: "q3-accounts", budgetTokens: 16000 },
        approvals: {
            policy: (call) => {
                if (call.command === "import_data") {
                    return "deny";
                }

                return call.effect === "write" ? "ask" : "allow";
            },
        },
    });

    return element.resolveAiApproval(request.id, {
        approve: true,
        calls: [{ arguments: { action: "remove_nodes", ids: ["n1", "n2"] } }],
    });
}

/**
 * The conversation methods, a transcript and the export.
 * @param list - The transcript list.
 * @returns The open conversation.
 */
export async function conversations(list: HTMLElement): Promise<AiConversationSnapshot | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    element.addEventListener("ai-conversation-changed", (e) => {
        if (e.detail.code === "AI_STORAGE_FAILED") {
            list.dataset.failed = e.detail.conversationId;
        }

        list.replaceChildren(
            ...(element.getAiConversation()?.messages ?? []).map((message) => {
                const item = document.createElement("li");
                item.textContent = `${message.role}: ${message.text}`;
                if (message.role === "assistant") {
                    item.title = message.calls.map((call) => `${call.command} ${call.code}`).join(", ");
                }

                return item;
            }),
        );
    });

    const summaries = await element.listAiConversations({ allKeys: true });
    const newest = summaries[0];
    if (newest !== undefined) {
        await element.openAiConversation(newest.id);
        await element.aiCommand("now make those bigger", { conversation: newest.id });
        const json = await element.exportAiConversation(newest.id);
        if (json !== null) {
            const record = JSON.parse(json) as { format: string; version: number };
            list.dataset.current = String(
                record.format === AI_CONVERSATION_FORMAT && record.version <= AI_CONVERSATION_FORMAT_VERSION,
            );
        }

        await element.deleteAiConversation(newest.id);
    }

    await element.newAiConversation();
    await element.clearAiHistory();
    return element.getAiConversation();
}
