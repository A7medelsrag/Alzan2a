import { parseApiConfig, type ApiConfig } from "@store/shared";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  if (environment === process.env) {
    const appEnvPath = resolve(process.cwd(), ".env");
    const workspaceEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env");
    if (existsSync(appEnvPath)) process.loadEnvFile(appEnvPath);
    if (workspaceEnvPath !== appEnvPath && existsSync(workspaceEnvPath)) {
      process.loadEnvFile(workspaceEnvPath);
    }
  }
  return parseApiConfig(environment);
}
