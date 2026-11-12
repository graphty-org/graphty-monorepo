/** Types of ai-framework-packages.mjs, for the TypeScript tests that read the list. */

export type FrameworkFamily = "ai-sdk" | "tanstack" | "vendor" | "webllm";

export declare const FRAMEWORK_FAMILIES: Readonly<
    Record<FrameworkFamily, { readonly exact: readonly string[]; readonly prefixes: readonly string[] }>
>;
export declare const FRAMEWORK_PACKAGES: Readonly<{ exact: readonly string[]; prefixes: readonly string[] }>;
export declare function packageName(specifier: string): string;
export declare function frameworkFamily(specifier: string): FrameworkFamily | undefined;
export declare function frameworkSpecifierSource(families: readonly FrameworkFamily[]): string;
