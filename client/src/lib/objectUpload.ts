export async function fetchSignedUploadUrl(): Promise<string> {
  const res = await fetch("/api/objects/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Couldn't get an upload slot (server said ${res.status}). ${body.slice(0, 120)}`.trim(),
    );
  }
  const data = await res.json();
  if (!data?.url) {
    throw new Error("Server didn't return an upload URL. Please refresh and try again.");
  }
  return data.url as string;
}

export async function putToSignedUrl(signedUrl: string, file: File | Blob, contentType?: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType || (file as File).type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("The upload link expired before the file finished. Please try again.");
    }
    const body = await res.text().catch(() => "");
    throw new Error(
      `Storage rejected the upload (status ${res.status}). ${body.slice(0, 120)}`.trim(),
    );
  }
}

export async function normalizeUploadedPath(rawUrl: string): Promise<string> {
  const res = await fetch("/api/objects/normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawUrl }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Couldn't save the file path (server said ${res.status}). ${body.slice(0, 120)}`.trim(),
    );
  }
  const data = await res.json();
  return data.path as string;
}

function stripQuery(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

/**
 * Full upload helper: gets a signed URL, PUTs the file to GCS, and returns
 * the normalized /objects/<id> path ready to be stored in the DB.
 */
export async function uploadFileToObjectStorage(file: File): Promise<string> {
  const signedUrl = await fetchSignedUploadUrl();
  await putToSignedUrl(signedUrl, file);
  return normalizeUploadedPath(stripQuery(signedUrl));
}
