import { isAbortError, loadFromUrl } from "@graphty/graph-io";

const GOT =
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml";

// Load a graph and return the function that cancels the load: the shape a React effect's
// cleanup takes, so a component that unmounts or changes its URL stops the old load.
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

// In a component: useEffect(() => watchGraph(url, setSnapshot, setError), [url]);
const stop = watchGraph(GOT, () => console.log("never printed"), console.error);
stop(); // the URL changed before the load finished: this load is cancelled quietly

await new Promise((done) => {
    watchGraph(GOT, (snapshot) => done(console.log(`loaded ${snapshot.nodeCount} nodes`)), console.error);
});
