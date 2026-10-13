/**
 * @file A plugin author's check that what they registered reaches graphty-element's assistant. The
 * element's own coverage test runs only in its build; this is the same question asked of a
 * plugin's own registrations, from its own test. Plain data in, coded facts out; no renderer.
 */

import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import { registeredCameraDescriptors } from "../../catalog/cameraRegistry";
import { registeredLayoutDescriptors } from "../../catalog/layoutRegistry";
import {
    registeredAlgorithmByKey,
    registeredAlgorithmDescriptors,
    undescribedAlgorithmAddresses,
} from "../../catalog/registry";
import { KNOWN_FORMAT_IDS, type OptionDescriptor } from "../../catalog/types";
import { catalogFormatDescriptors } from "../../catalog/writerRegistry";
import type { CodedFact } from "../../session/shared";
import { isOfferedOption } from "./optionTypes";

/** The formats graphty-element ships, which are not a plugin's to fix. */
const BUILT_IN_FORMATS: ReadonlySet<string> = new Set(KNOWN_FORMAT_IDS);

/**
 * The catalog tables whose options the assistant's tools pass on, each to the entry it names. The
 * element's own coverage test fails when the tools pass a different set, so this check and that
 * one give one verdict.
 */
export const ASSISTANT_OPTION_TABLES = Object.freeze([
    "algorithms",
    "layouts",
    "engines",
    "formats",
    "writers",
    "scales",
    "cameras",
] as const);

/** What `assistantReach` reports. OPEN UNION: codes may be added in a minor release. */
export type AssistantReachCode = "ai.option-unoffered" | "ai.no-description" | "ai.name-reserved" | "ai.no-descriptor";

/** The element's own algorithm namespace, whose classes the catalog describes by their own keys. */
const OWN_NAMESPACE = "graphty:";

/**
 * The algorithm classes a plugin registered with no descriptor (`namespace:type`): the assistant
 * runs them by address, but knows none of their options or results. The element's own classes, in
 * its own namespace, are the catalog's.
 * @returns The addresses.
 */
export function undescribedPlugins(): string[] {
    return undescribedAlgorithmAddresses().filter(
        (address) =>
            !address.startsWith(OWN_NAMESPACE) && registeredAlgorithmByKey(address.split(":")[1] ?? "") === undefined,
    );
}

/**
 * What a model could not be offered of the registered extensions: an option whose type converts
 * to no schema (`ai.option-unoffered`, often a nested object in an options schema), an algorithm,
 * layout or camera with no description, which a model would know only by id and name
 * (`ai.no-description`), an algorithm class registered with no descriptor, which a model can run
 * by its address but knows nothing else of (`ai.no-descriptor`), and an assistant command named
 * as one of the assistant's own tools, which the model is offered as `app_<name>`
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

    for (const address of undescribedPlugins()) {
        facts.push({ code: "ai.no-descriptor", params: { entry: address } });
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
            facts.push({
                code: "ai.name-reserved",
                params: { command: command.name, tool: command.name, offeredAs: `app_${command.name}` },
            });
        }
    }

    return facts;
}
