import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  fileName: string;
}

export default function QRCodeModal({ isOpen, onClose, downloadUrl, fileName }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=23-23-23&data=${encodeURIComponent(
    downloadUrl
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden glass-panel-heavy rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-250">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute p-2 text-slate-400 hover:text-white top-4 right-4 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          <h3 className="font-display font-bold tracking-tight text-xl text-white mt-2">
            Scan to Download
          </h3>
          <p className="mt-1 text-sm text-slate-300 font-sans max-w-[280px] mx-auto truncate" title={fileName}>
            {fileName}
          </p>

          {/* QR Container - Pure white backplate for extreme high contrast/scan reliability */}
          <div className="flex justify-center my-6 p-4 bg-white rounded-2xl border border-white/10 shadow-inner">
            <img
              src={qrImageUrl}
              alt="Download QR Code"
              className="w-48 h-48 rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="text-xs text-slate-400 mb-5 font-sans leading-relaxed">
            Scan with any smartphone camera connected to the same WiFi network to download instantly.
          </p>

          <div className="flex gap-2.5">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold border border-white/10 text-slate-200 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-950/40 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
