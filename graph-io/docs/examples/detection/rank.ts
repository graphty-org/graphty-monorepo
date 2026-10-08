import { registry, SNIFF_HEAD_BYTES } from "@graphty/graph-io";

const text = "id,label\nn1,Alice\nn2,Bob\n";
const head = new TextEncoder().encode(text).subarray(0, SNIFF_HEAD_BYTES);

// every format that could be the file, best first
for (const candidate of registry.sniffAll({ filename: "people.csv", head })) {
    console.log(`${candidate.format}: ${candidate.confidence.toFixed(2)}`);
}
