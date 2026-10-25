import { lazy, Suspense } from "react";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Workspace } from "./workspace/Workspace";

// The gallery loads only when asked for, so the start page's first paint
// does not wait for it.
const CompactComponentsDemo = lazy(async () => ({
    default: (await import("./components/demo/CompactComponentsDemo")).CompactComponentsDemo,
}));

/**
 * Main application component.
 *
 * The workspace is the app. Any other query string, including `?next` (the parameter
 * it was built behind) and `?legacy` (the removed old shell), opens it too, so old
 * links keep working. `?demo` is the compact component gallery,
 * a component catalogue rather than a shell (design/ui/mockups/system/COMPACTION.md).
 * @returns The application root component.
 */
export function App(): React.JSX.Element {
    const params = new URLSearchParams(globalThis.location.search);

    if (params.has("demo")) {
        return (
            <ErrorBoundary>
                <Suspense>
                    <CompactComponentsDemo />
                </Suspense>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <Workspace initialState={{ autosave: true }} />
        </ErrorBoundary>
    );
}
// scratch ruleset trial 20261025T2255
