/**
 * The public methods of graphty-element, read from the api-extractor reports in `api/*.api.md`.
 *
 * A method is a member written as a call signature (`name(...)` or `name<T>(...)`) directly inside
 * a class or interface the report declares, named `Owner.name`. Protected members count: they are
 * the contract a subclass (a layout engine, a data source) implements. Members tagged `@internal`,
 * constructors, accessors and function-typed properties do not. Overloads, and the same owner in
 * several reports, collapse into one name.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** graphty-element's `api/` directory. */
export const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../api");

/** A class or interface the report declares; `Node_2` is api-extractor's rename of `Node`. */
const OWNER = /^(?:export )?(?:declare )?(?:abstract )?(?:class|interface) (\w+?)(?:_\d+)?\b/;
const METHOD = /^ {4}(?:(?:protected|static|abstract|readonly) )*([A-Za-z_$][\w$]*)\??(?:<.*)?\(/;

/**
 * Every public method named in one api-extractor report.
 * @param report - the report's text
 * @returns `Owner.method` names
 */
export function methodsInReport(report: string): Set<string> {
    const methods = new Set<string>();
    let owner: string | undefined;
    let internal = false;
    for (const line of report.split("\n")) {
        const opened = OWNER.exec(line);
        if (opened) {
            owner = opened[1];
            continue;
        }

        if (line === "}") {
            owner = undefined;
            continue;
        }

        if (owner === undefined) {
            continue;
        }

        if (/^ {4}\/\/ @internal/.test(line)) {
            internal = true;
            continue;
        }

        if (/^ {4}\S/.test(line) && !line.startsWith("    //")) {
            const method = METHOD.exec(line);
            if (method && !internal && method[1] !== "constructor") {
                methods.add(`${owner}.${method[1]}`);
            }

            internal = false;
        }
    }

    return methods;
}

/**
 * Every public method in every report under `api/`.
 * @returns `Owner.method` names, sorted
 */
export function publicMethods(): string[] {
    const all = new Set<string>();
    for (const file of readdirSync(API_DIR).filter((name) => name.endsWith(".api.md"))) {
        for (const method of methodsInReport(readFileSync(path.join(API_DIR, file), "utf8"))) {
            all.add(method);
        }
    }

    return [...all].sort();
}
