import { env } from "../../config/env.js";
import type { StorageProvider } from "./storage-provider.js";
import { LocalStorageProvider } from "./local-storage-provider.js";

/**
 * The single storage instance used by the app. Swapping to cloud later means
 * changing ONLY this factory (e.g. return new S3StorageProvider(...)) based on
 * a config value — no business logic changes anywhere else.
 */
export const storage: StorageProvider = new LocalStorageProvider(env.STORAGE_ROOT);

export type { StorageProvider } from "./storage-provider.js";
