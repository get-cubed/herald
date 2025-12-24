import { HeraldConfig } from "../types.js";
declare const CONFIG_PATH: string;
export declare function loadConfig(): Promise<HeraldConfig>;
export declare function saveConfig(config: Partial<HeraldConfig>): Promise<void>;
export { CONFIG_PATH };
