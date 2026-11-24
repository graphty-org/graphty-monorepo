import { providerDescriptor, useAssistantChoice } from "../assistant-door/provider";

/**
 * Who the reader's messages go to: what the privacy chip and Settings' Privacy both state.
 * @returns the provider's name, or null with no provider saved.
 */
export function useAssistantSendsTo(): string | null {
    const choice = useAssistantChoice();
    return choice === null ? null : providerDescriptor(choice.provider).plainName;
}
