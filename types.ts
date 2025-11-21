export enum AppStep {
  UPLOAD_IMAGE = 1,
  UPLOAD_AUDIO = 2,
  CONFIGURE = 3,
  PREVIEW = 4,
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
  thumbnail: string;
}

export type PoseType = 'base' | 'var1' | 'var2' | 'var3';

export interface GeneratedFrame {
  url: string;
  pose: PoseType;
  promptUsed?: string; // Debug/Display info
}

export interface AppState {
  step: AppStep;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  audioFile: File | null;
  audioPreviewUrl: string | null;
  selectedStyleId: string;
  motionPrompt: string; // New: User defined motion
  intensity: number; // 0-100
  duration: number; // seconds
  generatedFrames: GeneratedFrame[]; 
  isGenerating: boolean;
  credits: number;
}

export const DEFAULT_STATE: AppState = {
  step: AppStep.UPLOAD_IMAGE,
  imageFile: null,
  imagePreviewUrl: null,
  audioFile: null,
  audioPreviewUrl: null,
  selectedStyleId: 'neon-cyber',
  motionPrompt: 'Head bobbing to the beat, rhythmic motion', // Default prompt
  intensity: 50,
  duration: 10,
  generatedFrames: [],
  isGenerating: false,
  credits: 100,
};