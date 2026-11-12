import { Badge } from "@mantine/core";
import React, { useSyncExternalStore } from "react";

import { onSiteConfig, siteConfig } from "../../siteConfig";

/**
 * The header's site chip: names the site when it is canary or nightly, so a reader there knows the
 * build is not production's. Nothing on production, and nothing when the site served no usable
 * site.json.
 * @returns The chip, or nothing
 */
export function SiteChip(): React.JSX.Element | null {
    const site = useSyncExternalStore(onSiteConfig, () => siteConfig().site);
    if (site !== "canary" && site !== "nightly") {
        return null;
    }
    return (
        <Badge size="sm" variant="light" color={site === "canary" ? "orange" : "grape"} aria-label={`Site: ${site}`}>
            {site}
        </Badge>
    );
}
