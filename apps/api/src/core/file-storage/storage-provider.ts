/**
 * The storage abstraction. Business logic depends ONLY on this interface, never
 * on where files physically live. Today we use LocalStorageProvider (disk);
 * later we can drop in an S3StorageProvider for the VPS/cloud with zero changes
 * to the documents service. This is the "swap storage later" requirement.
 */
export interface StorageProvider {
  /** Persists bytes under a generated key and returns that key. */
  save(key: string, data: Buffer, mimeType: string): Promise<void>;
  /** Reads the bytes for a key. */
  read(key: string): Promise<Buffer>;
  /** Removes the bytes for a key (best-effort). */
  delete(key: string): Promise<void>;
  /** Whether an object exists. */
  exists(key: string): Promise<boolean>;
}
