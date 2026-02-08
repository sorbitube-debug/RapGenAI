

export enum RapStyle {
  Gangsta = "گنگ و خیابانی",
  Emotional = "احساسی و دپ",
  Social = "اجتماعی و اعتراضی",
  Party = "پارتی و فان",
  Motivational = "انگیزشی",
  OldSchool = "اولد اسکول",
  Battle = "بتل رپ و کل‌کل",
  Lyrical = "تکنیکی و ادبی",
  Horrorcore = "هارورکور و تاریک",
  Abstract = "انتزاعی و مدرن"
}

export enum RapTone {
  Aggressive = "پرخاشگر (Aggressive)",
  Philosophical = "فلسفی و عمیق (Deep)",
  Humorous = "طنز و کنایه‌آمیز (Sarcastic)",
  Dark = "تاریک و سیاه (Dark)",
  Melodic = "ملودیک و نرم (Soft)",
  Epic = "حماسی و انگیزشی (Epic)",
  Nostalgic = "نوستالژیک و خاطره‌انگیز (Nostalgic)",
  Underground = "زیرزمینی و خام (Raw)",
  Experimental = "تجربی و متفاوت (Experimental)",
  Cynical = "تلخ و گزنده (Cynical)",
  Mystical = "عرفانی و اشراقی (Mystical)",
  Savage = "سرکش و عصیانگر (Savage)",
  Melancholic = "مالیخولیایی و مبهم (Melancholic)",
  Satirical = "هجوآمیز و گزنده (Satirical)",
  Braggadocio = "رجزخوانی و قدرت (Braggadocio)"
}

export enum RhymeComplexity {
  Simple = "ساده (Monosyllabic)",
  Medium = "استاندارد",
  Complex = "پیچیده (Multisyllabic)"
}

export enum RapLength {
  Short = "کوتاه",
  Medium = "استاندارد",
  Long = "طولانی"
}

export enum RhymeScheme {
  Freestyle = "آزاد (Freestyle)",
  AABB = "جفت (AABB)",
  ABAB = "یک در میان (ABAB)",
  AAAA = "تک قافیه (AAAA)",
  Double = "دوبل قافیه (Double)",
  Linear = "قافیه خطی (Linear)"
}

export interface StructureRule {
  id: string;
  section: string; // e.g., "Verse 1", "Chorus"
  startLine: number;
  endLine: number;
  scheme: RhymeScheme;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  avatar?: string;
  password?: string;
  ownedPlugins: string[]; // List of purchased feature IDs
}

export interface RhymeMatch {
  word: string;
  lineIdx: number;
  wordIdx: number;
  color: string;
  isInternal: boolean;
}

export interface FlowCoachAdvice {
  type: 'rhythm' | 'rhyme' | 'delivery';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LyricResponse {
  title: string;
  content: string;
  aiAnalysis?: string;
  variant: 'Standard_Flow_v1' | 'Complex_Metric_v2';
  suggestedStyle?: string;
  suggestedBpm?: number;
  imageUrl?: string;
}

export type PluginCategory = 'beat' | 'flow' | 'effect';

export interface BasePlugin {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: PluginCategory;
}

export interface BeatPlugin extends BasePlugin {
  category: 'beat';
}

export interface FlowPlugin extends BasePlugin {
  category: 'flow';
  transformLyrics: (lyrics: string) => string;
}

export interface EffectPlugin extends BasePlugin {
  category: 'effect';
  applyEffect: (ctx: AudioContext, source: AudioNode) => AudioNode;
}

export type Plugin = BeatPlugin | FlowPlugin | EffectPlugin;

export interface UserComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
}

export interface CloudProject {
  id: string;
  userId: string;
  title: string;
  content: string;
  style: RapStyle;
  lastModified: number;
  comments: UserComment[];
  aiAnalysis?: string;
}

export type AIProvider = 'gemini' | 'openai_compatible';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}