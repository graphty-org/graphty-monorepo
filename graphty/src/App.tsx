// The gallery is imported statically on purpose (issue #9138). It is about 4 KiB gzipped, but as a
// dynamic import it was one more lazy entry sharing the start page's Mantine and compact-mantine
// modules, and the bundler splits a shared module into a chunk of its own for every distinct set
// of entries that reach it: the lazy gallery cost the landing page five extra files.
import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { bootQuery } from "./lib/analytics";
import { Workspace } from "./workspace/Workspace";

/**
 * Main application component.
 *
 * The workspace is the app. Any other query string, including `?next` (the parameter
 * it was built behind) and `?legacy` (the removed old shell), opens it too, so old
 * links keep working. `?demo` is the compact component gallery,
 * a component catalog rather than a shell (design/ui/mockups/system/COMPACTION-1.6.md).
 * @returns The application root component.
 */
export function App(): React.JSX.Element {
    // The query as it was at boot: Share usage data removes it from the address bar.
    if (bootQuery().has("demo")) {
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
