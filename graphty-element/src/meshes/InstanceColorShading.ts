import { MaterialPluginBase, ShaderLanguage, type StandardMaterial } from "@babylonjs/core";

/**
 * @file Make a node's per-instance colour shade like a colour the material carries itself.
 *
 * THE PROBLEM THIS SOLVES. Nodes that differ only in colour are drawn as instances of one mesh
 * with one shared material, and the colour travels in a per-instance vertex colour buffer rather
 * than in the material. That sharing is worth having -- it is one material and one draw call for a
 * graph of ten thousand differently coloured nodes -- but it moves where in the shader the colour
 * is spent, and Babylon's default fragment shader spends a vertex colour LAST:
 *
 *     light        = diffuseBase * diffuseColor + emissiveColor + vAmbientColor
 *     finalDiffuse = clamp(light, 0, 1) * baseColor.rgb    // the instance's colour is in there
 *
 * A material that carries its own colour has that colour inside the clamp, in `diffuseColor` and
 * in the emissive floor, so a lit surface climbs to 1.2 times the colour before any channel
 * saturates. A neutral material with the colour outside the clamp cannot: the clamp caps the light
 * term at 1, so the brightest a pixel can be is the colour itself, and every surface lit past 0.8
 * -- under this element's single hemispheric light, the whole cap of the node facing the light --
 * comes out as one flat patch of unshaded colour. The node stops looking round.
 *
 * WHY IT HAS TO BE THE SHADER. The cap is a consequence of the multiply landing after the clamp,
 * so nothing set on the material can undo it: turning the diffuse down, dropping the emissive
 * floor or lifting the light's ground colour all move where the gradient starts and none of them
 * raise its ceiling, because `clamp(x) * colour` is at most `colour` whatever x is. The only place
 * the ceiling exists is the expression itself, and the smallest honest correction is to multiply
 * the instance colour into the light term BEFORE the clamp, which is what this plugin does:
 *
 *     finalDiffuse = clamp(light * baseColor.rgb, 0, 1)
 *
 * WHAT IT DOES NOT CHANGE. On a material whose instances carry no colour, `baseColor.rgb` is 1 and
 * moving the multiply is arithmetically nothing. The shadowed end does not move either: a pixel at
 * the brightness floor was `0.55 * colour` before and is `0.55 * colour` after -- the floor still
 * lifts each node in proportion to its own colour. Only the saturated cap changes, which is the
 * whole of what was lost. The specular highlight is added after `finalDiffuse` and is not touched.
 */

/**
 * The name the plugin is registered under on a material.
 *
 * Also what {@link StandardMaterial.pluginManager.getPlugin} answers to, so a second attach to the
 * same material is refused rather than doubled.
 */
const PLUGIN_NAME = "GraphtyInstanceColorShading";

/**
 * Where this sits among a material's plugins.
 *
 * It rewrites one line of the stock shader and adds nothing of its own, so it has no relationship
 * to any other plugin's ordering. Babylon's own plugins sit between 100 and 500; this is above
 * them so that a plugin which also rewrites the lit term gets there first and this one then finds
 * nothing to match, rather than the two silently fighting over the same expression.
 */
const PLUGIN_PRIORITY = 900;

/**
 * The stock line, as a regular expression, and its replacement -- one pair per shader language.
 *
 * MATCHED LOOSELY ON PURPOSE. Babylon ships the shader minified, but the string handed to a plugin
 * has been through the shader processor, so the whitespace is not something to depend on. What is
 * depended on is the shape of the expression, and if Babylon ever changes that the match fails,
 * the shader is left exactly as it was, and `test/browser/lit-node-is-shaded-not-flooded.test.ts`
 * fails -- which is the point of measuring the fix in the frame buffer rather than in the source.
 *
 * ONLY THE PLAIN BRANCH IS REWRITTEN. The shader writes `finalDiffuse` three times, once each for
 * `EMISSIVEASILLUMINATION` and `LINKEMISSIVEWITHDIFFUSE` and once for neither, and only the last
 * is matched here. The other two mean something different by "emissive" and the node material sets
 * neither flag; a material that did would keep the stock behaviour, visibly, rather than get a
 * rewrite of an expression this file has not reasoned about.
 */
const LIT_TERM: Record<"glsl" | "wgsl", { readonly stock: string; readonly shaded: string }> = {
    glsl: {
        stock:
            String.raw`vec3\s+finalDiffuse\s*=\s*clamp\(\s*diffuseBase\s*\*\s*diffuseColor\s*\+\s*` +
            String.raw`emissiveColor\s*\+\s*vAmbientColor\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*\*\s*baseColor\.rgb\s*;`,
        shaded: "vec3 finalDiffuse=clamp((diffuseBase*diffuseColor+emissiveColor+vAmbientColor)*baseColor.rgb,0.0,1.0);",
    },
    wgsl: {
        stock:
            String.raw`var\s+finalDiffuse\s*:\s*vec3f\s*=\s*clamp\(\s*diffuseBase\s*\*\s*diffuseColor\s*\+\s*` +
            String.raw`emissiveColor\s*\+\s*uniforms\.vAmbientColor\s*,\s*vec3f\(0\.0\)\s*,\s*vec3f\(1\.0\)\s*\)` +
            String.raw`\s*\*\s*baseColor\.rgb\s*;`,
        shaded:
            "var finalDiffuse: vec3f=clamp((diffuseBase*diffuseColor+emissiveColor+uniforms.vAmbientColor)" +
            "*baseColor.rgb,vec3f(0.0),vec3f(1.0));",
    },
};

/**
 * Shades a per-instance colour the way a material's own colour is shaded.
 *
 * Attach it to a lit material whose colour arrives per instance; see the file comment for what it
 * rewrites and why nothing outside the shader can do the same job.
 */
class InstanceColorShading extends MaterialPluginBase {
    /**
     * Attaches the plugin to one material and switches it on.
     * @param material - The material to shade.
     */
    constructor(material: StandardMaterial) {
        // Enabled from the moment it is attached: it carries no properties of its own, so there is
        // no later moment at which it would be switched on.
        super(material, PLUGIN_NAME, PLUGIN_PRIORITY, {}, true, true);
    }

    /**
     * The name Babylon keys this plugin's shader define on.
     * @returns The class name.
     */
    override getClassName(): string {
        return PLUGIN_NAME;
    }

    /**
     * Whether this plugin can be attached to a material written in the given shader language.
     *
     * Both, because the element builds a WebGPU engine when it is asked for one and a node drawn
     * through WGSL has exactly the same flat cap as one drawn through GLSL. Answering false throws
     * at attach time rather than degrading, so the honest answer for a language this file has a
     * rewrite for is true.
     * @param shaderLanguage - The language the material compiles to.
     * @returns Whether the rewrite below is written for it.
     */
    override isCompatible(shaderLanguage: ShaderLanguage): boolean {
        return shaderLanguage === ShaderLanguage.GLSL || shaderLanguage === ShaderLanguage.WGSL;
    }

    /**
     * The shader edit: move the instance colour inside the clamp on the lit term.
     * @param shaderType - Which shader Babylon is building, "vertex" or "fragment".
     * @param shaderLanguage - The language it is building it in.
     * @returns The replacement, keyed by the regular expression it replaces.
     */
    override getCustomCode(
        shaderType: string,
        shaderLanguage: ShaderLanguage = ShaderLanguage.GLSL,
    ): { [pointName: string]: string } | null {
        if (shaderType !== "fragment") {
            return null;
        }

        const term = shaderLanguage === ShaderLanguage.WGSL ? LIT_TERM.wgsl : LIT_TERM.glsl;

        // A key beginning with "!" is a regular expression to replace rather than a named
        // injection point -- see `MaterialPluginManager._injectCustomCode`.
        return { [`!${term.stock}`]: term.shaded };
    }
}

/**
 * Shade this material's per-instance colours the way a material's own colour would be shaded.
 *
 * For a lit material built neutral so that its instances can carry the colour: without this, every
 * surface lit past four fifths renders as one flat patch of the instance's colour instead of the
 * gradient the light asks for. Attach it BEFORE freezing the material -- a frozen material stops
 * re-evaluating its shader defines, and a plugin is a define.
 *
 * Attaching twice does nothing the second time: Babylon refuses a plugin whose name is already on
 * the material.
 * @param material - The material to shade. Must be lit; an unlit material has no light term to
 *   correct and is left alone by the caller.
 */
export function shadeInstanceColors(material: StandardMaterial): void {
    if (material.pluginManager?.getPlugin(PLUGIN_NAME)) {
        return;
    }

    // Constructed for its side effect on the material, which is how every Babylon material plugin
    // is attached; the instance itself is reached back through `material.pluginManager`.
    void new InstanceColorShading(material);
}
