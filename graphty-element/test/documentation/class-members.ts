/**
 * The members one class declares, read with the TypeScript parser, each with the doc comment
 * attached to its own declaration.
 *
 * Reading the source with a regular expression over the whole file cannot tell which comment
 * belongs to which member, or whether a member is private: a member "had" an `@example` when any
 * earlier comment in the file did. The parser attaches each comment to the declaration it sits on.
 */
import { readFileSync } from "node:fs";

import ts from "typescript";

/** One declaration of a class member. */
export interface ClassMember {
    /** the declaration: a method, an accessor or a field (overloads give several) */
    readonly node: ts.ClassElement;
    /** whether a reader can reach it: neither `private`, `protected` nor `#private` */
    readonly isPublic: boolean;
}

/**
 * Every named member of one class, by name.
 * @param file - the source file that declares the class
 * @param className - the class
 * @returns each name with its declarations
 */
export function classMembers(file: string, className: string): Map<string, ClassMember[]> {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const declaration = source.statements.find(
        (statement): statement is ts.ClassDeclaration =>
            ts.isClassDeclaration(statement) && statement.name?.text === className,
    );

    if (declaration === undefined) {
        throw new Error(`${file} declares no class ${className}`);
    }

    const members = new Map<string, ClassMember[]>();

    for (const node of declaration.members) {
        if (node.name === undefined || !(ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name))) {
            continue;
        }

        const hidden =
            ts.isPrivateIdentifier(node.name) ||
            (ts.getCombinedModifierFlags(node) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !== 0;
        const list = members.get(node.name.text) ?? [];
        list.push({ node, isPublic: !hidden });
        members.set(node.name.text, list);
    }

    return members;
}

/**
 * The names of a class's public members.
 * @param file - the source file that declares the class
 * @param className - the class
 * @returns the names a reader can call or read
 */
export function publicMemberNames(file: string, className: string): Set<string> {
    return new Set(
        [...classMembers(file, className)]
            .filter(([, declarations]) => declarations.some((member) => member.isPublic))
            .map(([name]) => name),
    );
}

/**
 * Whether a declaration's own doc comment has text, and which tags it carries.
 * @param node - the declaration
 * @returns the comment's text and tag names
 */
export function docOf(node: ts.Node): { text: string; tags: Set<string> } {
    const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
    const text = docs
        .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "")
        .join("\n")
        .trim();
    const tags = new Set(docs.flatMap((doc) => (doc.tags ?? []).map((tag) => tag.tagName.text)));

    return { text, tags };
}
