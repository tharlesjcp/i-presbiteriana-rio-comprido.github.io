export type MediaMetadata = { contentType: string; size: number; etag: string; uploadedAt?: Date };
export type StoredMedia = MediaMetadata & { body: ReadableStream };
export type PutMediaOptions = { contentType: string; customMetadata?: Record<string, string> };
export type MediaPutValue = ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob;

export interface MediaStorage {
  put(key: string, value: MediaPutValue, options: PutMediaOptions): Promise<MediaMetadata>;
  get(key: string): Promise<StoredMedia | null>;
  head(key: string): Promise<MediaMetadata | null>;
  delete(key: string): Promise<void>;
}
