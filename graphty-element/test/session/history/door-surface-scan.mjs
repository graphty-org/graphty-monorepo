/**
 * @file Reads the declared types of the door roots with the TypeScript compiler and prints what
 * door-surface.test.ts checks, as JSON.
 *
 * Usage: node door-surface-scan.mjs <file>:<Name>...
 *
 * Prints `{ roots, managers }`: for each `file:Name` argument, whether the file declares that class
 * or interface, its public member names, and for each member the handle types it hands back (see
 * `handleTypes`); and every exported class under `src/managers/`, as `file:Name`.
 *
 * door-surface.test.ts runs this in a child process rather than in its own test worker. A worker
 * under `--coverage` counts every block of every script it runs, the TypeScript compiler included
 * (vitest's v8 provider starts precise block coverage for the whole isolate and drops what is not in
 * src/ only afterwards), which made building the program take about 12 s instead of about 2.5 s. A
 * child process is not instrumented.
 *
 * It reads declared types rather than walking objects at run time: at run time a TypeScript
 * `private` method cannot be told from a public one, and a public instance field (`Graph.styles`)
 * is not on the prototype at all. `getPropertiesOfType` yields methods, accessors and fields,
 * inherited ones included. Members that are `private` or `protected` in every declaration, or
 * `#`-named, are dropped, and so are members declared only outside `src/` (the `HTMLElement` and
 * `LitElement` surface).
 */

import { readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

import ts from "typescript";

const PACKAGE_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SRC = join(PACKAGE_ROOT, "src") + sep;

const roots = process.argv.slice(2).map((key) => {
    const at = key.lastIndexOf(":");
    return { key, file: key.slice(0, at), name: key.slice(at + 1) };
});

const config = ts.getParsedCommandLineOfConfigFile(
    join(PACKAGE_ROOT, "tsconfig.json"),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
);
if (config === undefined) {
    throw new Error("cannot read tsconfig.json");
}

const program = ts.createProgram(
    roots.map((root) => resolve(PACKAGE_ROOT, root.file)),
    { ...config.options, noEmit: true },
);
const checker = program.getTypeChecker();

/**
 * The declaration of a class or interface named `name` at the top level of `file`.
 * @param file - Relative to the package root.
 * @param name - The declared name.
 * @returns The declaration, or undefined.
 */
function declarationOf(file, name) {
    const source = program.getSourceFile(resolve(PACKAGE_ROOT, file));
    let found;
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
function publicMembers(declaration) {
    const symbol = checker.getSymbolAtLocation(declaration.name ?? declaration);
    if (symbol === undefined) {
        throw new Error(`no symbol for ${declaration.name?.text ?? "a declaration"}`);
    }

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
function handleTypes(type, out) {
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
        for (const argument of checker.getTypeArguments(type)) {
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
 * The handle types one member hands back: its methods' return types, or its own type.
 * @param member - A public member.
 * @returns `file:Name` keys.
 */
function handlesOf(member) {
    const type = checker.getTypeOfSymbol(member);
    const found = new Set();
    const signatures = type.getCallSignatures();
    if (signatures.length > 0) {
        for (const signature of signatures) {
            handleTypes(signature.getReturnType(), found);
        }
    } else {
        handleTypes(type, found);
    }

    return [...found];
}

const scanned = {};
for (const root of roots) {
    const declaration = declarationOf(root.file, root.name);
    if (declaration === undefined) {
        scanned[root.key] = { declared: false, members: [], handles: {} };
        continue;
    }

    const members = publicMembers(declaration);
    scanned[root.key] = {
        declared: true,
        members: members.map((member) => member.name),
        handles: Object.fromEntries(members.map((member) => [member.name, handlesOf(member)])),
    };
}

const managers = readdirSync(join(SRC, "managers"))
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => {
        const path = `src/managers/${file}`;
        const source = program.getSourceFile(resolve(PACKAGE_ROOT, path));
        const classes = [];
        if (source !== undefined) {
            ts.forEachChild(source, (node) => {
                if (
                    ts.isClassDeclaration(node) &&
                    node.name !== undefined &&
                    (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0
                ) {
                    classes.push(`${path}:${node.name.text}`);
                }
            });
        }

        return classes;
    });

process.stdout.write(JSON.stringify({ roots: scanned, managers }));
