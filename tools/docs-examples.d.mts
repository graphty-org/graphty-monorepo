/** What each `console.log(...); // <text>` line of an example says it prints, in order. */
export declare function promisedOutput(source: string): string[];
/** One test per example in `dir`: runs it and checks what it printed against its comments. */
export declare function describeDocsExamples(dir: string, options?: { beforeEach?: () => void }): void;
