import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KycFileFieldProps {
  label: string;
  helper?: string;
  value: string | null;
  onChange: (publicPath: string) => void;
  buttonLabel?: string;
  testId?: string;
  showImagePreview?: boolean;
  acceptPdf?: boolean;
  maxFileSizeMb?: number;
}

const DEFAULT_MAX_MB = 10;

async function fetchSignedUploadUrl(): Promise<string> {
  const res = await fetch("/api/objects/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Couldn't get an upload slot (server said ${res.status}). ${body.slice(0, 120)}`.trim());
  }
  const data = await res.json();
  if (!data?.url) {
    throw new Error("Server didn't return an upload URL. Please refresh and try again.");
  }
  return data.url as string;
}

async function putToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("The upload link expired before the file finished. Please try again.");
    }
    const body = await res.text().catch(() => "");
    throw new Error(`Storage rejected the upload (status ${res.status}). ${body.slice(0, 120)}`.trim());
  }
}

async function normalizePath(rawUrl: string): Promise<string> {
  const res = await fetch("/api/objects/normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawUrl }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Couldn't save the file path (server said ${res.status}). ${body.slice(0, 120)}`.trim());
  }
  const data = await res.json();
  return data.path as string;
}

function stripQuery(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

function buildAcceptString(acceptPdf: boolean): string {
  return acceptPdf ? "image/*,application/pdf" : "image/*";
}

export function KycFileField({
  label,
  helper,
  value,
  onChange,
  buttonLabel,
  testId,
  showImagePreview = true,
  acceptPdf = false,
  maxFileSizeMb = DEFAULT_MAX_MB,
}: KycFileFieldProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const looksLikeImage = value && /\.(png|jpe?g|gif|webp|heic)$/i.test(value);
  const isImagePath = value?.startsWith("/objects/") && showImagePreview && !acceptPdf;

  const openPicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!acceptPdf && !file.type.startsWith("image/")) {
      toast({ title: "Wrong file type", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (acceptPdf && !file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ title: "Wrong file type", description: "Please choose an image or PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please choose a file under ${maxFileSizeMb} MB.`,
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const signedUrl = await fetchSignedUploadUrl();
      await putToSignedUrl(signedUrl, file);
      const path = await normalizePath(stripQuery(signedUrl));
      onChange(path);
      toast({ title: "Upload complete" });
    } catch (err: any) {
      toast({
        title: value ? "Replace failed" : "Upload failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid={testId ? `field-${testId}` : undefined}>
      <Label className="text-gray-700 font-medium">{label}</Label>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={buildAcceptString(acceptPdf)}
        className="hidden"
        onChange={handleFile}
        data-testid={testId ? `input-${testId}` : undefined}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">Uploaded</p>
            {isImagePath || looksLikeImage ? (
              <img
                src={value}
                alt={label}
                className="mt-2 max-h-24 rounded-lg border border-emerald-300 object-cover"
              />
            ) : (
              <p className="text-xs text-emerald-700 truncate">{value}</p>
            )}
          </div>
          <Button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="text-xs h-8 px-3 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
            data-testid={testId ? `button-replace-${testId}` : undefined}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={openPicker}
          disabled={busy}
          className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          data-testid={testId ? `button-upload-${testId}` : undefined}
        >
          <span className="flex items-center justify-center gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : (buttonLabel || "Upload")}
          </span>
        </Button>
      )}
    </div>
  );
}
