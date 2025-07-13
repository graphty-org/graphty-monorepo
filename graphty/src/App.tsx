import {Graphty} from "./components/Graphty";

export function App(): React.JSX.Element {
    return (
        <div className="app">
            <header className="app-header">
                <h1>Graphty - Graph Visualization</h1>
            </header>
            <main className="app-main">
                <Graphty />
            </main>
        </div>
    );
}
