import { Loader2, MessageCircle, ExternalLink, X } from "lucide-react";

const STATUS_TEXT = {
  idle: "Share on WhatsApp",
  preparing: "Preparing PDF...",
  "tap-to-share": "Tap to share PDF",
};

/**
 * Presentational button for useWhatsAppShare (src/lib/whatsappShare.js).
 * variant: "full" (sidebar, full width) | "compact" (mobile action bar) | "icon" (list rows)
 * className is applied to the button so each page can match its own toolbar style.
 */
export default function WhatsAppShareButton({ share, variant = "full", className = "" }) {
  const { status } = share;
  const blnBusy = status === "preparing";

  // After the fallback download: offer the wa.me link (needs its own tap so it is not popup-blocked).
  if (status === "fallback") {
    return (
      <div className={`flex items-center gap-1 ${variant === "full" ? "w-full" : ""}`}>
        <a
          href={share.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={share.dismissFallback}
          className={`${className} inline-flex items-center justify-center gap-1.5 bg-[#128C7E] hover:bg-[#0e7368] text-white border-transparent no-underline`}
          title="PDF downloaded. Open WhatsApp and attach it."
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {variant === "icon" ? null : variant === "compact" ? "WhatsApp" : "PDF downloaded · Open WhatsApp"}
        </a>
        <button
          type="button"
          onClick={share.dismissFallback}
          className="p-2 text-neutral-400 hover:text-neutral-600"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const strLabel = variant === "compact" && status === "idle" ? "Share" : STATUS_TEXT[status];
  return (
    <button
      type="button"
      onClick={share.share}
      disabled={blnBusy}
      className={`${className} inline-flex items-center justify-center gap-1.5 disabled:opacity-60`}
      title={STATUS_TEXT[status]}
      aria-label={STATUS_TEXT[status]}
    >
      {blnBusy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
      {variant === "icon" ? null : strLabel}
    </button>
  );
}
