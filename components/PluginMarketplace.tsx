
import React, { useState } from 'react';
import { 
  Puzzle, CheckCircle2, Download, Info, Code, ShieldCheck, 
  ExternalLink, Package, Cpu, Wand2, Music, ExternalLink as LinkIcon,
  // Added Activity icon to fix missing name error
  Activity
} from 'lucide-react';
import { pluginRegistry } from '../services/pluginRegistry';
import { PluginCategory } from '../types';

export const PluginMarketplace: React.FC = () => {
  const [filter, setFilter] = useState<PluginCategory | 'all'>('all');
  const [showDocs, setShowDocs] = useState(false);
  const [, forceUpdate] = useState({});

  const plugins = pluginRegistry.getPlugins().filter(p => filter === 'all' || p.category === filter);

  const toggle = (id: string) => {
    pluginRegistry.togglePlugin(id);
    forceUpdate({});
  };

  return (
    <div className="space-y-8 animate-fadeIn text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Puzzle className="text-rap-accent" /> بازارچه افزونه‌ها
          </h2>
          <p className="text-gray-400 mt-2">قابلیت‌های نسل بعدی را با ماژول‌های توسعه‌دهندگان به استودیو اضافه کنید.</p>
        </div>
        <button 
          onClick={() => setShowDocs(!showDocs)}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-all"
        >
          <Code size={16} /> {showDocs ? 'بستن مستندات' : 'مستندات توسعه‌دهنده'}
        </button>
      </div>

      {showDocs ? (
        <div className="bg-black/40 border border-indigo-500/20 rounded-3xl p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 text-indigo-400 border-b border-white/5 pb-4">
            <ShieldCheck size={24} />
            <h3 className="text-xl font-black uppercase tracking-widest">Developer SDK & Sandbox</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left" dir="ltr">
            <div className="space-y-4">
              <h4 className="text-white font-bold">Plugin Lifecycle</h4>
              <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                <li><span className="text-gray-300">Registration:</span> Define manifest with unique ID.</li>
                <li><span className="text-gray-300">Hook:</span> Connect to Beat, Flow, or Audio nodes.</li>
                <li><span className="text-gray-300">Cleanup:</span> Automated resource release on toggle.</li>
              </ul>
              <pre className="bg-black/60 p-4 rounded-xl text-[10px] text-green-400 overflow-x-auto">
{`// Example Effect Plugin
registry.register({
  id: 'my-fx',
  category: 'effect',
  applyEffect: (ctx, source) => {
    const reverb = ctx.createConvolver();
    // ... config
    source.connect(reverb);
    return reverb;
  }
});`}
              </pre>
            </div>
            <div className="space-y-4">
              <h4 className="text-white font-bold">Security & Sandbox Model</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                All plugins run in a non-blocking context. Audio processing happens via the <code className="bg-white/5 px-1 rounded">Web Audio API</code>. Global state access is restricted to the <code className="bg-white/5 px-1 rounded">PluginRegistry</code> proxy.
              </p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-2">
                  <Package size={12} /> Standard API Endpoints
                </div>
                <div className="space-y-1 text-[10px] font-mono text-indigo-300">
                  <div>GET /v1/marketplace/sync</div>
                  <div>POST /v1/sandbox/validate</div>
                  <div>GET /v1/docs/audio-buffers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['all', 'beat', 'flow', 'effect'] as const).map(cat => (
              <button 
                key={cat} 
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filter === cat ? 'bg-rap-accent border-rap-accent text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
              >
                {cat === 'all' ? 'همه' : cat === 'beat' ? 'بیت‌ها' : cat === 'flow' ? 'فلو' : 'افکت صوتی'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.map(p => (
              <div key={p.id} className="bg-rap-card border border-white/5 rounded-3xl p-6 hover:border-white/20 transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${p.category === 'effect' ? 'bg-blue-500/10 text-blue-400' : p.category === 'flow' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {/* Activity icon is now imported correctly */}
                    {p.category === 'effect' ? <Wand2 /> : p.category === 'flow' ? <Activity /> : <Music />}
                  </div>
                  {pluginRegistry.isPluginActive(p.id) && (
                    <span className="bg-green-500/10 text-green-400 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 size={10} /> فعال
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-rap-accent transition-colors">{p.name}</h3>
                <div className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">توسط {p.author} • v{p.version}</div>
                <p className="text-sm text-gray-400 mt-4 leading-relaxed flex-grow">{p.description}</p>
                
                <button 
                  onClick={() => toggle(p.id)}
                  className={`w-full mt-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${pluginRegistry.isPluginActive(p.id) ? 'bg-white/5 text-gray-300 border border-white/10 hover:bg-red-500/10 hover:text-red-400' : 'bg-white text-black hover:scale-[1.02]'}`}
                >
                  {pluginRegistry.isPluginActive(p.id) ? 'غیرفعال‌سازی' : <><Download size={16} /> نصب و فعال‌سازی</>}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
