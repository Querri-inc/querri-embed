import { BaseResource } from './base-resource.js';
import type { FileObject } from '../types.js';

export class FilesResource extends BaseResource {
  upload(file: Blob | Uint8Array, name?: string): Promise<FileObject> {
    const formData = new FormData();
    const blob = file instanceof Blob ? file : new Blob([file as BlobPart]);
    formData.append('file', blob);
    if (name !== undefined) {
      formData.append('name', name);
    }
    return this._client.request<FileObject>({
      method: 'POST',
      path: '/files/upload',
      body: formData,
    });
  }

  retrieve(fileId: string): Promise<FileObject> {
    return this._get<FileObject>(`/files/${fileId}`);
  }

  list(): Promise<FileObject[]> {
    return this._get<FileObject[]>('/files');
  }

  del(fileId: string): Promise<void> {
    return this._delete(`/files/${fileId}`);
  }
}
