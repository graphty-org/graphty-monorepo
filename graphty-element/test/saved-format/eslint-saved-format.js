// What reads the built-in shader catalog by id. A shader id in a project names one of the
// project's own shaders, never a preset, so nothing but the catalog and gallery code may look a
// preset up by id: everything else reads `projectShaderDescriptor` or `session.shaders.describe`
// (design/architecture/self-contained-save-files.md, sections 1.2 and 2.4). This file sits with the
// saved-format checks so that widening the allowed list needs the owner's approval.

/**
 * The files that may import `shaderDescriptor`, `shaderDescriptors` or the preset tables. The
 * session's shaders read the catalog only to copy a picked preset's text in and to recognize a
 * project text as a copy of one, never to resolve a saved reference.
 */
export const SHADER_CATALOG_READERS = [
    "src/catalog/shaderRegistry.ts",
    "src/session/catalog.ts",
    "src/session/shaderCatalog.ts",
    "src/session/shaders.ts",
];

const BY_ID_MESSAGE =
    "A shader id names one of the project's own shaders: use projectShaderDescriptor or session.shaders.describe, never the preset catalog by id (design/architecture/self-contained-save-files.md, 1.2).";

/** The flat-config block graphty-element's eslint.config.js spreads in. */
export const savedFormatLint = {
    files: ["src/**/*.ts"],
    ignores: SHADER_CATALOG_READERS,
    rules: {
        "@typescript-eslint/no-restricted-imports": [
            "error",
            {
                patterns: [
                    {
                        regex: "(^|/)(shaderRegistry|catalog)(\\.ts)?$",
                        importNames: ["shaderDescriptor", "shaderDescriptors"],
                        message: BY_ID_MESSAGE,
                    },
                    {
                        regex: "(^|/)shaders/presets(/index|/bodies)?(\\.ts)?$",
                        importNames: ["SHADER_PRESETS", "SHADER_PRESET_BODIES"],
                        message: BY_ID_MESSAGE,
                    },
                ],
            },
        ],
    },
};
