import type { TTSProviderConfig } from "../types.js";
/**
 * Interface for TTS providers.
 * Implement this to add support for new TTS services.
 */
export interface ITTSProvider {
    /**
     * Speak the given text aloud.
     * @param message - The text to speak
     * @returns Promise that resolves when speech is complete (or started, for async providers)
     */
    speak(message: string): Promise<void>;
    /**
     * Check if this provider is available/configured.
     * @returns true if the provider can be used
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get the provider name for display purposes.
     */
    readonly name: string;
}
/**
 * Registry of available TTS providers.
 */
export type ProviderFactory = (config: TTSProviderConfig) => ITTSProvider;
/**
 * Register a TTS provider factory.
 */
export declare function registerProvider(name: string, factory: ProviderFactory): void;
/**
 * Get a TTS provider by name.
 */
export declare function getProvider(config: TTSProviderConfig): ITTSProvider;
/**
 * Get list of registered provider names.
 */
export declare function getAvailableProviders(): string[];
