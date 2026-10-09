import { useRef, useState } from "react";
import { Upload, Trash2, Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import printSettingsService from "@/services/printSettingsService";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

/** <img> that swaps to `fallback` if the file is missing/broken, and retries when src changes. */
export function SafeImage({ src, fallback = null, ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return fallback;
  return <img src={src} onError={() => setFailedSrc(src)} {...rest} />;
}

/**
 * Logo / signature picker. `value` is the stored path or URL; `onChange(newValue)` receives the
 * uploaded path (or "" on remove). Nothing is persisted until the parent saves.
 */
export default function AssetUpload({ kind, module, targetUserId, value, onChange, toFullUrl, label, previewClass }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");
    if (!ACCEPT.split(",").includes(file.type)) return setError("Only PNG, JPG or WEBP images are allowed.");
    if (file.size === 0) return setError("The selected file is empty.");
    if (file.size > MAX_BYTES) return setError("Image is too large. Maximum size is 2 MB.");
    if (!targetUserId) return setError("Select a user first.");
    setBusy(true);
    try {
      onChange(await printSettingsService.uploadAsset(file, kind, module, targetUserId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const url = toFullUrl(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
          {busy ? "Uploading..." : value ? `Replace ${label}` : `Upload ${label}`}
        </Button>
        {value && !busy && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setError(""); onChange(""); }}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Remove
          </Button>
        )}
      </div>
      <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG or WEBP, up to 2 MB.</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {value && (
        <div className="mt-3 border border-neutral-200 rounded-lg p-2">
          <p className="text-[10px] text-neutral-400 mb-1">Preview</p>
          <SafeImage
            src={url}
            alt={`${label} preview`}
            className={previewClass || "max-h-16 object-contain"}
            fallback={
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <ImageOff className="w-4 h-4" /> Image could not be loaded. Upload it again.
              </div>
            }
          />
        </div>
      )}

      <button type="button" onClick={() => setShowLink((v) => !v)} className="text-[11px] text-neutral-500 underline mt-2">
        {showLink ? "Hide link option" : "or paste an image link"}
      </button>
      {showLink && (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="text-sm mt-1" />
      )}
    </div>
  );
}
