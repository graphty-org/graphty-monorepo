import { useEffect, useRef } from "react";

// One mechanism for every development-only diagnostic in the package. Seven
// components warn about a shape the type system cannot catch, and before this
// hook existed each of them wrote its own gate: two tested
// `process.env.NODE_ENV === "production"` and returned early, five tested
// `!== "production"` inline, and two of the seven ran during render rather than
// from an effect -- so under React's StrictMode those two logged twice while
// the other five logged once.
//
// Warning from an effect is also what makes the message correct: a component
// that renders, warns and then throws away its render has not warned about
// anything a consumer can see.
//
// Diagnostics deliberately do not go through useLabels(). They are read by the
// developer who wrote the mistake rather than by that developer's users, they
// never reach a production build, and keeping them in one language is what
// makes them findable in the source from a pasted console line.

/**
 * Reports a mistake to a consumer's console, in development builds only.
 *
 * Build the message during render -- it is a string, so it costs nothing -- and
 * pass `undefined` when there is nothing to report. The message is logged from
 * an effect rather than during render, and the same message is never logged
 * twice in a row for the same component, so a re-render or React's StrictMode
 * double-invoke does not turn one mistake into a column of identical lines.
 *
 * Call it once per distinct thing a component can report, unconditionally, the
 * way every other hook is called.
 * @param message - What is wrong and what to do about it, or undefined when nothing is
 * @example
 * ```tsx
 * useDevWarning(
 *     count > MAX_FIELDS
 *         ? `FieldRow was given ${String(count)} fields, and it holds one or two. Put the extra fields on rows of their own.`
 *         : undefined,
 * );
 * ```
 */
export function useDevWarning(message: string | undefined): void {
    // Surviving the simulated unmount and remount StrictMode performs is the
    // whole point of keeping this in a ref: React preserves refs across it, so
    // the second run of the effect recognises the message it has already
    // logged.
    const reported = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (process.env.NODE_ENV === "production" || message === undefined) {
            return;
        }

        if (reported.current === message) {
            return;
        }

        reported.current = message;
        console.warn(message);
    }, [message]);
}
