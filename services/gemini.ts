import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedFrame, PoseType } from "../types";

const API_KEY = process.env.API_KEY || '';

export const fileToGenericBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const stripBase64Prefix = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

// --- MOCK DATA (Fallback) ---
const MOCK_FRAMES: GeneratedFrame[] = [
    { url: '', pose: 'base' },
    { url: '', pose: 'var1' },
    { url: '', pose: 'var2' },
    { url: '', pose: 'var3' },
];

// --- AI DIRECTOR LOGIC ---

/**
 * Step 1: Analyze the base image and user intent to create specific frame prompts.
 */
const planAnimationSequence = async (
    ai: GoogleGenAI, 
    baseImageBase64: string, 
    motionPrompt: string,
    stylePrompt: string
): Promise<{ pose: PoseType, prompt: string }[]> => {
    
    const systemInstruction = `
    You are an expert Animation Director. 
    Your task is to plan 3 keyframes (var1, var2, var3) to animate a still image based on a user's motion description.
    The frames will be played in a loop (Base -> Var1 -> Var2 -> Var3 -> Var2 -> Var1 -> Base).
    
    Rules:
    1. Analyze the provided image.
    2. Generate a visual description for 3 variations that execute the user's motion.
    3. The descriptions must be STRICTLY visual changes to the SUBJECT (e.g. "Subject head tilted left", "Subject zooming in", "Subject eyes glowing").
    4. Maintain consistency: Ensure the descriptions explicitly state to keep the same character, lighting, and background.
    5. DO NOT describe the art style (e.g. "cyberpunk"), only the physical changes for animation.
    `;

    const userPrompt = `
    Motion Request: "${motionPrompt}"
    Style Context: "${stylePrompt}"
    
    Output JSON format:
    [
        { "pose": "var1", "prompt": "Detailed description of first movement frame..." },
        { "pose": "var2", "prompt": "Detailed description of peak movement frame..." },
        { "pose": "var3", "prompt": "Detailed description of return or alternative movement frame..." }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Vision model for analysis
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: baseImageBase64 } },
                    { text: userPrompt }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            pose: { type: Type.STRING, enum: ['var1', 'var2', 'var3'] },
                            prompt: { type: Type.STRING }
                        },
                        required: ['pose', 'prompt']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No plan generated");
        return JSON.parse(text);
    } catch (e) {
        console.warn("Failed to plan animation, using fallback prompts", e);
        // Fallback generic prompts if planning fails
        return [
            { pose: 'var1', prompt: `Slightly rotate the subject to the left. Maintain consistent character details and background.` },
            { pose: 'var2', prompt: `Slight zoom in on the subject with increased intensity. Maintain consistent character details.` },
            { pose: 'var3', prompt: `Slightly rotate the subject to the right. Maintain consistent character details.` },
        ];
    }
};

/**
 * Main Generation Function
 */
export const generateDanceFrames = async (
  originalImageBase64: string, 
  stylePrompt: string,
  motionPrompt: string
): Promise<GeneratedFrame[]> => {
  
  // Always start with the base image as the anchor
  const frames: GeneratedFrame[] = [{
    url: originalImageBase64,
    pose: 'base',
    promptUsed: 'Original Image'
  }];

  if (!API_KEY) {
    console.warn("No API Key found. Returning mock data.");
    // Just duplicate the base image for dev
    ['var1', 'var2', 'var3'].forEach(p => frames.push({ url: originalImageBase64, pose: p as PoseType }));
    return frames;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const cleanBase64 = stripBase64Prefix(originalImageBase64);

  // 1. Plan the sequence
  const plannedMoves = await planAnimationSequence(ai, cleanBase64, motionPrompt, stylePrompt);

  // 2. Generate frames in parallel
  const promises = plannedMoves.map(async (move) => {
    try {
      // We combine style + the director's specific instruction
      const fullPrompt = `
        Apply this art style: ${stylePrompt}.
        Transform the input image: ${move.prompt}.
        CRITICAL: Keep the exact same character, face, clothes, and background. This is an animation frame. Do not change the identity.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            { text: fullPrompt }
          ]
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return {
                  url: `data:image/png;base64,${part.inlineData.data}`,
                  pose: move.pose,
                  promptUsed: move.prompt
                } as GeneratedFrame;
            }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error generating ${move.pose} frame:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  
  results.forEach(res => {
    if (res) frames.push(res);
  });
  
  return frames;
};