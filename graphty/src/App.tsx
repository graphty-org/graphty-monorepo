import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";
import { Workspace } from "./workspace/Workspace";

/**
 * Main application component.
 *
 * The tier 1 workspace (design/ui/tier1-real-app/plan.md) is the default
 * surface. `?next`, the parameter it was built behind, still opens it, so old
 * links keep working. `?legacy` opens the superseded progressive-disclosure app
 * shell until issue #3056 deletes it. `?demo` is the compact component gallery,
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

    if (params.has("legacy")) {
        return (
            <ErrorBoundary>
                <AppShell />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <Workspace />
        </ErrorBoundary>
    );
}
