import { apiFetch, apiUrl, getAccessToken } from './client';

export interface EvidenceRecord {
  id: string;
  kind: string;
  content_type: string;
  created_at: string;
}

export async function uploadEvidence(
  file: File,
  kind: 'shelf_photo' | 'receipt_image' | 'receipt_pdf' | 'product_photo' | 'other',
): Promise<EvidenceRecord> {
  const created = await apiFetch<{ evidence: EvidenceRecord; uploadUrl: string }>('/api/v1/media', {
    method: 'POST',
    body: JSON.stringify({
      kind,
      fileName: file.name || 'upload.bin',
      contentType: file.type || 'application/octet-stream',
    }),
  });
  const token = getAccessToken();
  const response = await fetch(apiUrl(created.uploadUrl), {
    method: 'PUT',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });
  if (!response.ok) {
    let message = 'Evidence upload failed';
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {}
    throw new Error(message);
  }
  return created.evidence;
}

export function evidenceUrl(id: string): string {
  return apiUrl(`/api/v1/media/${id}/content`);
}
