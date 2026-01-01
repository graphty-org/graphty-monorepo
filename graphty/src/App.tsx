import { CompactComponentsDemo } from "./components/demo/CompactComponentsDemo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";

/**
 * Main application component that renders either the demo page or the main app layout.
 * @returns The application root component
 */
export function App(): React.JSX.Element {
    // Show demo page when ?demo is in the URL
    const showDemo = new URLSearchParams(window.location.search).has("demo");

    if (showDemo) {
        return (
            <ErrorBoundary>
                <CompactComponentsDemo />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <AppLayout />
        </ErrorBoundary>
    );
}
