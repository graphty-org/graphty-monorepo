import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";
import { Workspace } from "./workspace/Workspace";

/**
 * Main application component.
 *
 * The app shell of design/ui/app-shell-progressive-disclosure-design.md is now the
 * only shell: the superseded `AppLayout` and its `?legacy` route were removed
 * 2026-09 at the product owner's request, so an unrecognised parameter --
 * `?legacy` included -- falls through to the shell rather than to a second
 * layout. Two parameters reach another surface: `?demo` is the compact
 * component gallery, which is a component catalogue rather than a shell and is
 * kept (design/ui/mockups/system/COMPACTION.md); `?next` is the tier 1 workspace
 * (design/ui/tier1-real-app/plan.md), built beside this shell until the
 * Switch-over makes it the default and removes the parameter.
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

    if (params.has("next")) {
        return (
            <ErrorBoundary>
                <Workspace />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <AppShell />
        </ErrorBoundary>
    );
}
