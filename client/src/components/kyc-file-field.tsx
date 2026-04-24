import { useState } from "react";
import { ObjectUploader } from "@/components/object-uploader";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Upload } from "lucide-react";
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
}

async function fetchUploadUrl(): Promise<{ method: "PUT"; url: string }> {
  const res = await fetch("/api/objects/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Upload URL failed (${res.status})`);
  const data = await res.json();
  return { method: "PUT", url: data.url };
}

async function normalizePath(rawUrl: string): Promise<string> {
  const res = await fetch("/api/objects/normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawUrl }),
  });
  if (!res.ok) throw new Error(`Normalize failed (${res.status})`);
  const data = await res.json();
  return data.path as string;
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
}: KycFileFieldProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const looksLikeImage = value && /\.(png|jpe?g|gif|webp|heic)$/i.test(value);
  const isImagePath = value?.startsWith("/objects/") && showImagePreview && !acceptPdf;

  return (
    <div className="space-y-2" data-testid={testId ? `field-${testId}` : undefined}>
      <Label className="text-gray-700 font-medium">{label}</Label>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}

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
          <ObjectUploader
            maxNumberOfFiles={1}
            onGetUploadParameters={fetchUploadUrl}
            onComplete={async (result) => {
              setBusy(true);
              try {
                const uploaded = result.successful?.[0];
                if (!uploaded?.uploadURL) throw new Error("No upload URL returned");
                const path = await normalizePath(uploaded.uploadURL);
                onChange(path);
              } catch (e: any) {
                toast({ title: "Replace failed", description: e?.message || "Try again", variant: "destructive" });
              } finally {
                setBusy(false);
              }
            }}
            buttonClassName="text-xs h-8 px-3 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
          >
            {busy ? "..." : "Replace"}
          </ObjectUploader>
        </div>
      ) : (
        <ObjectUploader
          maxNumberOfFiles={1}
          onGetUploadParameters={fetchUploadUrl}
          onComplete={async (result) => {
            setBusy(true);
            try {
              const uploaded = result.successful?.[0];
              if (!uploaded?.uploadURL) throw new Error("No upload URL returned");
              const path = await normalizePath(uploaded.uploadURL);
              onChange(path);
            } catch (e: any) {
              toast({ title: "Upload failed", description: e?.message || "Try again", variant: "destructive" });
            } finally {
              setBusy(false);
            }
          }}
          buttonClassName="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <span className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" />
            {busy ? "Uploading…" : (buttonLabel || "Upload")}
          </span>
        </ObjectUploader>
      )}
    </div>
  );
}
