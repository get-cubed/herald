#!/usr/bin/env node
import { saveConfig } from "../lib/config.js";
const enabled = process.argv[2] === "true";
await saveConfig({ enabled });
console.log(`Herald notifications ${enabled ? "enabled" : "disabled"}`);
