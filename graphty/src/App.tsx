import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";

/**
 * Main application component.
 *
 * The app shell of design/ui/app-shell-progressive-disclosure-design.md is now the
 * only shell: the superseded `AppLayout` and its `?legacy` route were removed
 * 2026-09 at the product owner's request, so an unrecognised parameter --
 * `?legacy` included -- falls through to the shell rather than to a second
 * layout. One parameter still reaches another surface: `?demo` is the compact
 * component gallery, which is a component catalogue rather than a shell and is
 * kept (design/ui/mockups/system/COMPACTION.md).
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

    return (
        <ErrorBoundary>
            <AppShell />
        </ErrorBoundary>
    );
}
