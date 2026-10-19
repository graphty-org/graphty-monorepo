import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Workspace } from "./workspace/Workspace";

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
                <CompactComponentsDemo />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <Workspace initialState={{ autosave: true }} />
        </ErrorBoundary>
    );
}
