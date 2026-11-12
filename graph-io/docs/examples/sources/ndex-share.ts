import { loadFromSource } from "@graphty/graph-io";
import { parseShareUrl } from "@graphty/graph-io/sources/ndex";

// a link NDEx gives when a network is shared by link; the access key becomes a credential
const link = parseShareUrl(
    "https://www.ndexbio.org/viewer/networks/86719f5b-1439-11f0-9806-005056ae3c32?accesskey=0123abcd",
);
console.log(link.params, link.endpoint, link.credential);

const { snapshot } = await loadFromSource("ndex", link.params, {
    endpoint: link.endpoint,
    credential: link.credential,
});
console.log(`${snapshot.nodeCount} nodes`);
