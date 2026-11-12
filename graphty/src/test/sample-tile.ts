// No imports on purpose: stories use this, and importing Testing Library into a story switches
// React's act environment on, so every update in its play function logs an act(...) warning.

/**
 * A sample tile's accessible name, which begins "Open the <name> sample" and goes on with the
 * tile's visible title ("Open the Les Miserables sample: Who holds the novel together").
 * @param name - the sample's name.
 * @returns a pattern for the tile's name.
 */
export function sampleTile(name: string): RegExp {
    return new RegExp(`^Open the ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} sample: `);
}
