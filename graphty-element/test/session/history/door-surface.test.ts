/**
 * @file The completeness check of the door list: every public member of every root in
 * `src/session/commands/doors.ts` has a row, every row names a public member, and every type a
 * public member hands back that has methods is itself a root.
 *
 * It reads declared types with the TypeScript compiler rather than walking objects at run time:
 * at run time a TypeScript `private` method cannot be told from a public one, and a public
 * instance field (`Graph.styles`) is not on the prototype at all. `getPropertiesOfType` yields
 * methods, accessors and fields, inherited ones included. Members that are `private` or
 * `protected` in every declaration, or `#`-named, are dropped, and so are members declared only
 * outside `src/` (the `HTMLElement` and `LitElement` surface).
 */

import { readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, beforeAll, describe, it } from "vitest";

import { DOOR_ROOTS, type DoorRoot } from "../../../src/session/commands/doors";

const PACKAGE_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SRC = join(PACKAGE_ROOT, "src") + sep;

/** Building the program over the element's sources takes a few seconds under coverage. */
const PROGRAM_TIMEOUT_MS = 120_000;

let program: ts.Program;
let checker: ts.TypeChecker;

/**
 * The declaration of a class or interface named `name` at the top level of `file`.
 * @param file - Relative to the package root.
 * @param name - The declared name.
 * @returns The declaration, or undefined.
 */
function declarationOf(file: string, name: string): ts.ClassDeclaration | ts.InterfaceDeclaration | undefined {
    const source = program.getSourceFile(resolve(PACKAGE_ROOT, file));
    let found: ts.ClassDeclaration | ts.InterfaceDeclaration | undefined;
    if (source !== undefined) {
        ts.forEachChild(source, (node) => {
            if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name?.text === name) {
                found = node;
            }
        });
    }

    return found;
}

/**
 * The public members of a declared type, as doors.
 * @param declaration - The class or interface.
 * @returns Its public member symbols.
 */
function publicMembers(declaration: ts.ClassDeclaration | ts.InterfaceDeclaration): ts.Symbol[] {
    const symbol = checker.getSymbolAtLocation(declaration.name ?? declaration);
    assert.isDefined(symbol);
    const type = checker.getDeclaredTypeOfSymbol(symbol);

    return checker.getPropertiesOfType(type).filter((member) => {
        const declarations = member.declarations ?? [];
        if (member.name.startsWith("#") || member.name.startsWith("__@")) {
            return false;
        }

        // Hidden only when every declaration is: a public getter with a private setter is still
        // read from outside.
        if (
            declarations.length > 0 &&
            declarations.every(
                (each) =>
                    (ts.getCombinedModifierFlags(each) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !== 0,
            )
        ) {
            return false;
        }

        return declarations.length === 0 || declarations.some((each) => each.getSourceFile().fileName.startsWith(SRC));
    });
}

/**
 * The class and interface types under `src/` that have methods, reachable from a type through
 * unions, intersections and promises.
 * @param type - A member's type, or a method's return type.
 * @param out - Collects `file:Name` keys.
 */
function handleTypes(type: ts.Type, out: Set<string>): void {
    if (type.isUnionOrIntersection()) {
        for (const each of type.types) {
            handleTypes(each, out);
        }

        return;
    }

    const symbol = type.getSymbol();
    if (symbol === undefined) {
        return;
    }

    if (symbol.name === "Promise" || symbol.name === "PromiseLike") {
        for (const argument of checker.getTypeArguments(type as ts.TypeReference)) {
            handleTypes(argument, out);
        }

        return;
    }

    const declaration = (symbol.declarations ?? []).find(
        (each) =>
            (ts.isClassDeclaration(each) || ts.isInterfaceDeclaration(each)) &&
            each.getSourceFile().fileName.startsWith(SRC),
    );
    if (declaration === undefined) {
        return;
    }

    const hasMethods = checker
        .getPropertiesOfType(type)
        .some((member) => checker.getTypeOfSymbol(member).getCallSignatures().length > 0);
    if (hasMethods) {
        out.add(`${relative(PACKAGE_ROOT, declaration.getSourceFile().fileName).split(sep).join("/")}:${symbol.name}`);
    }
}

/**
 * A root's key, as `handleTypes` spells one.
 * @param root - The root.
 * @returns `file:Name`.
 */
function keyOf(root: DoorRoot): string {
    return `${root.file}:${root.name}`;
}

describe("the door list is complete", () => {
    beforeAll(() => {
        const config = ts.getParsedCommandLineOfConfigFile(
            join(PACKAGE_ROOT, "tsconfig.json"),
            {},
            {
                ...ts.sys,
                onUnRecoverableConfigFileDiagnostic: () => undefined,
            },
        );
        assert.isDefined(config);
        program = ts.createProgram(
            DOOR_ROOTS.map((root) => resolve(PACKAGE_ROOT, root.file)),
            { ...config.options, noEmit: true },
        );
        checker = program.getTypeChecker();
    }, PROGRAM_TIMEOUT_MS);

    it("classifies every public member of every root, and names no member that is not one", () => {
        const unclassified: string[] = [];
        const stale: string[] = [];
        for (const root of DOOR_ROOTS) {
            const declaration = declarationOf(root.file, root.name);
            assert.isDefined(declaration, `${root.file} declares no class or interface ${root.name}`);
            const names = publicMembers(declaration).map((member) => member.name);
            assert.isTrue(
                (root.doors === undefined) !== (root.whole === undefined),
                `${root.name} must have exactly one of doors and whole`,
            );
            if (root.doors === undefined) {
                continue;
            }

            unclassified.push(
                ...names.filter((name) => !Object.hasOwn(root.doors ?? {}, name)).map((name) => `${root.name}.${name}`),
            );
            stale.push(
                ...Object.keys(root.doors)
                    .filter((name) => !names.includes(name))
                    .map((name) => `${root.name}.${name}`),
            );
        }

        assert.deepEqual(unclassified, [], "public members doors.ts does not classify");
        assert.deepEqual(stale, [], "rows in doors.ts naming no public member");
    });

    it("makes every handle type a public member hands back a root", () => {
        const roots = new Set(DOOR_ROOTS.map(keyOf));
        const escaped = new Map<string, string>();
        for (const root of DOOR_ROOTS) {
            const declaration = declarationOf(root.file, root.name);
            assert.isDefined(declaration);
            for (const member of publicMembers(declaration)) {
                const type = checker.getTypeOfSymbol(member);
                const found = new Set<string>();
                const signatures = type.getCallSignatures();
                if (signatures.length > 0) {
                    for (const signature of signatures) {
                        handleTypes(signature.getReturnType(), found);
                    }
                } else {
                    handleTypes(type, found);
                }

                for (const handle of found) {
                    if (!roots.has(handle) && !escaped.has(handle)) {
                        escaped.set(handle, `${root.name}.${member.name}`);
                    }
                }
            }
        }

        assert.deepEqual(
            Object.fromEntries(escaped),
            {},
            "handle types (and where they were reached) that are not roots",
        );
    });

    it("makes every manager class a root", () => {
        const roots = new Set(DOOR_ROOTS.map(keyOf));
        const managers = readdirSync(join(SRC, "managers"))
            .filter((file) => file.endsWith(".ts"))
            .flatMap((file) => {
                const path = `src/managers/${file}`;
                const source = program.getSourceFile(resolve(PACKAGE_ROOT, path));
                const classes: string[] = [];
                if (source !== undefined) {
                    ts.forEachChild(source, (node) => {
                        if (ts.isClassDeclaration(node) && node.name !== undefined) {
                            const exported = ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export;
                            if (exported !== 0) {
                                classes.push(`${path}:${node.name.text}`);
                            }
                        }
                    });
                }

                return classes;
            });

        assert.isNotEmpty(managers);
        assert.deepEqual(
            managers.filter((key) => !roots.has(key)),
            [],
        );
    });
});
