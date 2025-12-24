const providers = new Map();
/**
 * Register a TTS provider factory.
 */
export function registerProvider(name, factory) {
    providers.set(name, factory);
}
/**
 * Get a TTS provider by name.
 */
export function getProvider(config) {
    const factory = providers.get(config.provider);
    if (!factory) {
        throw new Error(`Unknown TTS provider: ${config.provider}`);
    }
    return factory(config);
}
/**
 * Get list of registered provider names.
 */
export function getAvailableProviders() {
    return Array.from(providers.keys());
}
