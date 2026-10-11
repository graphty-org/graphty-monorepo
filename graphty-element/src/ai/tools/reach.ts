/**
 * @file A plugin author's check that what they registered reaches graphty-element's assistant. The
 * element's own coverage test runs only in its build; this is the same question asked of a
 * plugin's own registrations, from its own test. Plain data in, coded facts out; no renderer.
 */

import { BUILT_IN_ALGORITHMS } from "../../catalog/algorithms";
import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import { CAMERA_DESCRIPTORS } from "../../catalog/cameras";
import { FORMAT_DESCRIPTORS } from "../../catalog/formats";
import { LAYOUT_DESCRIPTORS } from "../../catalog/layouts";
import type { OptionDescriptor } from "../../catalog/types";
import { SESSION_CATALOG_TABLES } from "../../session/catalog";
import type { CodedFact } from "../../session/shared";
import type { GraphSession } from "../../session/types";
import { optionField } from "./optionSchema";

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
 * @param session - The session whose catalog to read; the registered tables when absent.
 * @param commands - Assistant commands to check, by name.
 * @returns The facts, empty when everything registered reaches the assistant.
 * @since 4.0.0
 */
export function assistantReach(
    session?: Pick<GraphSession, "catalog">,
    commands: readonly { readonly name: string }[] = [],
): readonly CodedFact<AssistantReachCode>[] {
    const tables = session?.catalog ?? SESSION_CATALOG_TABLES;
    const facts: CodedFact<AssistantReachCode>[] = [];
    const builtIn = new Set<string>([
        ...BUILT_IN_ALGORITHMS.map((entry) => entry.key),
        ...LAYOUT_DESCRIPTORS.map((entry) => entry.id),
        ...CAMERA_DESCRIPTORS.map((entry) => entry.id),
        ...FORMAT_DESCRIPTORS.map((entry) => entry.id),
    ]);
    const check = (entry: string, options: readonly OptionDescriptor[], description: string | undefined): void => {
        if (description?.trim() === "") {
            facts.push({ code: "ai.no-description", params: { entry } });
        }

        for (const option of options) {
            if (option.internal !== true && optionField(option) === undefined) {
                facts.push({ code: "ai.option-unoffered", params: { entry, option: option.name, type: option.type } });
            }
        }
    };

    for (const entry of tables.algorithms().filter((each) => !builtIn.has(each.key))) {
        check(entry.key, entry.options, entry.description);
    }

    for (const entry of tables.layouts().filter((each) => !builtIn.has(each.id))) {
        check(entry.id, entry.options, entry.description);
    }

    for (const entry of tables.cameras().filter((each) => !builtIn.has(each.id))) {
        check(entry.id, entry.options, entry.description);
    }

    for (const entry of tables.formats().filter((each) => !builtIn.has(each.id))) {
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
