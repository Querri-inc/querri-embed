import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type { FileObject, FilesDeleteResponse } from '../types.js';

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

  list(
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<FileObject>> {
    return this._list<FileObject>('/files', params);
  }

  del(fileId: string): Promise<FilesDeleteResponse> {
    return this._delete<FilesDeleteResponse>(`/files/${fileId}`);
  }
}
