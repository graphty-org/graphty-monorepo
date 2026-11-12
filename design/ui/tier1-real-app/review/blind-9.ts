// Blind-author canonical example for "Style channel sections and their order (#789)":
// draw a node style panel with one heading per section, channels in the element's order.
import { channelsFor } from "@graphty/graphty-element/catalog";
import { CHANNEL_SECTIONS } from "@graphty/graphty-element/schema";

const panel = document.querySelector("#style-panel")!;
const nodeChannels = channelsFor("node");
for (const section of CHANNEL_SECTIONS.node) {
    const heading = document.createElement("h3");
    heading.textContent = section; // "fill", "size", ... -- no display name is published, so the raw key shows
    panel.append(heading);
    for (const channel of nodeChannels.filter((c) => c.section === section)) {
        const row = document.createElement("label");
        row.textContent = channel.shortName;
        panel.append(row);
    }
}
