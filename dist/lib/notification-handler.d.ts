import type { HeraldConfig, NotificationHookInput } from "../types.js";
import type { ITTSProvider } from "../tts/provider.js";
/**
 * Result of handling a notification.
 */
export interface NotificationResult {
    handled: boolean;
    reason?: "disabled" | "invalid_type" | "duplicate" | "no_lock" | "played";
}
/**
 * Dependencies for the notification handler.
 * Injecting these allows for easy testing.
 */
export interface NotificationDeps {
    checkAndRecord: (hash: string) => Promise<boolean>;
    hashContent: (content: string) => string;
    waitForPlayerLock: () => Promise<boolean>;
    releasePlayerLock: () => Promise<void>;
    playSound: (type: "alert" | "ping") => void;
    playPing: (projectName?: string) => void;
    getProvider: (config: HeraldConfig["tts"]) => ITTSProvider;
    withMediaControl: <T>(fn: () => Promise<T>) => Promise<T>;
    activateEditor: (projectName?: string) => void;
}
/**
 * Generate the message content based on notification type and config style.
 */
export declare function getNotificationMessage(notificationType: string, sessionId: string | undefined, projectName: string | undefined, style: "tts" | "alerts"): {
    content: string;
    isPing: boolean;
};
/**
 * Handle a notification event.
 * This is the main business logic extracted from the hook.
 */
export declare function handleNotification(input: NotificationHookInput, config: HeraldConfig, deps: NotificationDeps): Promise<NotificationResult>;
