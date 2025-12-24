import { registerProvider, getProvider, getAvailableProviders } from "./provider.js";
export { getProvider, getAvailableProviders, registerProvider };
export type { ITTSProvider } from "./provider.js";
/**
 * Get the default TTS provider for the current platform.
 */
export declare function getDefaultProvider(): string;
