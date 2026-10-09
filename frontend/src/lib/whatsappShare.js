// Share a generated PDF on WhatsApp.
//
// Phones that can share files (Web Share API Level 2): the PDF goes to the system share
// sheet, where the user picks WhatsApp and the chat. A file share cannot target a
// specific number, and iOS WhatsApp can drop the file when text is sent with it, so
// only the file is shared; the filename carries the document number.
//
// Everything else (desktop, in-app browsers): the PDF is downloaded and a wa.me link
// with a prefilled message (and the customer's number if saved) is offered to tap.
import { useCallback, useEffect, useRef, useState } from "react";
import pdfService from "@/services/pdfService";

// "98765 43210" / "098765-43210" / "+91 98765 43210" -> "919876543210". Returns "" if unusable.
export function normalizeWhatsAppNumber(raw) {
  let strDigits = String(raw || "").replace(/\D/g, "");
  if (strDigits.startsWith("00")) strDigits = strDigits.slice(2);
  if (strDigits.length === 11 && strDigits.startsWith("0")) strDigits = strDigits.slice(1);
  if (strDigits.length === 10) strDigits = `91${strDigits}`;
  return strDigits.length >= 11 && strDigits.length <= 15 ? strDigits : "";
}

export function buildWhatsAppLink(phone, message) {
  const strNumber = normalizeWhatsAppNumber(phone);
  const strText = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${strNumber}${strText}`;
}

export function canShareFiles() {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    const probe = new File([new Blob(["%PDF"])], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * One hook per document. Pass the result to one or more <WhatsAppShareButton share={...} />.
 *
 * fetchPdf    () => Promise<Blob>   same call the Print button uses
 * filename    "Quotation_QT-0045.pdf"
 * message     text for the wa.me fallback
 * phone       customer's number (optional)
 * prefetchKey when set (and file sharing is supported), the PDF is fetched in the background
 *             so the tap can share immediately. Change it whenever the saved document changes.
 */
export function useWhatsAppShare({ fetchPdf, filename, message, phone, prefetchKey = null }) {
  // idle | preparing | tap-to-share | fallback
  const [status, setStatus] = useState("idle");
  const cacheRef = useRef({ key: null, blob: null });
  const fetchRef = useRef(fetchPdf);
  useEffect(() => {
    fetchRef.current = fetchPdf;
  });

  useEffect(() => {
    if (prefetchKey == null || !canShareFiles()) return;
    let blnCancelled = false;
    cacheRef.current = { key: prefetchKey, blob: null };
    fetchRef.current()
      .then((blob) => {
        if (!blnCancelled && cacheRef.current.key === prefetchKey) cacheRef.current.blob = blob;
      })
      .catch(() => {}); // the tap will fetch again and report errors
    return () => {
      blnCancelled = true;
    };
  }, [prefetchKey]);

  const fallback = useCallback(
    async (blob) => {
      try {
        const pdf = blob || (await fetchRef.current());
        pdfService.downloadPDF(pdf, filename);
        if (prefetchKey == null) cacheRef.current = { key: null, blob: null };
        setStatus("fallback");
      } catch (err) {
        alert(err.message || "Failed to generate PDF");
        setStatus("idle");
      }
    },
    [filename, prefetchKey]
  );

  // Without a prefetch key the document may change between shares, so never reuse the PDF.
  const done = useCallback(() => {
    if (prefetchKey == null) cacheRef.current = { key: null, blob: null };
    setStatus("idle");
  }, [prefetchKey]);

  const share = useCallback(async () => {
    if (!canShareFiles()) {
      setStatus("preparing");
      await fallback(null);
      return;
    }

    let blob = cacheRef.current.key === prefetchKey ? cacheRef.current.blob : null;
    const blnImmediate = Boolean(blob); // no await before navigator.share -> user activation is intact
    if (!blob) {
      setStatus("preparing");
      try {
        blob = await fetchRef.current();
        cacheRef.current = { key: prefetchKey, blob };
      } catch (err) {
        alert(err.message || "Failed to generate PDF");
        setStatus("idle");
        return;
      }
    }

    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      await navigator.share({ files: [file], title: filename.replace(/\.pdf$/i, "") });
      done();
    } catch (err) {
      if (err?.name === "AbortError") {
        done(); // user closed the share sheet
      } else if (err?.name === "NotAllowedError" && !blnImmediate) {
        setStatus("tap-to-share"); // waiting for the PDF used up the tap; the next tap shares instantly
      } else {
        await fallback(blob);
      }
    }
  }, [prefetchKey, filename, fallback, done]);

  return {
    status,
    share,
    whatsappLink: buildWhatsAppLink(phone, message),
    dismissFallback: () => setStatus("idle"),
  };
}
