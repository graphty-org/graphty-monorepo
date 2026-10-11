/**
 * @file A plugin author's check that what they registered reaches graphty-element's assistant. The
 * element's own coverage test runs only in its build; this is the same question asked of a
 * plugin's own registrations, from its own test. Plain data in, coded facts out; no renderer.
 */

import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import { registeredCameraDescriptors } from "../../catalog/cameraRegistry";
import { registeredLayoutDescriptors } from "../../catalog/layoutRegistry";
import { registeredAlgorithmDescriptors } from "../../catalog/registry";
import { KNOWN_FORMAT_IDS, type OptionDescriptor } from "../../catalog/types";
import { catalogFormatDescriptors } from "../../catalog/writerRegistry";
import type { CodedFact } from "../../session/shared";
import { isOfferedOption } from "./optionTypes";

/** The formats graphty-element ships, which are not a plugin's to fix. */
const BUILT_IN_FORMATS: ReadonlySet<string> = new Set(KNOWN_FORMAT_IDS);

/** What `assistantReach` reports. OPEN UNION: codes may be added in a minor release. */
export type AssistantReachCode = "ai.option-unoffered" | "ai.no-description" | "ai.name-reserved";

/**
 * What a model could not be offered of the registered extensions: an option whose type converts
 * to no schema (`ai.option-unoffered`, often a nested object in an options schema), an algorithm,
 * layout or camera with no description, which a model would know only by id and name
 * (`ai.no-description`), and an assistant command named as one of the assistant's own tools
 * (`ai.name-reserved`). A plugin's test asserts the list is empty.
 *
 * ```ts
 * import { assistantReach, defineAlgorithm } from "@graphty/graphty-element/extend";
 *
 * defineAlgorithm({ id: "acme-essentiality", description: "How tied each node is.", node: (n) => n.degree });
 * console.assert(assistantReach().length === 0);
 * ```
 * @param commands - Assistant commands to check, by name.
 * @returns The facts, empty when everything registered reaches the assistant.
 * @since 4.0.0
 */
export function assistantReach(
    commands: readonly { readonly name: string }[] = [],
): readonly CodedFact<AssistantReachCode>[] {
    const facts: CodedFact<AssistantReachCode>[] = [];
    const check = (entry: string, options: readonly OptionDescriptor[], description: string | undefined): void => {
        if (description?.trim() === "") {
            facts.push({ code: "ai.no-description", params: { entry } });
        }

        for (const option of options) {
            if (option.internal !== true && !isOfferedOption(option)) {
                facts.push({ code: "ai.option-unoffered", params: { entry, option: option.name, type: option.type } });
            }
        }
    };

    for (const entry of registeredAlgorithmDescriptors()) {
        check(entry.key, entry.options, entry.description);
    }

    for (const entry of registeredLayoutDescriptors()) {
        check(entry.id, entry.options, entry.description);
    }

    for (const entry of registeredCameraDescriptors()) {
        check(entry.id, entry.options, entry.description);
    }

    // Registered readers and writers, which the built-in formats are not.
    for (const entry of catalogFormatDescriptors().filter((each) => !BUILT_IN_FORMATS.has(each.id))) {
        check(entry.id, [...entry.options, ...(entry.writerOptions ?? [])], undefined);
    }

    const reserved = new Set(ASSISTANT_TOOLS.map((tool) => tool.name));
    for (const command of commands) {
        if (reserved.has(command.name)) {
            facts.push({ code: "ai.name-reserved", params: { command: command.name, tool: command.name } });
        }
    }

    return facts;
}
