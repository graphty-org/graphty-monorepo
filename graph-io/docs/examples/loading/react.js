import { isAbortError, loadFromUrl } from "@graphty/graph-io";
import { useEffect, useState } from "react";

const GOT =
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml";

// Load a graph and return the function that cancels the load: the shape a React effect's cleanup takes
function watchGraph(url, onGraph, onError) {
    const controller = new AbortController();
    loadFromUrl(url, { signal: controller.signal }).then(
        ({ snapshot }) => onGraph(snapshot),
        (err) => {
            if (!isAbortError(err)) {
                onError(err);
            }
        },
    );
    return () => controller.abort();
}

// The graph at `url`, for a component. A new URL, or the component going away, cancels the old load.
export function useGraph(url) {
    const [snapshot, setSnapshot] = useState(null); // in TypeScript: useState<GraphSnapshot | null>(null)
    const [error, setError] = useState(null);
    useEffect(() => watchGraph(url, setSnapshot, setError), [url]);
    return { snapshot, error };
}

// export function GraphSummary({ url }) {
//     const { snapshot, error } = useGraph(url);
//     if (error) {
//         return <p>Could not load the graph: {error.message}</p>;
//     }
//     return <p>{snapshot ? `${snapshot.nodeCount} nodes` : "Loading..."}</p>;
// }

// What the effect does outside React: a load cancelled before it finishes reports nothing
const stop = watchGraph(GOT, () => console.log("never printed"), console.error);
stop();
await new Promise((done) => {
    watchGraph(GOT, (snapshot) => done(console.log(`loaded ${snapshot.nodeCount} nodes`)), console.error);
});
