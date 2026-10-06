/**
 * Reads the DOM event names `<graphty-element>` emits out of `src/events.ts`.
 *
 * The element forwards every internal graph event to the DOM unchanged: one
 * `dispatchEvent(new CustomEvent(event.type, { detail: event }))` in
 * `src/graphty-element.ts`. AI events travel on the same graph channel. So the forwarded DOM
 * event names are the `type` string literals in the `GraphEvent` and `AiEvent` unions, less the
 * ones `INTERNAL_EVENT_TYPES` keeps inside the element, and the `detail` of each one is the
 * interface that carries that literal.
 *
 * Node events are not here: they reach the DOM under `graphty-` names with a reduced detail, and
 * are declared, with the element's other own events, in its global `HTMLElementEventMap`, which
 * `readOwnDomEvents` reads. Edge events never reach the DOM at all.
 *
 * Because the name is computed at run time, a manifest analyzer looking at the element alone
 * sees only "a CustomEvent" with no name. This module recovers the names so the custom elements
 * manifest can list them.
 *
 * This is a stopgap. When the element gains a runtime event table (an `eventDescriptors` array
 * the dispatcher itself reads, so that an event missing from the table cannot be emitted), this
 * file should be deleted and the manifest plugin should import that table instead.
 */

import { readFileSync } from "node:fs";

import ts from "typescript";

/** The union type aliases whose members are forwarded to the DOM. */
const EVENT_UNIONS = ["GraphEvent", "AiEvent"];

/** The set of graph event types that are never forwarded. */
const INTERNAL_SET = "INTERNAL_EVENT_TYPES";

/**
 * Collects the string literals a `type` property declares, whether one or a union of several.
 * @param {ts.TypeNode | undefined} node The declared type of the `type` property.
 * @returns {string[]} Every string literal the property can hold, in declaration order.
 */
function stringLiterals(node) {
    if (!node) {
        return [];
    }

    if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
        return [node.literal.text];
    }

    if (ts.isUnionTypeNode(node)) {
        return node.types.flatMap(stringLiterals);
    }

    return [];
}

/**
 * Reads the first line of an interface's JSDoc comment, if it has one.
 * @param {ts.InterfaceDeclaration} declaration The interface to read.
 * @returns {string} The description, or an empty string when the interface carries no JSDoc.
 */
function description(declaration) {
    const docs = ts.getJSDocCommentsAndTags(declaration).filter((doc) => ts.isJSDoc(doc));
    const comment = docs[0]?.comment;

    if (typeof comment === "string") {
        return comment.split("\n")[0].trim();
    }

    return "";
}

/**
 * Collects every string literal under a node.
 * @param {ts.Node | undefined} node The node to search.
 * @param {Set<string>} into Where the literals go.
 */
function collectStrings(node, into) {
    if (!node) {
        return;
    }

    if (ts.isStringLiteral(node)) {
        into.add(node.text);
    }

    ts.forEachChild(node, (child) => collectStrings(child, into));
}

/**
 * Reads every forwarded DOM event out of the event module's source.
 * @param {string} eventsFile Absolute path to `src/events.ts`.
 * @returns {{ name: string, detail: string, description: string }[]} One entry per event name,
 *     sorted by name. `detail` is the name of the interface the event's `detail` carries.
 * @throws {Error} When the module declares no events, which means its shape changed and this
 *     reader is now silently wrong.
 */
export function readDomEvents(eventsFile) {
    const source = ts.createSourceFile(eventsFile, readFileSync(eventsFile, "utf8"), ts.ScriptTarget.ES2022, true);

    /** @type {Map<string, { names: string[], description: string }>} */
    const interfaces = new Map();
    /** @type {Map<string, string[]>} */
    const aliases = new Map();
    /** @type {Set<string>} */
    const internal = new Set();

    for (const statement of source.statements) {
        if (ts.isInterfaceDeclaration(statement)) {
            const property = statement.members.find(
                (member) => ts.isPropertySignature(member) && member.name.getText(source) === "type",
            );

            // An interface with no `type` member is not an event, and there are such interfaces in
            // the module -- `NodeEventDetail` is the shape a node event's DOM `detail` carries, not
            // an event. `find` answers undefined for one, and `ts.isPropertySignature` reads
            // `.kind` off whatever it is handed, so calling it with that undefined threw and took
            // the whole custom-elements manifest with it: `vite build` and every Storybook test
            // failed to start, with the error blamed on the manifest plugin.
            interfaces.set(statement.name.text, {
                names: property === undefined ? [] : stringLiterals(property.type),
                description: description(statement),
            });
            continue;
        }

        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === INTERNAL_SET) {
                    collectStrings(declaration.initializer, internal);
                }
            }
            continue;
        }

        if (ts.isTypeAliasDeclaration(statement) && EVENT_UNIONS.includes(statement.name.text)) {
            const members = ts.isUnionTypeNode(statement.type) ? statement.type.types : [statement.type];

            aliases.set(
                statement.name.text,
                members
                    .filter((member) => ts.isTypeReferenceNode(member))
                    .map((member) => member.typeName.getText(source)),
            );
        }
    }

    /** @type {Map<string, { name: string, detail: string, description: string }>} */
    const events = new Map();

    for (const union of EVENT_UNIONS) {
        for (const member of aliases.get(union) ?? []) {
            const declared = interfaces.get(member);

            for (const name of (declared?.names ?? []).filter((name) => !internal.has(name))) {
                events.set(name, { name, detail: member, description: declared?.description ?? "" });
            }
        }
    }

    if (events.size === 0) {
        throw new Error(
            `No DOM events found in ${eventsFile}. The event unions (${EVENT_UNIONS.join(", ")}) ` +
                "no longer have the shape this reader expects; fix scripts/dom-events.mjs rather than " +
                "shipping a manifest with no events.",
        );
    }

    return [...events.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads the DOM events the element dispatches about itself out of its global `HTMLElementEventMap`
 * declaration: the `graphty-` events, node events among them.
 *
 * The declaration is what types `addEventListener` for a consumer, so it is the list a consumer
 * already relies on. The analyzer cannot produce it: it misses events dispatched from the
 * constructor and invents one named after the variable a computed name is held in.
 * @param {string} elementFile Absolute path to `src/graphty-element.ts`.
 * @returns {{ name: string, type: string }[]} One entry per event, in declaration order. `type`
 *     is the declared event type, `CustomEvent<...>`, as written.
 * @throws {Error} When the declaration is not found, which means its shape changed.
 */
export function readOwnDomEvents(elementFile) {
    const source = ts.createSourceFile(elementFile, readFileSync(elementFile, "utf8"), ts.ScriptTarget.ES2022, true);
    /** @type {{ name: string, type: string }[]} */
    const events = [];

    /** @param {ts.Node} node The node to search. */
    function visit(node) {
        if (ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElementEventMap") {
            for (const member of node.members) {
                if (ts.isPropertySignature(member) && member.name && ts.isStringLiteral(member.name) && member.type) {
                    events.push({ name: member.name.text, type: member.type.getText(source).replace(/\s+/g, " ") });
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    if (events.length === 0) {
        throw new Error(
            `No HTMLElementEventMap declaration found in ${elementFile}; fix scripts/dom-events.mjs rather than ` +
                "shipping a manifest without the element's own events.",
        );
    }

    return events;
}
