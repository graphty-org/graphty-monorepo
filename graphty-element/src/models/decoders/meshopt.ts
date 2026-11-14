/**
 * @file meshopt-compressed glTF buffers (`EXT_meshopt_compression` and `KHR_meshopt_compression`),
 * decoded by the `meshoptimizer` dependency, whose decoder carries its WebAssembly inline.
 *
 * Babylon.js's own extension loads its decoder from cdn.babylonjs.com and knows only the EXT name.
 * It is replaced by this one, registered under both names: the KHR extension is the ratified form
 * of the same buffer layout. Loaded by src/models/loadModel.ts only for a model whose summary says
 * it uses meshopt.
 */

import { ArrayItem, GLTFLoader } from "@babylonjs/loaders/glTF/2.0/glTFLoader.js";
import type { IGLTFLoaderExtension } from "@babylonjs/loaders/glTF/2.0/glTFLoaderExtension.js";
import {
    registerGLTFExtension,
    unregisterGLTFExtension,
} from "@babylonjs/loaders/glTF/2.0/glTFLoaderExtensionRegistry.js";
import type { IBufferView } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces.js";
import { MeshoptDecoder } from "meshoptimizer/decoder";

/** What a meshopt buffer view's extension object holds. */
interface MeshoptView {
    readonly buffer: number;
    readonly byteOffset?: number;
    readonly byteLength: number;
    readonly byteStride: number;
    readonly count: number;
    readonly mode: string;
    readonly filter?: string;
}

/** A buffer view with its decode kept, so two accessors on one view decode it once. */
type DecodedView = IBufferView & { _graphtyMeshopt?: Promise<ArrayBufferView> };

/** The glTF loader extension, under one of the two names. */
class MeshoptExtension implements IGLTFLoaderExtension {
    readonly enabled: boolean;
    private loader: GLTFLoader | null;

    /**
     * Make the extension for one load.
     * @param loader - The glTF loader.
     * @param name - `EXT_meshopt_compression` or `KHR_meshopt_compression`.
     */
    constructor(
        loader: GLTFLoader,
        readonly name: string,
    ) {
        this.loader = loader;
        this.enabled = loader.isExtensionUsed(name);
    }

    /** Forget the loader. */
    dispose(): void {
        this.loader = null;
    }

    /**
     * Decode a compressed buffer view.
     * @param context - Where in the file, for errors.
     * @param bufferView - The view.
     * @returns The decoded bytes, or null when the view is not compressed.
     */
    loadBufferViewAsync(context: string, bufferView: IBufferView): Promise<ArrayBufferView> | null {
        return GLTFLoader.LoadExtensionAsync<MeshoptView, ArrayBufferView>(
            context,
            bufferView,
            this.name,
            async (_extensionContext, extension) => {
                const view = bufferView as DecodedView;
                const { loader } = this;
                if (loader === null) {
                    throw new Error("graphty-element: the glTF load ended");
                }

                view._graphtyMeshopt ??= (async () => {
                    const buffer = ArrayItem.Get(`${context}/buffer`, loader.gltf.buffers, extension.buffer);
                    const source = await loader.loadBufferAsync(
                        `/buffers/${String(buffer.index)}`,
                        buffer,
                        extension.byteOffset ?? 0,
                        extension.byteLength,
                    );
                    await MeshoptDecoder.ready;
                    const bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
                    return await MeshoptDecoder.decodeGltfBufferAsync(
                        extension.count,
                        extension.byteStride,
                        bytes,
                        extension.mode,
                        extension.filter,
                    );
                })();
                return await view._graphtyMeshopt;
            },
        );
    }
}

for (const name of ["EXT_meshopt_compression", "KHR_meshopt_compression"]) {
    unregisterGLTFExtension(name);
    registerGLTFExtension(name, true, (loader) => new MeshoptExtension(loader, name));
}
