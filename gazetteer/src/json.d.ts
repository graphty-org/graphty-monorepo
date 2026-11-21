// The layers in data/ are megabytes of JSON: imported as unknown, never typed from their contents.
declare module "*.json" {
    const value: unknown;
    export default value;
}
