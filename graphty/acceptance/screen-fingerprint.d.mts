/** Types for screen-fingerprint.mjs, so the real-element tests' reload() can use it. */
export declare function screenFingerprint(): string[];
export declare function fingerprintChanges(
    before: readonly string[],
    after: readonly string[],
    allowed?: readonly string[],
): { missing: string[]; appeared: string[] };
