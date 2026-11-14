import { assistantOn } from "../assistant-door/commands";
import { providerDescriptor, useAssistantChoice } from "../assistant-door/provider";
import { useWorkspace } from "../state/WorkspaceContext";

/**
 * Who the reader's messages go to: what the privacy chip and Settings' Privacy both state.
 * @returns the provider's name, or null with the experiment off or no provider saved.
 */
export function useAssistantSendsTo(): string | null {
    const { element } = useWorkspace();
    const choice = useAssistantChoice();
    return assistantOn(element) === true && choice !== null ? providerDescriptor(choice.provider).plainName : null;
}
