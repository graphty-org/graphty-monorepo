import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";
import { Workspace } from "./workspace/Workspace";

/**
 * Main application component.
 *
 * The tier 1 workspace (src/workspace/) is the default surface.
 * Two parameters reach another surface: `?classic` is the app shell of
 * design/ui/app-shell-progressive-disclosure-design.md, kept reachable after the
 * workspace replaced it as the default; `?demo` is the compact component gallery,
 * which is a component catalogue rather than a shell
 * (design/ui/mockups/system/COMPACTION.md). `?next`, which reached the workspace
 * while it was built beside the shell, still works because it is no longer
 * special-cased: like any unrecognised parameter (`?legacy` included), it falls
 * through to the workspace.
 * @returns The application root component.
 */
export function App(): React.JSX.Element {
    const params = new URLSearchParams(window.location.search);

    if (params.has("demo")) {
        return (
            <ErrorBoundary>
                <CompactComponentsDemo />
            </ErrorBoundary>
        );
    }

    if (params.has("classic")) {
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
