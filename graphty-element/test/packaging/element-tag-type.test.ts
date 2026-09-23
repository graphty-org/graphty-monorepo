/**
 * @file `document.createElement("graphty-element")` answers the element's own type, not HTMLElement.
 *
 * WHAT WAS WRONG. The package registered the tag and published the class, and told TypeScript
 * nothing about the connection between them. So the two lines every page writes --
 *
 * ```ts
 * const graph = document.createElement("graphty-element");
 * const found = document.querySelector("graphty-element");
 * ```
 *
 * -- both came back as a bare `HTMLElement`, and reaching `nodeData`, `layout` or `session`
 * needed a cast. A cast is not a small tax: it is written in the consumer's code, it is invisible
 * to this package, and it keeps compiling after the property it names is renamed or removed. The
 * package's own extension contract says a third party must be able to write against it "without
 * casting or re-declaring a type the element already has", so this was a violation of a promise
 * the package makes in its own documentation.
 *
 * HOW THIS FILE CHECKS IT, in two halves, because the two failures are different:
 *
 * - The type assertions below are compile-only. They have no runtime effect at all and exist to
 *   be read by `tsc --noEmit`, which `npm run lint` runs over this directory: if the tag stops
 *   resolving to `Graphty`, or resolves to something that has lost a property, this file stops
 *   compiling and the lint gate is red. This is the half that catches a regression in the SHAPE.
 * - The parse below reads `src/graphty-element.ts` and requires the tag the `customElements.define`
 *   call registers to be exactly the tag the global declaration names. This is the half that
 *   catches a regression in the WIRING -- a renamed tag, or a declaration deleted as unused -- and
 *   it runs in the ordinary test run rather than only under the type checker.
 *
 * The declaration reaches a consumer because `tsc --project tsconfig.build.json` emits it into
 * `dist/src/graphty-element.d.ts`, which `dist/index.d.ts` pulls in: a global augmentation
 * applies to the whole program once any file in it is loaded. That end of it was proved by
 * typechecking a consumer that imports only `@graphty/graphty-element` through the published
 * exports map, with `strict` on and `skipLibCheck` off.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

import type { Graphty } from "../../index";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The source file that both registers the tag and declares it. */
const ELEMENT_SOURCE = "src/graphty-element.ts";

// ---------------------------------------------------------------------------------------------
// Compile-only: what a consumer writes, with no cast anywhere in it
// ---------------------------------------------------------------------------------------------

/**
 * True only when each of two types is assignable to the other.
 *
 * BOTH DIRECTIONS, because one direction is exactly the wrong answer here: `Graphty` extends
 * `HTMLElement`, so a single `extends` clause is satisfied by the bare `HTMLElement` this file
 * exists to reject. Going back the other way is what rules it out -- `HTMLElement` has none of
 * the element's properties, so it is not assignable to `Graphty`.
 *
 * The tuple brackets stop a union being distributed over, which would let a union answer "same"
 * to one of its own members.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** A compile-time assertion: the argument must be the literal `true`. */
type Expect<T extends true> = T;

/**
 * What the tag resolves to, which is the one thing both DOM calls are defined in terms of.
 *
 * `lib.dom.d.ts` declares `createElement<K extends keyof HTMLElementTagNameMap>(tagName: K):
 * HTMLElementTagNameMap[K]` and `querySelector<K extends ...>(selectors: K):
 * HTMLElementTagNameMap[K] | null`, so pinning this one lookup pins both answers. Asserting
 * against the two overloaded signatures instead would be asserting about the DOM library.
 */
type TaggedElement = HTMLElementTagNameMap["graphty-element"];

/** The tag gives the element's class, so `createElement` and `querySelector` both do. */
type TagIsGraphty = Expect<Same<TaggedElement, Graphty>>;

/** It is not left at the default, which is what it answered before the declaration existed. */
type TagIsNotBareHtmlElement = Expect<Same<Same<TaggedElement, HTMLElement>, false>>;

/**
 * The three properties a consumer reaches for first, read off the tag with no cast in sight.
 *
 * If any of them stops existing, or the tag stops resolving to the class, this stops compiling.
 */
type ReachableWithoutACast = Expect<
    Same<
        { nodeData: TaggedElement["nodeData"]; layout: TaggedElement["layout"]; session: TaggedElement["session"] },
        { nodeData: Graphty["nodeData"]; layout: Graphty["layout"]; session: Graphty["session"] }
    >
>;

/**
 * The assertions above, gathered so that an unused-name rule cannot quietly delete one.
 *
 * A tuple of `true`s and nothing else: every member is `Expect<...>`, which only resolves when
 * its argument is the literal `true`, so the compiler has already done the checking by the time
 * this alias is written down.
 */
type TagTypeAssertions = [TagIsGraphty, TagIsNotBareHtmlElement, ReachableWithoutACast];

/** Held so the assertion tuple is used rather than merely declared. */
const TAG_TYPE_ASSERTIONS: TagTypeAssertions = [true, true, true];

// ---------------------------------------------------------------------------------------------
// At run time: the registered tag and the declared tag are the same tag
// ---------------------------------------------------------------------------------------------

/**
 * The tag name the `customElements.define` call registers, read out of the source.
 * @param source - The parsed element source file.
 * @returns Every tag registered in the file.
 */
function registeredTags(source: ts.SourceFile): string[] {
    const tags: string[] = [];

    const visit = (node: ts.Node): void => {
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === "customElements" &&
            node.expression.name.text === "define" &&
            node.arguments.length === 2 &&
            ts.isStringLiteral(node.arguments[0])
        ) {
            tags.push(node.arguments[0].text);
        }

        ts.forEachChild(node, visit);
    };

    ts.forEachChild(source, visit);

    return tags;
}

/**
 * The tag names declared on `HTMLElementTagNameMap`, against the type each one is given.
 * @param source - The parsed element source file.
 * @returns Tag name against the declared type's text.
 */
function declaredTags(source: ts.SourceFile): Record<string, string> {
    const declared: Record<string, string> = {};

    const visit = (node: ts.Node): void => {
        if (ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElementTagNameMap") {
            for (const member of node.members) {
                if (ts.isPropertySignature(member) && member.name !== undefined && member.type !== undefined) {
                    declared[ts.isStringLiteral(member.name) ? member.name.text : member.name.getText()] =
                        member.type.getText();
                }
            }
        }

        ts.forEachChild(node, visit);
    };

    ts.forEachChild(source, visit);

    return declared;
}

describe("the custom element tag, as TypeScript sees it", () => {
    const path = resolve(PACKAGE_ROOT, ELEMENT_SOURCE);
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true);

    it("declares every tag it registers, so no consumer has to cast", () => {
        const declared = declaredTags(source);

        for (const tag of registeredTags(source)) {
            assert.property(
                declared,
                tag,
                `${ELEMENT_SOURCE} registers <${tag}> and does not declare it on HTMLElementTagNameMap, ` +
                    "so document.createElement and document.querySelector answer HTMLElement for it",
            );
        }
    });

    it("declares the tag as the element's own class", () => {
        assert.deepEqual(declaredTags(source), { "graphty-element": "Graphty" });
    });

    it("registers exactly one tag, which is the one the package is named for", () => {
        assert.deepEqual(registeredTags(source), ["graphty-element"]);
    });

    it("carries the compile-only assertions the type checker reads", () => {
        // The checking happened when this file was compiled: every member of the tuple is an
        // `Expect<...>`, which resolves only to the literal `true`, so a tag that answered
        // `HTMLElement` would have made the declaration below a type error rather than a red
        // assertion here. This says out loud that the tuple is part of the suite, so that
        // deleting it is a visible change rather than tidying away an unused name.
        assert.deepEqual(TAG_TYPE_ASSERTIONS, [true, true, true]);
    });
});
