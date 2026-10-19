import type {
  PresignOptionsType,
  PresignUploadOptionsType,
  UploadOptionsType,
} from "./s3.model";

import { s3, s3Config } from "./client";

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy.buffer;
};

export class S3Service {
  file(key: string) {
    return s3.file(key);
  }

  exists(key: string) {
    const file = s3.file(key);
    return file.exists();
  }

  async size(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return;
    }
    return file.size;
  }

  async getInfo(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return {
      key,
      size: file.size,
      type: file.type,
    };
  }

  async getText(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return file.text();
  }

  async getJson<T>(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return file.json() as Promise<T>;
  }

  async getArrayBuffer(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return file.arrayBuffer();
  }

  async getStream(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return file.stream();
  }

  async getBlob(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return null;
    }
    return file.slice();
  }

  async upload(
    key: string,
    data: string | ArrayBuffer | Uint8Array | Blob | File,
    options?: UploadOptionsType
  ) {
    const file = s3.file(key);
    const payload: string | ArrayBuffer | Blob | File =
      data instanceof Uint8Array ? toArrayBuffer(data) : data;

    const written = await file.write(payload, {
      type: options?.contentType,
    });

    return { key, size: written };
  }

  createMultipartUpload(
    key: string,
    options?: {
      contentType?: string;
      partSize?: number;
      queueSize?: number;
      retry?: number;
    }
  ) {
    const file = s3.file(key);
    return file.writer({
      partSize: options?.partSize,
      queueSize: options?.queueSize,
      retry: options?.retry,
      type: options?.contentType,
    });
  }

  async delete(key: string) {
    const file = s3.file(key);
    if (!(await file.exists())) {
      return false;
    }
    await file.delete();
    return true;
  }

  async deleteMany(keys: string[]) {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        await this.delete(key);
        return key;
      })
    );

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        deleted.push(result.value);
      } else {
        failed.push(keys[index]);
      }
    }

    return { deleted, failed };
  }

  presignDownload(key: string, options?: PresignOptionsType) {
    const file = s3.file(key);
    return file.presign({
      contentDisposition: options?.contentDisposition,
      expiresIn: options?.expiresIn ?? 3600,
      method: "GET",
    });
  }

  presignUpload(key: string, options?: PresignUploadOptionsType) {
    const file = s3.file(key);
    return file.presign({
      acl: options?.acl,
      expiresIn: options?.expiresIn ?? 3600,
      method: "PUT",
    });
  }

  async copy(sourceKey: string, destinationKey: string) {
    const sourceFile = s3.file(sourceKey);
    if (!(await sourceFile.exists())) {
      return false;
    }
    const data = await sourceFile.arrayBuffer();
    await this.upload(destinationKey, data);
    return true;
  }

  async move(sourceKey: string, destinationKey: string) {
    const copied = await this.copy(sourceKey, destinationKey);
    if (!copied) {
      return false;
    }
    await this.delete(sourceKey);
    return true;
  }

  getPublicUrl(key: string) {
    if (!s3Config.publicUrl) {
      return null;
    }
    return `${s3Config.publicUrl}/${key}`;
  }

  generateKey(options?: {
    extension?: string;
    filename?: string;
    prefix?: string;
  }) {
    const timestamp = Date.now();
    const random = crypto.randomUUID().slice(0, 8);
    const name = options?.filename
      ? options.filename.replaceAll(/[^a-zA-Z0-9.-]/g, "_")
      : `${timestamp}-${random}`;
    const ext = options?.extension ? `.${options.extension}` : "";
    const prefix = options?.prefix ? `${options.prefix}/` : "";
    return `${prefix}${name}${ext}`;
  }
}

export const s3Service = new S3Service();
