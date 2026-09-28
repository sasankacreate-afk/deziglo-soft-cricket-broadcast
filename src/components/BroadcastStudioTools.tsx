import React, { useMemo, useState } from 'react';
import { Megaphone, Radio, Youtube, Image as ImageIcon, Video, Clock3, Sparkles } from 'lucide-react';
import { useCricket } from '../context/CricketContext';

function toYouTubeEmbed(url: string): string {
  const value = url.trim();
  if (!value) return '';

  let id = '';
  try {
    const u = new URL(value);
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (u.pathname.includes('/embed/')) {
      id = u.pathname.split('/embed/')[1]?.split('/')[0] || '';
    } else {
      id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '';
    }
  } catch {
    return value;
  }

  if (!id) return value;

  // Force audible autoplay for the Electron broadcast player.
  // mute=0 is intentional: advertisements should play with sound.
  const embed = new URL(`https://www.youtube.com/embed/${id}`);
  embed.searchParams.set('autoplay', '1');
  embed.searchParams.set('mute', '0');
  embed.searchParams.set('loop', '1');
  embed.searchParams.set('playlist', id);
  embed.searchParams.set('rel', '0');
  return embed.toString();
}

export const BroadcastStudioTools: React.FC = () => {
  const { overlayConfig, updateOverlayConfig } = useCricket();
  const [adUrl, setAdUrl] = useState(overlayConfig.customAdUrl || '');
  const [ticker, setTicker] = useState(overlayConfig.tickerText || '');
  const [title, setTitle] = useState(overlayConfig.customAdTitle || 'SPONSOR SPOTLIGHT');

  const mediaType = overlayConfig.customAdMediaType || 'auto';
  const embedPreview = useMemo(() => mediaType === 'youtube' ? toYouTubeEmbed(adUrl) : adUrl, [adUrl, mediaType]);

  const applyAd = () => {
    updateOverlayConfig({
      customAdUrl: mediaType === 'youtube' ? embedPreview : adUrl.trim(),
      customAdMediaType: mediaType,
      customAdTitle: title.trim(),
      customAdVideoMuted: false,
      customAdVideoLoop: true,
    });
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Megaphone className="w-4 h-4 text-amber-400" />
        <h3 className="font-tech font-black text-sm text-white uppercase tracking-wider">Broadcast Studio Tools</h3>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">Integrated into v6 Overlay tab</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-tech font-bold text-sky-300 uppercase"><Radio className="w-3.5 h-3.5" /> Live Scene</div>
          <select value={overlayConfig.activeOverlay} onChange={e => updateOverlayConfig({activeOverlay: e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white">
            <option value="scoreboard">Scoreboard</option><option value="inning1_summary">Innings 1 Summary</option><option value="inning2_summary">Innings 2 Summary</option><option value="partnership">Partnership</option><option value="target_need">Target / Need</option><option value="toss_card">Toss Card</option><option value="super_over_card">Super Over</option><option value="most_runs">Most Runs</option><option value="most_wickets">Most Wickets</option><option value="full_match">Full Match</option>
          </select>
          <input value={overlayConfig.sponsorName || ''} onChange={e => updateOverlayConfig({sponsorName:e.target.value})} placeholder="Sponsor / broadcaster name" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white" />
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-tech font-bold text-amber-300 uppercase"><Sparkles className="w-3.5 h-3.5" /> Ticker</div>
          <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="LIVE • SPONSOR • MATCH UPDATE" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white" />
          <button onClick={() => updateOverlayConfig({showTicker: !overlayConfig.showTicker, tickerText: ticker})} className={`px-3 py-2 rounded-lg text-xs font-tech font-bold ${overlayConfig.showTicker ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{overlayConfig.showTicker ? 'TICKER ON' : 'TICKER OFF'}</button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-tech font-bold text-amber-300 uppercase"><Megaphone className="w-3.5 h-3.5" /> Overlay Advertising</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={mediaType} onChange={e => updateOverlayConfig({customAdMediaType:e.target.value as any})} className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white">
            <option value="auto">Auto / Image</option><option value="image">Image</option><option value="video">Video</option><option value="youtube">YouTube</option>
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ad title" className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white" />
          <input value={adUrl} onChange={e => setAdUrl(e.target.value)} placeholder={mediaType === 'youtube' ? 'YouTube URL' : 'Image / video URL'} className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={applyAd} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-tech font-bold">SHOW AD</button>
          <button onClick={() => updateOverlayConfig({customAdUrl:''})} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-tech font-bold">HIDE AD</button>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube supports watch, youtu.be, Shorts and embed links</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
        <div className="text-xs font-tech font-bold text-emerald-300 uppercase">Live Highlight Triggers</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => updateOverlayConfig({activeOverlay:'scoreboard', customBannerText:'FOUR! • GREAT SHOT'})} className="px-3 py-2 rounded-lg bg-emerald-900/60 border border-emerald-700 text-xs font-tech font-bold text-emerald-200">4 / FOUR</button>
          <button onClick={() => updateOverlayConfig({activeOverlay:'scoreboard', customBannerText:'SIX! • MAXIMUM'})} className="px-3 py-2 rounded-lg bg-purple-900/60 border border-purple-700 text-xs font-tech font-bold text-purple-200">6 / SIX</button>
          <button onClick={() => updateOverlayConfig({activeOverlay:'scoreboard', customBannerText:'WICKET! • LIVE HIGHLIGHT'})} className="px-3 py-2 rounded-lg bg-red-900/60 border border-red-700 text-xs font-tech font-bold text-red-200">WICKET</button>
          <button onClick={() => updateOverlayConfig({customBannerText:''})} className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-tech font-bold text-slate-300">CLEAR</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => updateOverlayConfig({activeOverlay:'welcome', customBannerText:'WELCOME TO THE MATCH'})} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-tech font-bold text-white">WELCOME</button>
        <button onClick={() => updateOverlayConfig({activeOverlay:'match_summary'})} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-tech font-bold text-white">MATCH SUMMARY</button>
        <button onClick={() => updateOverlayConfig({activeOverlay:'match_winner'})} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-tech font-bold text-white">WINNER</button>
        <button onClick={() => updateOverlayConfig({activeOverlay:'last_over'})} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-tech font-bold text-white">LAST OVER</button>
        <button onClick={() => updateOverlayConfig({timeoutTimerActive: !overlayConfig.timeoutTimerActive, timeoutTimerSeconds: overlayConfig.timeoutTimerSeconds || 30})} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-tech font-bold text-white flex items-center gap-1"><Clock3 className="w-3 h-3" /> TIMEOUT</button>
      </div>
    </div>
  );
};
