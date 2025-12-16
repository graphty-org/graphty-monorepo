import {ErrorBoundary} from "./components/ErrorBoundary";
import {AppLayout} from "./components/layout/AppLayout";

export function App(): React.JSX.Element {
    return (
        <ErrorBoundary>
            <AppLayout />
        </ErrorBoundary>
    );
}
