/**
 * The nx release changelog renderer: nx's default one, except that a project's changelog lists a
 * commit under "Breaking Changes" only when the commit's scope names that project (or it has no
 * scope). That is the same rule nx applies to the version bump, so a patch release of layout no
 * longer announces the breaking changes of a `feat(algorithms)!` commit that happened to touch it.
 * The commit is still listed under its type.
 */
const DefaultChangelogRenderer = require("nx/release/changelog-renderer").default;

class ScopedBreakingChangelogRenderer extends DefaultChangelogRenderer {
    filterChanges(changes, project) {
        const filtered = super.filterChanges(changes, project);
        if (project === null) {
            return filtered;
        }
        const short = project.replace(/^@graphty\//, "");
        return filtered.map((change) => {
            if (!change.isBreaking || !change.scope) {
                return change;
            }
            const scopes = change.scope.split(",").map((s) => s.trim());
            return scopes.includes(project) || scopes.includes(short) ? change : { ...change, isBreaking: false };
        });
    }
}

module.exports = ScopedBreakingChangelogRenderer;
