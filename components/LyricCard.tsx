
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Copy, Play, Pause, Loader2, Activity, Flame, 
  Wand2, X, Sparkles, Zap, 
  AlignJustify, Edit2, Check, Music, Mic, FileText, RefreshCw, Brain, CheckCircle2, Save, Repeat
} from 'lucide-react';
import { generateRapAudio, regenerateRapLines } from '../services/gemini';
import { telemetry } from '../services/telemetry';
import { useTheme } from '../context/ThemeContext';
import { RapStyle, RhymeMatch, FlowCoachAdvice } from '../types';

interface LyricCardProps {
  id?: string;
  title: string;
  content: string;
  aiAnalysis?: string;
  variant?: 'Standard_Flow_v1' | 'Complex_Metric_v2';
  style?: RapStyle;
  topic?: string;
  suggestedStyle?: string;
  suggestedBpm?: number;
  imageUrl?: string;
  onSave?: () => void;
}

type Tab = 'lyrics' | 'analytics';

// Helper functions for raw PCM decoding
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const analyzePhonetics = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('['));
  const rhymeMatches: RhymeMatch[] = [];
  const stemMap: Record<string, string> = {}; 
  const colors = ['#00ffff', '#ff00ff', '#39ff14', '#ffff00', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let colorIdx = 0;
  const getStem = (word: string) => {
    const clean = word.replace(/[،.؟!;:«»()\[\]]/g, '').trim();
    if (clean.length < 2) return null;
    return clean.slice(-2);
  };
  lines.forEach((line, lIdx) => {
    const words = line.trim().split(/\s+/);
    words.forEach((word, wIdx) => {
      const stem = getStem(word);
      if (!stem) return;
      let matched = false;
      lines.forEach((otherLine, olIdx) => {
        const otherWords = otherLine.trim().split(/\s+/);
        otherWords.forEach((otherWord, owIdx) => {
          if (lIdx === olIdx && wIdx === owIdx) return;
          if (getStem(otherWord) === stem) matched = true;
        });
      });
      if (matched) {
        if (!stemMap[stem]) { stemMap[stem] = colors[colorIdx % colors.length]; colorIdx++; }
        rhymeMatches.push({ word, lineIdx: lIdx, wordIdx: wIdx, color: stemMap[stem], isInternal: false });
      }
    });
  });
  return rhymeMatches;
};

const calculateSimilarity = (str1: string, str2: string) => {
    if (!str1 || !str2) return 0;
    const clean1 = str1.replace(/[،.؟!;:«»()\[\]]/g, '').trim().split(/\s+/);
    const clean2 = str2.replace(/[،.؟!;:«»()\[\]]/g, '').trim().split(/\s+/);
    const set1 = new Set(clean1);
    const set2 = new Set(clean2);
    if (set1.size < 3 || set2.size < 3) return 0;
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
};

const getVocalGuide = (s: RapStyle | undefined): string => {
  switch(s) {
    case RapStyle.Gangsta: return "خشن، کوبنده با تاکید روی سیلاب‌های آخر (Aggressive)";
    case RapStyle.Emotional: return "آرام، کشیده و با احساس، استفاده از تحریرهای ملایم (Melodic Flow)";
    case RapStyle.Social: return "جدی، شمرده، بیان واضح کلمات و با لحن اعتراضی (Storytelling)";
    case RapStyle.Party: return "انرژیک، سریع، با هیجان بالا و تغییرات ناگهانی فلو (Hype)";
    case RapStyle.Motivational: return "محکم، حماسی، با اعتماد به نفس و صدای رسا (Epic)";
    case RapStyle.OldSchool: return "ریتمیک، کلاسیک، دقیق روی ضرب و بدون مکث‌های طولانی (Boom Bap)";
    default: return "فری‌استایل استاندارد با تمرکز بر وزن و قافیه";
  }
};

export const LyricCard: React.FC<LyricCardProps> = ({ title, content, aiAnalysis, style, topic, suggestedBpm, imageUrl, onSave }) => {
  const { theme } = useTheme();
  // Ensure content is a string to prevent .split errors
  const [localContent, setLocalContent] = useState(content || "");
  const [activeTab, setActiveTab] = useState<Tab>('lyrics');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [bpm, setBpm] = useState(suggestedBpm || 90);
  const [showRhymes, setShowRhymes] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const [activeLineEdit, setActiveLineEdit] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setLocalContent(content || "");
    setAudioBuffer(null);
    setIsPlaying(false);
  }, [content]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const playAudio = async () => {
    if (!audioBuffer) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    stopAudio();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      stopAudio();
    } else {
      if (!audioBuffer) {
        setIsLoadingAudio(true);
        try {
          const base64 = await generateRapAudio(localContent);
          if (base64) {
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const bytes = decodeBase64(base64);
            const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
            setAudioBuffer(buffer);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            source.start(0);
            sourceNodeRef.current = source;
            setIsPlaying(true);
          }
        } catch (e) {
          console.error("Audio generation failed", e);
        } finally {
          setIsLoadingAudio(false);
        }
      } else {
        await playAudio();
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) { console.error("Copy error", e); }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleMagicEdit = async (lIdx: number) => {
    if (!editInstruction.trim()) return;
    setIsRegenerating(true);
    try {
      const updatedFullLyrics = await regenerateRapLines(localContent, [lIdx], style || 'Rap', topic || 'Freestyle', editInstruction);
      // Ensure we get a valid string back
      const safeContent = typeof updatedFullLyrics === 'string' ? updatedFullLyrics : String(updatedFullLyrics || "");
      if (safeContent && safeContent.length > 20) {
        setLocalContent(safeContent);
        setActiveLineEdit(null);
        setEditInstruction('');
        telemetry.log('line_magic_edit_success', { style });
      }
    } catch (err) { console.error(err); } finally { setIsRegenerating(false); }
  };

  // Safe split: handle cases where localContent might be non-string (though fixed above)
  const rawLines = useMemo(() => {
      const safeText = typeof localContent === 'string' ? localContent : "";
      return safeText.split('\n');
  }, [localContent]);
  
  const redundancyWarnings = useMemo(() => {
     const warnings: Record<number, boolean> = {};
     const lines = rawLines;
     for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim().length === 0 || lines[i].startsWith('[')) continue;
        const prevLine = lines[i-1];
        if (prevLine && !prevLine.startsWith('[')) {
            const similarity = calculateSimilarity(lines[i], prevLine);
            if (similarity > 0.5) { warnings[i] = true; }
        }
     }
     return warnings;
  }, [rawLines]);

  const analytics = useMemo(() => {
    const textLines = rawLines.filter(l => l.trim().length > 0 && !l.startsWith('['));
    const syllables = textLines.map(l => l.split(/\s+/).length * 1.5);
    const avg = syllables.length > 0 ? syllables.reduce((a, b) => a + b, 0) / textLines.length : 0;
    return { rhymes: analyzePhonetics(typeof localContent === 'string' ? localContent : ""), intensity: Math.min(100, Math.floor((avg * bpm) / 1000 * 5)) };
  }, [localContent, rawLines, bpm]);

  const status = useMemo(() => {
    if (isRegenerating) return { text: 'در حال بازنویسی...', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Loader2, animate: true };
    if (isLoadingAudio) return { text: 'تولید صدا...', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Loader2, animate: true };
    return { text: 'آماده اجرا', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Check, animate: false };
  }, [isRegenerating, isLoadingAudio]);

  return (
    <div className={`w-full border rounded-3xl shadow-2xl overflow-hidden relative mt-8 font-sans transition-all duration-500 ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
      <div className={`border-b p-4 md:p-6 backdrop-blur-md ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/40 border-white/10'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <button 
              onClick={handleTogglePlay}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-rap-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-rap-accent/20 shrink-0"
            >
              {isLoadingAudio ? <Loader2 className="animate-spin w-6 h-6 md:w-8 md:h-8" /> : isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" /> : <Play className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" />}
            </button>
            
            {imageUrl && (
              <div className="relative group shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer">
                 <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                 </div>
              </div>
            )}

            <div className="text-right flex-1 min-w-0">
              <h2 className={`text-xl md:text-2xl font-black break-words leading-tight ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-[9px] md:text-[10px] ${status.bg} ${status.color} border ${status.border} px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1 transition-all whitespace-nowrap`}>
                    <status.icon size={10} className={status.animate ? "animate-spin" : ""} /> {status.text}
                </span>
                <span className="text-[9px] md:text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1 whitespace-nowrap"><Flame size={10} /> شدت: {analytics.intensity}%</span>
                <span className={`text-[9px] md:text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1 whitespace-nowrap ${theme === 'light' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-white/5 text-gray-400 border-white/5'}`}><Music size={10} /> BPM: {bpm}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {onSave && (
               <button 
                  onClick={handleSave} 
                  className={`p-2 rounded-xl border transition-all shrink-0 ${isSaved ? 'bg-green-500/10 border-green-500/20 text-green-400' : (theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-900' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10')}`}
                  title="ذخیره در پروژه ها"
                >
                  {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
               </button>
            )}
            <button onClick={() => setActiveTab('lyrics')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'lyrics' ? (theme === 'light' ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white') : 'text-gray-500 hover:text-gray-300'}`}>
               <AlignJustify size={14} className="inline-block ml-1" /> متن لیریک
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'analytics' ? (theme === 'light' ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white') : 'text-gray-500 hover:text-gray-300'}`}>
               <Activity size={14} className="inline-block ml-1" /> آنالیز فنی
            </button>
             <button onClick={handleCopy} className={`p-2 rounded-xl transition-all ml-auto md:ml-0 shrink-0 ${theme === 'light' ? 'bg-zinc-100 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`} title="کپی متن">
               {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
             </button>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-8 min-h-[400px]">
        {activeTab === 'lyrics' ? (
           <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <button onClick={() => setShowRhymes(!showRhymes)} className={`text-[10px] px-3 py-1 rounded-full border transition-all ${showRhymes ? 'bg-rap-accent/20 border-rap-accent text-rap-accent' : (theme === 'light' ? 'border-zinc-200 text-zinc-400' : 'border-white/10 text-gray-500')}`}>
                      Highlighter: {showRhymes ? 'ON' : 'OFF'}
                   </button>
                </div>
                <div className="text-[10px] text-gray-500">برای ویرایش روی خط کلیک کنید</div>
             </div>
             
             <div className="space-y-2 text-right dir-rtl leading-loose">
               {rawLines.map((line, idx) => {
                 if (line.trim().startsWith('[')) {
                    return <div key={idx} className="text-xs font-black text-rap-accent mt-6 mb-2 opacity-80 uppercase tracking-widest">{line.replace(/[\[\]]/g, '')}</div>;
                 }
                 
                 const words = line.trim().split(/\s+/);
                 const isRedundant = redundancyWarnings[idx];

                 return (
                   <div key={idx} className={`group relative p-2 rounded-lg transition-colors -mx-2 ${theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`}>
                      {isRedundant && activeLineEdit !== idx && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 animate-fadeIn">
                             <button 
                               onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveLineEdit(idx);
                                   setEditInstruction("این خط تکرار معنایی خط قبل است. لطفا با حفظ قافیه، آن را با کلمات و تصویرسازی جدید بازنویسی کن.");
                               }}
                               className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-1.5 rounded-lg text-[10px] font-bold hover:bg-yellow-500/20 transition-all hover:scale-105"
                               title="تشخیص تکرار معنایی (کلیک برای اصلاح خودکار)"
                             >
                                <Repeat size={12} />
                                <span className="hidden md:inline">تکراری</span>
                             </button>
                          </div>
                      )}

                      {activeLineEdit === idx ? (
                        <div className="flex items-center gap-2 animate-fadeIn">
                          <input 
                            autoFocus
                            type="text" 
                            className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none ${theme === 'light' ? 'bg-white border-rap-accent/50 text-zinc-900' : 'bg-black/40 border-rap-accent/50 text-white'}`}
                            placeholder="دستور ویرایش (مثلا: قافیه رو قوی‌تر کن...)"
                            value={editInstruction}
                            onChange={(e) => setEditInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMagicEdit(idx)}
                          />
                          <button onClick={() => handleMagicEdit(idx)} className="p-2 bg-rap-accent rounded-lg text-white hover:bg-rap-accent/90"><Wand2 size={16} /></button>
                          <button onClick={() => setActiveLineEdit(null)} className="p-2 bg-white/10 rounded-lg text-gray-400 hover:text-white"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setActiveLineEdit(idx)}>
                           <p className={`text-base md:text-lg font-medium leading-8 w-full ${isRedundant ? 'text-yellow-600/80 decoration-yellow-500/30 underline decoration-dashed underline-offset-4' : (theme === 'light' ? 'text-zinc-700' : 'text-gray-200')}`}>
                             {words.map((w, wIdx) => {
                               const match = showRhymes ? analytics.rhymes.find(r => r.lineIdx === idx && r.wordIdx === wIdx) : null;
                               return (
                                 <span key={wIdx} style={{ color: match ? match.color : 'inherit', textShadow: match && theme !== 'light' ? `0 0 10px ${match.color}40` : 'none' }} className="inline-block ml-1">
                                    {w}
                                 </span>
                               );
                             })}
                           </p>
                           <Edit2 size={14} className="opacity-0 group-hover:opacity-100 text-gray-500 transition-opacity" />
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>

             <div className={`pt-6 border-t mt-4 flex justify-end ${theme === 'light' ? 'border-zinc-100' : 'border-white/5'}`}>
                <button 
                  onClick={handleCopy} 
                  className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-sm font-bold transition-all group ${theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white'}`}
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 size={18} className="text-green-400" />
                      <span className="text-green-400">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} className="group-hover:text-rap-accent transition-colors" />
                      <span>کپی متن کامل</span>
                    </>
                  )}
                </button>
             </div>
           </div>
        ) : (
           <div className="space-y-8 animate-fadeIn text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                    <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><Mic size={16} className="text-purple-400" /> راهنمای اجرا (Vocal Guide)</h3>
                    <p className={`text-sm leading-7 ${theme === 'light' ? 'text-zinc-600' : 'text-gray-400'}`}>{getVocalGuide(style)}</p>
                 </div>
                 <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                    <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><FileText size={16} className="text-blue-400" /> ساختار تکنیکی</h3>
                    <div className={`space-y-2 text-sm ${theme === 'light' ? 'text-zinc-500' : 'text-gray-400'}`}>
                       <div className="flex justify-between"><span>تعداد ابیات:</span> <span className={`${theme === 'light' ? 'text-zinc-900' : 'text-white'} font-mono`}>{rawLines.filter(l => !l.startsWith('[') && l.trim()).length}</span></div>
                       <div className="flex justify-between"><span>چگالی قافیه:</span> <span className={`${theme === 'light' ? 'text-zinc-900' : 'text-white'} font-mono`}>{analytics.rhymes.length} Matches</span></div>
                    </div>
                 </div>
              </div>

              <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                 <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><Brain size={16} className="text-green-400" /> آنالیز هوش مصنوعی</h3>
                 <p className={`text-sm leading-8 whitespace-pre-wrap ${theme === 'light' ? 'text-zinc-600' : 'text-gray-300'}`}>{aiAnalysis || "آنالیز در دسترس نیست."}</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
