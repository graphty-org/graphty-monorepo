/**
 * @file Every engine extension the `@babylonjs/core` barrel used to load (issue #6389).
 *
 * Babylon.js adds engine methods such as `createDynamicTexture`, `updateDynamicTexture`,
 * `createRawTexture`, `createMultipleRenderTarget` or `beginOcclusionQuery` only when the module
 * that installs them has run, and for WebGPU several of those modules are reached by nothing but
 * the barrel (WebGPU's `engine.dynamicTexture` is one). The element imports Babylon.js deep, file by
 * file, so the first 2D frame skips XR, physics, particles and the rest; this file keeps the engine
 * itself exactly as the barrel left it. Each module is a few hundred bytes.
 */
import "@babylonjs/core/Engines/Extensions/engine.alpha.js";
import "@babylonjs/core/Engines/Extensions/engine.computeShader.js";
import "@babylonjs/core/Engines/Extensions/engine.cubeTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.debugging.js";
import "@babylonjs/core/Engines/Extensions/engine.dynamicBuffer.js";
import "@babylonjs/core/Engines/Extensions/engine.dynamicTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.multiRender.js";
import "@babylonjs/core/Engines/Extensions/engine.multiview.js";
import "@babylonjs/core/Engines/Extensions/engine.prefilteredCubeTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.query.js";
import "@babylonjs/core/Engines/Extensions/engine.rawTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.readTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube.js";
import "@babylonjs/core/Engines/Extensions/engine.renderTarget.js";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.textureSelector.js";
import "@babylonjs/core/Engines/Extensions/engine.transformFeedback.js";
import "@babylonjs/core/Engines/Extensions/engine.uniformBuffer.js";
import "@babylonjs/core/Engines/Extensions/engine.videoTexture.js";
import "@babylonjs/core/Engines/Extensions/engine.views.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.alpha.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.computeShader.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.cubeTexture.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.debugging.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.multiRender.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.query.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.rawTexture.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.readTexture.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.renderTargetCube.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.renderTarget.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.renderTargetTexture.js";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.videoTexture.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.alpha.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.cubeTexture.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.dom.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.loadFile.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.loadingScreen.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.query.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.renderPass.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.states.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.stencil.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.texture.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.textureLoaders.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.timeQuery.js";
import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.views.js";
