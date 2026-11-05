/**
 * @file The element's own shader presets, as catalog data.
 *
 * Each preset owns a folder, `./<id>/`, holding `descriptor.ts` (catalog data, no GLSL) and
 * `body.ts` (the GLSL string). This file lists the descriptors, one import line per preset, so the
 * catalog loads no GLSL; the renderer loads the bodies when a layer first names a shader
 * (design/rendering/shader-styles.md section 8). Each `thumb.webp` is a URL with `?no-inline`, so
 * the build ships it as a file beside the code rather than as base64 inside every entry point that
 * reaches the catalog: a graph with no shaders downloads no thumbnails.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../catalog/shaders";
import { DESCRIPTOR as ANODIZED_STEEL } from "./anodized-steel/descriptor";
import { DESCRIPTOR as CEL_SHADE } from "./cel-shade/descriptor";
import { DESCRIPTOR as CHANGE_FLASH } from "./change-flash/descriptor";
import { DESCRIPTOR as COLORBLIND_PATTERNS } from "./colorblind-patterns/descriptor";
import { COMET_TRACERS } from "./comet-tracers/descriptor";
import { DISCO_BALL } from "./disco-ball/descriptor";
import { EDGE_CHANGE } from "./edge-change/descriptor";
import { FIBER_OPTIC } from "./fiber-optic/descriptor";
import { FIBER_PACKETS } from "./fiber-packets/descriptor";
import { DESCRIPTOR as FOIL_SHIMMER } from "./foil-shimmer/descriptor";
import { DESCRIPTOR as FROST } from "./frost/descriptor";
import { DESCRIPTOR as FROSTED_GLASS } from "./frosted-glass/descriptor";
import { GEMSTONE } from "./gemstone/descriptor";
import { GLASS } from "./glass/descriptor";
import { GLASS_MARBLE } from "./glass-marble/descriptor";
import { DESCRIPTOR as HALFTONE } from "./halftone/descriptor";
import { DESCRIPTOR as HOLOGRAM } from "./hologram/descriptor";
import { DESCRIPTOR as ICON_STICKER } from "./icon-sticker/descriptor";
import { LANTERN } from "./lantern/descriptor";
import { DESCRIPTOR as LIQUID_METAL } from "./liquid-metal/descriptor";
import { DESCRIPTOR as LOCK_ON_RETICLE } from "./lock-on-reticle/descriptor";
import { DESCRIPTOR as MANDALA } from "./mandala/descriptor";
import { DESCRIPTOR as MATCAP_INK } from "./matcap-ink/descriptor";
import { DESCRIPTOR as METABALL_HULL } from "./metaball-hull/descriptor";
import { DESCRIPTOR as NEBULA } from "./nebula/descriptor";
import { NEON_LINE } from "./neon-line/descriptor";
import { DESCRIPTOR as ORBITING_SATELLITES } from "./orbiting-satellites/descriptor";
import { DESCRIPTOR as PEARL } from "./pearl/descriptor";
import { DESCRIPTOR as SHOCKWAVE } from "./shockwave/descriptor";
import { DESCRIPTOR as SOAP_BUBBLE } from "./soap-bubble/descriptor";
import { DESCRIPTOR as UNCERTAINTY_AURA } from "./uncertainty-aura/descriptor";

/** Every preset's descriptor, in catalog order (design section 7). */
export const SHADER_PRESETS: readonly ShaderDescriptor[] = Object.freeze([
    MATCAP_INK,
    PEARL,
    CEL_SHADE,
    HALFTONE,
    GLASS_MARBLE,
    GEMSTONE,
    DISCO_BALL,
    LANTERN,
    GLASS,
    COLORBLIND_PATTERNS,
    FOIL_SHIMMER,
    HOLOGRAM,
    FROST,
    FROSTED_GLASS,
    LIQUID_METAL,
    ANODIZED_STEEL,
    ICON_STICKER,
    MANDALA,
    UNCERTAINTY_AURA,
    LOCK_ON_RETICLE,
    ORBITING_SATELLITES,
    SHOCKWAVE,
    CHANGE_FLASH,
    FIBER_OPTIC,
    FIBER_PACKETS,
    COMET_TRACERS,
    NEON_LINE,
    EDGE_CHANGE,
    NEBULA,
    SOAP_BUBBLE,
    METABALL_HULL,
]);
