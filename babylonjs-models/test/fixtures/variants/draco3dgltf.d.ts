/**
 * @file The part of `draco3dgltf` (no published types) generate.ts uses: the encoder and decoder
 * modules gltf-transform's Draco extension takes.
 */
declare module "draco3dgltf" {
    const draco3d: {
        createEncoderModule(): Promise<unknown>;
        createDecoderModule(): Promise<unknown>;
    };
    export default draco3d;
}
