import {CompactComponentsDemo} from "./components/demo/CompactComponentsDemo";
import {AppLayout} from "./components/layout/AppLayout";

export function App(): React.JSX.Element {
    // Show demo page when ?demo is in the URL
    const showDemo = new URLSearchParams(window.location.search).has("demo");

    if (showDemo) {
        return <CompactComponentsDemo />;
    }

    return <AppLayout />;
}
