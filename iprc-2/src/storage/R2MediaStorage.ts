import type { MediaMetadata, MediaPutValue, MediaStorage, PutMediaOptions, StoredMedia } from './MediaStorage.ts';

const metadata = (object: R2Object): MediaMetadata => ({
  contentType: object.httpMetadata?.contentType || 'application/octet-stream',
  size: object.size,
  etag: object.etag,
  uploadedAt: object.uploaded,
});

export class R2MediaStorage implements MediaStorage {
  private readonly bucket: R2Bucket;
  constructor(bucket: R2Bucket) { this.bucket = bucket; }
  async put(key: string, value: MediaPutValue, options: PutMediaOptions) {
    const result = await this.bucket.put(key, value, { httpMetadata: { contentType: options.contentType }, customMetadata: options.customMetadata });
    if (!result) throw new Error('O R2 não confirmou o armazenamento do objeto.');
    return metadata(result);
  }
  async get(key: string): Promise<StoredMedia | null> {
    const object = await this.bucket.get(key);
    return object ? { ...metadata(object), body: object.body } : null;
  }
  async head(key: string) { const object = await this.bucket.head(key); return object ? metadata(object) : null; }
  async delete(key: string) { await this.bucket.delete(key); }
}
