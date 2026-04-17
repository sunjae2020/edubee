import { useState } from "react";
import { X, Copy, Check, Code2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  publicUrl: string;
  onClose: () => void;
}

export function ShareLinkModal({ title, publicUrl, onClose }: Props) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="900"
  frameborder="0"
  style="border:none;border-radius:12px;"
  title="${title}"
></iframe>`;

  const copyText = async (text: string, setFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Share Public Form</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Share this link or embed the form on your website so applicants can submit directly.
        </p>

        {/* Direct URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <ExternalLink className="w-3.5 h-3.5" />
            Direct Link
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 focus:outline-none font-mono truncate"
            />
            <button
              onClick={() => copyText(publicUrl, setCopiedUrl)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiedUrl ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[--e-orange,#f97316] hover:underline"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Embed Code */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <Code2 className="w-3.5 h-3.5" />
            HTML Embed Code
          </div>
          <div className="relative">
            <textarea
              readOnly
              value={embedCode}
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-700 font-mono resize-none focus:outline-none"
            />
            <button
              onClick={() => copyText(embedCode, setCopiedEmbed)}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-white border text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copiedEmbed ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              {copiedEmbed ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Paste this code into your website's HTML to embed the form as an iframe.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
