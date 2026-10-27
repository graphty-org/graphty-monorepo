/** Options for `pickFiles` and `useFileDrop`: which files are wanted. */
export interface PickFilesOptions {
    /**
     * The files offered, in the `accept` attribute's form: extensions (`.csv`), MIME types
     * (`text/csv`) and wildcards (`image/*`), comma separated. Every file when unset.
     */
    accept?: string;
    /** Whether the reader may choose more than one file. @default false */
    multiple?: boolean;
}

/**
 * Opens the browser's file picker. Call it from a click or key handler: browsers open a picker
 * only in answer to the reader's own input.
 * @param options - which files, and whether more than one.
 * @param options.accept - the files offered, in the `accept` attribute's form.
 * @param options.multiple - whether the reader may choose more than one.
 * @returns the chosen files; empty when the reader cancels.
 * @example
 * ```ts
 * const [file] = await pickFiles({ accept: ".csv,.json" });
 * ```
 */
export function pickFiles({ accept, multiple = false }: PickFilesOptions = {}): Promise<File[]> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = multiple;
        if (accept !== undefined) {
            input.accept = accept;
        }
        input.addEventListener("change", () => {
            resolve([...(input.files ?? [])]);
        });
        input.addEventListener("cancel", () => {
            resolve([]);
        });
        input.click();
    });
}

/**
 * Whether a file matches an `accept` list, as the file picker would offer it.
 * @param file - the file.
 * @param accept - the `accept` list; every file matches when it is unset or empty.
 * @returns true when the file is accepted.
 */
export function acceptsFile(file: File, accept: string | undefined): boolean {
    const tokens = (accept ?? "")
        .split(",")
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token !== "");
    if (tokens.length === 0) {
        return true;
    }
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return tokens.some((token) => {
        if (token.startsWith(".")) {
            return name.endsWith(token);
        }
        if (token.endsWith("/*")) {
            return type.startsWith(token.slice(0, -1));
        }
        return type === token;
    });
}
