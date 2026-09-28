import React, { useState, useEffect } from 'react';
import {
  Tv,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  Sparkles,
  Smartphone,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCricket } from '../context/CricketContext';
import { BroadcastStudioTools } from './BroadcastStudioTools';

export const BroadcastController: React.FC = () => {
  const { overlayConfig, updateOverlayConfig } = useCricket();

  const [copied, setCopied] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [lanUrl, setLanUrl] = useState<string>('');
  const [lanAddresses, setLanAddresses] = useState<string[]>([]);

  // On the packaged desktop app window.location is normally 127.0.0.1.
  // That URL is useless from a phone. Ask the local server for its LAN IPs.
  const localUrl = `${window.location.origin}${window.location.pathname}`;
  const overlayUrl = `${localUrl.replace(/\/$/, '')}/?overlayOnly=true`;
  const mobileUrl = lanUrl || localUrl;

  useEffect(() => {
    let active = true;
    fetch('/api/connect-info', { cache: 'no-store' })
      .then((res) => res.json())
      .then((info) => {
        if (!active) return;
        const addresses = Array.isArray(info?.addresses) ? info.addresses : [];
        setLanAddresses(addresses);
        if (addresses.length > 0) {
          setLanUrl(`http://${addresses[0]}:${info.port || 3000}/`);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    QRCode.toDataURL(mobileUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [mobileUrl]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans-ui space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-purple-400" />
          <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
            OBS / VMIX BROADCAST GRAPHICS CONTROLLER
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(overlayUrl, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-tech font-bold text-xs uppercase shadow transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> OPEN DEDICATED OBS WINDOW
          </button>
        </div>
      </div>

      {/* OBS URL Link bar */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-tech font-bold text-purple-300 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> OBS / VMIX BROWSER SOURCE URL:
          </div>
          <div className="text-xs font-mono text-slate-300 break-all select-all mt-0.5">
            {overlayUrl}
          </div>
          {lanUrl && (
            <div className="text-[10px] font-mono text-slate-500 break-all mt-1">LAN OBS: {lanUrl}?overlayOnly=true</div>
          )}
        </div>

        <button
          onClick={handleCopyUrl}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-tech font-bold text-xs uppercase border border-slate-700 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> COPIED!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-sky-400" /> COPY BROWSER SOURCE URL
            </>
          )}
        </button>
      </div>

      {/* MOBILE ACCESS & QR CODE SECTION */}
      <div className="bg-slate-950 p-5 rounded-xl border border-sky-500/40 flex flex-col md:flex-row items-center gap-6 shadow-inner">
        <div className="flex-shrink-0 bg-white p-2.5 rounded-xl shadow-lg border border-slate-200">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Mobile Scorekeeper QR Code"
              className="w-40 h-40 object-contain rounded"
            />
          ) : (
            <div className="w-40 h-40 flex items-center justify-center text-slate-500 font-tech text-xs">
              Generating QR...
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1 text-left">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <span className="font-tech font-bold text-base text-white uppercase tracking-wider">
              REAL-TIME MOBILE SCORING & REMOTE ACCESS
            </span>
          </div>

          <p className="text-xs font-sans-ui text-slate-300 leading-relaxed">
            Scan this QR code using any smartphone or tablet camera to open DEZIGLO SOFT on the same
            Wi-Fi/LAN network as this PC. The ground umpire or scorer can tap scores ball-by-ball, and all graphics
            in OBS / vMix will update instantly via live broadcast synchronization.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleCopyMobileUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-tech font-bold text-xs uppercase shadow transition"
            >
              {copiedMobile ? (
                <>
                  <Check className="w-3.5 h-3.5" /> LINK COPIED!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> COPY MOBILE SCORING URL
                </>
              )}
            </button>
            <span className="text-[11px] font-mono text-slate-400 break-all select-all">
              {mobileUrl}
            </span>
            {lanAddresses.length === 0 && (
              <div className="text-[10px] text-amber-400 mt-1">LAN address not detected. Connect this PC and phone to the same Wi-Fi/LAN.</div>
            )}
          </div>
        </div>
      </div>

      <BroadcastStudioTools />

      {/* OVERLAY VISIBILITY & CHROMA KEY SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visibility Toggle */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-tech font-bold text-white uppercase">OVERLAY VISIBILITY:</div>
            <p className="text-[11px] text-slate-400">Turn on or off on live broadcast stream</p>
          </div>
          <button
            onClick={() => updateOverlayConfig({ visible: !overlayConfig.visible })}
            className={`px-4 py-2 rounded-xl font-tech font-bold text-xs uppercase flex items-center gap-2 transition ${
              overlayConfig.visible
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {overlayConfig.visible ? (
              <>
                <Eye className="w-4 h-4" /> BROADCASTING ON AIR
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" /> HIDDEN OFF AIR
              </>
            )}
          </button>
        </div>

        {/* Chroma Key Background */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-tech font-bold text-white uppercase">CHROMA KEY / BACKGROUND:</div>
            <p className="text-[11px] text-slate-400">Transparent is best for OBS browser source</p>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: 'transparent', label: 'Transparent', color: 'bg-slate-800' },
              { id: 'green', label: 'Green', color: 'bg-[#00ff00]' },
              { id: 'blue', label: 'Blue', color: 'bg-[#0000ff]' },
              { id: 'magenta', label: 'Magenta', color: 'bg-[#ff00ff]' },
            ].map((bg) => (
              <button
                key={bg.id}
                onClick={() => updateOverlayConfig({ chromaKey: bg.id as any })}
                className={`px-2.5 py-1 rounded text-[11px] font-tech font-bold border transition ${
                  overlayConfig.chromaKey === bg.id
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
