import { GraphtyError } from "../errors/GraphtyError";

/**
 * The error for an optional peer package that is not installed.
 *
 * Every optional peer is loaded as the literal target of an `await import("<package>")` directly
 * inside `try`, never by a static import: a consumer's bundler (webpack, Vite, esbuild) resolves
 * static imports at build time even in a lazily loaded chunk, so a static import of a package the
 * consumer did not install fails their build. The `catch` turns the failed load into this.
 * @param pkg - the optional package
 * @param feature - what needed it
 * @param cause - what the import threw
 * @returns a `GraphtyError` with `E_MISSING_PACKAGE`
 */
export function missingPackage(pkg: string, feature: string, cause: unknown): GraphtyError {
    return new GraphtyError({
        code: "E_MISSING_PACKAGE",
        message: `${feature} needs the optional package ${pkg}.`,
        source: "config",
        details: { package: pkg, feature },
        cause,
    });
}
