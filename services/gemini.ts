
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { RapStyle, RapLength, RhymeScheme, LyricResponse, RapTone, RhymeComplexity, ImageSize, StructureRule, AIConfig } from "../types";

const TONE_MODULES = {
  [RapTone.Aggressive]: "واژگان تند، بیانی قاطع و حماسی، استفاده از کلمات کوبنده.",
  [RapTone.Philosophical]: "تصویرسازی‌های انتزاعی، تفکر در مورد جامعه و خود، واژگان ادبی و سنگین‌تر.",
  [RapTone.Humorous]: "کنایه، بازی با کلمات خنده‌دار، استفاده از اسلنگ‌های فان و روزمره.",
  [RapTone.Dark]: "فضاسازی سرد، ناامیدی، استفاده از ایهام‌های سیاه و گنگ.",
  [RapTone.Melodic]: "جملات کشیده‌تر، تمرکز روی واکه‌ها (Vowels)، حس آرامش و ریتمیک.",
  [RapTone.Epic]: "بیانی حماسی و پیروزمندانه، استفاده از واژگان قدرتمند، ریتم کوبنده و تاثیرگذار.",
  [RapTone.Nostalgic]: "حس دلتنگی و مرور خاطرات، استفاده از کلمات نوستالژیک، بیانی ملایم و با مکث‌های بلند.",
  [RapTone.Underground]: "فضای مستقل و خام، دوری از کلمات پرزرق و برق، استفاده از اسلنگ‌های خیابانی عمیق و واقعی.",
  [RapTone.Experimental]: "ساختارشکنی در وزن و قافیه، استعاره‌های نامتعارف، فلوهای غیرمنتظره و تجربی.",
  [RapTone.Cynical]: "نگاهی منتقدانه، تلخ و گزنده به مسائل، استفاده از کنایه‌های تند و ایهام‌های سیاه.",
  [RapTone.Mystical]: "استفاده از سمبولیسم کلاسیک ایرانی (نور، سایه، جام، رند)، تصاویر انتزاعی و روحانی.",
  [RapTone.Savage]: "انرژی بالا، عصیان، بی‌پروایی در بیان حقایق، جملات کوتاه و بریده‌بریده.",
  [RapTone.Melancholic]: "فضای خواب‌گونه و سورئال، تکرار کلمات برای ایجاد حس گیجی، تمرکز بر دردهای درونی.",
  [RapTone.Satirical]: "هجو سیاسی و اجتماعی، استفاده از پارادوکس‌های خنده‌دار اما تلخ، نقد قدرت با زبان رپ.",
  [RapTone.Braggadocio]: "تکنیک‌های خودستایی، تحقیر حریف (دیس)، تمرکز بر مهارت‌های فردی و دستاوردها."
};

const RAP_CORE_SYSTEM_INSTRUCTION = `
شما "RapGen Pro Engine" هستید. یک مدل پیشرفته متخصص در مهندسی لیریک رپ فارسی.
تخصص شما شامل: وزن عروضی مدرن، قافیه‌های چندسیلابی و تکنیک‌های فلو (Flow).
شما هرگز نباید متن مکالمه‌ای (Conversational) در خروجی "Lyrics" قرار دهید.
همه توضیحات فنی و آنالیز باید به زبان فارسی باشد.

محدودیت ساختاری: هرگز بخش‌های Intro (مقدمه) و Outro (پایانی) را در متن لیریک قرار ندهید. لیریک فقط باید شامل بخش‌های اصلی مانند Verse، Chorus و Bridge باشد.
`;

const getAIConfig = (): AIConfig => {
  try {
    const stored = localStorage.getItem('rapgen_ai_config');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load AI config", e);
  }
  return { provider: 'gemini' };
};

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper to extract JSON from markdown code blocks or raw text
const extractJSON = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } catch (e2) {
                console.error("JSON Parse Error (Inner)", e2);
            }
        }
        // Fallback for bad models
        return {
            title: "Error Parsing JSON",
            content: text,
            aiAnalysis: "The model did not return valid JSON. Here is the raw output."
        };
    }
};

const sanitizeBaseUrl = (url?: string) => {
    if (!url) return "https://api.openai.com/v1";
    let clean = url.trim().replace(/\/+$/, ''); // remove trailing slashes
    // If user accidentally added /chat/completions, remove it
    if (clean.endsWith('/chat/completions')) {
        clean = clean.substring(0, clean.length - '/chat/completions'.length);
    }
    return clean;
};

export const generateRapLyrics = async (
  topic: string,
  style: RapStyle,
  tone: RapTone,
  rhymeComplexity: RhymeComplexity,
  subStyle: string,
  length: RapLength,
  keywords: string,
  creativity: number,
  topK: number,
  topP: number,
  rhymeScheme: RhymeScheme,
  useThinking: boolean,
  targetBpm: number,
  flowSpeed: string,
  stressLevel: string,
  rhythmicVariety: string,
  drumPattern?: Record<string, boolean[]>,
  beatAudio?: { name: string, data: string, mimeType: string } | null,
  structureRules?: StructureRule[]
): Promise<LyricResponse> => {
  
  const config = getAIConfig();
  
  let rhythmDescription = "Standard 4/4 Beat";
  if (drumPattern && !beatAudio) {
      const getActiveSteps = (inst: string) => drumPattern[inst].map((v, i) => v ? i + 1 : null).filter(v => v !== null).join(', ');
      rhythmDescription = `
        Custom Beat Pattern (16 Steps):
        - Kick hits on steps: [${getActiveSteps('kick')}]
        - Snare hits on steps: [${getActiveSteps('snare')}]
        - HiHat hits on steps: [${getActiveSteps('hihat')}]
        
        CRITICAL INSTRUCTION: Write the lyrics so the stressed syllables align with the Kick and Snare hits defined above. The Flow MUST match this specific drum pattern.
      `;
  }

  let rhymeInstruction = `Default Global Rhyme Scheme: ${rhymeScheme}`;
  
  let customStructureMap = "";
  if (structureRules && structureRules.length > 0) {
      customStructureMap = "\nSTRICT CUSTOM STRUCTURE RULES (You MUST follow these exact instructions for the specific lines):";
      structureRules.forEach((rule, index) => {
          customStructureMap += `\n${index + 1}. SECTION: ${rule.section} | LINES: ${rule.startLine} to ${rule.endLine} | SCHEME: ${rule.scheme}`;
      });
      customStructureMap += "\n(For any lines not specified above, use the Default Global Rhyme Scheme).";
  }

  if (rhymeScheme === RhymeScheme.Double && (!structureRules || structureRules.length === 0)) {
    rhymeInstruction += `
      STRICT RHYME CONSTRAINT: DOUBLE RHYME (دوبل قافیه / جناس مرکب).
      You MUST ensure that the LAST TWO WORDS of the first line rhyme individually with the LAST TWO WORDS of the second line.
      APPLY THIS SCHEME TO ALL COUPLETS.
    `;
  } else if (rhymeScheme === RhymeScheme.Linear && (!structureRules || structureRules.length === 0)) {
    rhymeInstruction += `
      STRICT RHYME CONSTRAINT: LINEAR RHYME (قافیه خطی / موازنه).
      In this scheme, EVERY SINGLE WORD in the first line must rhyme with the corresponding word in the second line (Vertical Alignment).
      Attempt to maintain this complex structure for the Chorus sections.
    `;
  }

  let textPrompt = `
      TASK: Generate a Professional Persian Rap Song.
      TOPIC: ${topic}
      STYLE: ${style} (${subStyle})
      TONE: ${tone}
      TONE_SPECIFIC_INSTRUCTION: ${TONE_MODULES[tone] || ""}
      KEYWORDS: ${keywords}
      TARGET BPM: ${targetBpm}
      
      FLOW ENGINEERING SETTINGS:
      - Delivery Speed: ${flowSpeed} (Adjust syllable density per bar accordingly)
      - Syllable Stress: ${stressLevel} (Mark strong beats)
      - Rhythmic Variety: ${rhythmicVariety}
      
      ${rhythmDescription}
      ${rhymeInstruction}
      ${customStructureMap}
      
      TECHNICAL REQUIREMENTS:
      1. Output in JSON format only.
      2. Field 'title': The song title.
      3. Field 'content': The full lyrics with [Verse], [Chorus] etc. (DO NOT include [Intro] or [Outro]).
      4. Field 'aiAnalysis': A breakdown of the flow and rhyme techniques.
      
      The lyrics must be high-quality, professional-grade Persian rap.
  `;

  return retry(async () => {

    // --- Custom OpenAI Compatible Provider Logic ---
    if (config.provider === 'openai_compatible') {
        const baseUrl = sanitizeBaseUrl(config.baseUrl);
        const apiKey = config.apiKey || "";
        const modelName = config.modelName || "gpt-3.5-turbo";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: "system", content: RAP_CORE_SYSTEM_INSTRUCTION + "\nIMPORTANT: RETURN ONLY JSON." },
                    { role: "user", content: textPrompt }
                ],
                temperature: creativity,
                top_p: topP
                // top_k is not standard in OpenAI API, mostly handled by backend
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI Provider Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const result = extractJSON(content);

        return {
            title: result.title || "بدون عنوان",
            content: typeof result.content === 'string' ? result.content : String(result.content || ""),
            aiAnalysis: typeof result.aiAnalysis === 'string' ? result.aiAnalysis : "",
            variant: 'Standard_Flow_v1',
            suggestedBpm: targetBpm
        };
    } 
    
    // --- Google Gemini Logic (Default) ---
    else {
        // Use custom key if provided in settings, otherwise env
        const geminiKey = config.apiKey || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        const response = await ai.models.generateContent({
          model: useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
          contents: textPrompt,
          config: {
            systemInstruction: RAP_CORE_SYSTEM_INSTRUCTION,
            temperature: creativity,
            topK: topK,
            topP: topP,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                aiAnalysis: { type: Type.STRING }
              },
              required: ["title", "content", "aiAnalysis"]
            },
            thinkingConfig: useThinking ? { thinkingBudget: 4000 } : undefined
          }
        });

        const result = JSON.parse(response.text || "{}");
        
        return {
          title: result.title || "بدون عنوان",
          content: typeof result.content === 'string' ? result.content : String(result.content || ""),
          aiAnalysis: typeof result.aiAnalysis === 'string' ? result.aiAnalysis : "",
          variant: 'Standard_Flow_v1',
          suggestedBpm: targetBpm
        };
    }
  });
};

export const generateRapAudio = async (text: string): Promise<string> => {
  // TTS strictly uses Gemini for now
  const config = getAIConfig();
  const geminiKey = (config.provider === 'gemini' && config.apiKey) ? config.apiKey : process.env.API_KEY;
  
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `بخوان با لحن رپ حرفه‌ای: ${text.slice(0, 800)}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
      }
    }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateRapCoverArt = async (title: string, style: string, size: ImageSize, useFlash = false): Promise<string> => {
  // Image Generation strictly uses Gemini for now
  const config = getAIConfig();
  const geminiKey = (config.provider === 'gemini' && config.apiKey) ? config.apiKey : process.env.API_KEY;

  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const modelName = useFlash ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  const prompt = `Professional album cover art for a Persian Rap song titled "${title}". Style: ${style}. High contrast, cinematic lighting, gritty urban aesthetic, Persian calligraphy elements, masterpiece, 4k.`;
  
  const imageConfig: any = { aspectRatio: "1:1" };
  if (modelName === 'gemini-3-pro-image-preview') {
    imageConfig.imageSize = size;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ text: prompt }],
    config: {
      imageConfig: imageConfig
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part?.inlineData?.data || "";
};

export const regenerateRapLines = async (fullContent: string, lineIndices: number[], style: string, topic: string, instruction: string): Promise<string> => {
  
  const config = getAIConfig();
  
  const prompt = `در متن لیریک رپ زیر، خطوط مشخص شده را بر اساس این دستور بازنویسی کن و بقیه متن را تغییر نده: "${instruction}"\n\nمتن اصلی:\n${fullContent}`;

  if (config.provider === 'openai_compatible') {
        const baseUrl = sanitizeBaseUrl(config.baseUrl);
        const apiKey = config.apiKey || "";
        const modelName = config.modelName || "gpt-3.5-turbo";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: "system", content: "شما یک ویراستار متخصص لیریک رپ هستید. فقط متن نهایی لیریک را برگردانید." },
                    { role: "user", content: prompt }
                ]
            })
        });
        if (!response.ok) return fullContent;
        const data = await response.json();
        const res = data.choices?.[0]?.message?.content || fullContent;
        return typeof res === 'string' ? res : String(res);
  } else {
      const geminiKey = config.apiKey || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: "شما یک ویراستار متخصص لیریک رپ هستید. فقط متن نهایی لیریک را برگردانید."
        }
      });
      return response.text || fullContent;
  }
};
