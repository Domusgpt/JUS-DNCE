import React, { useRef, useState, useEffect } from 'react';
import { Upload, Music, Play, Pause, Volume2, Check, Wand2, Zap, AlertCircle, Type, Film } from 'lucide-react';
import { AppState, StylePreset, AppStep } from '../types';
import { STYLE_PRESETS } from '../constants';

/* -------------------------------------------------------------------------- */
/*                                STEP 1: IMAGE                               */
/* -------------------------------------------------------------------------- */

interface Step1Props {
  imagePreview: string | null;
  onUpload: (file: File) => void;
}

export const Step1Image: React.FC<Step1Props> = ({ imagePreview, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
      <div className="w-full max-w-xl text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">Upload Source Image</h2>
        <p className="text-gray-400">Choose the base visual for your rhythmic loop.</p>
      </div>

      <div 
        className={`
          relative w-full max-w-xl aspect-square rounded-2xl border-2 border-dashed 
          flex flex-col items-center justify-center cursor-pointer transition-all duration-300
          ${imagePreview 
            ? 'border-brand-500 bg-brand-950/30' 
            : 'border-gray-700 hover:border-gray-500 hover:bg-dark-surface'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        
        {imagePreview ? (
          <div className="relative w-full h-full p-4 group">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full h-full object-contain rounded-lg shadow-2xl" 
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
              <p className="text-white font-medium flex items-center gap-2">
                <Upload size={20} /> Change Image
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-400">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Click to upload</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Supports JPG, PNG, WebP. Best results with high contrast images.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                STEP 2: AUDIO                               */
/* -------------------------------------------------------------------------- */

interface Step2Props {
  audioPreview: string | null;
  audioFile: File | null;
  onUpload: (file: File) => void;
}

export const Step2Audio: React.FC<Step2Props> = ({ audioPreview, audioFile, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
      <div className="w-full max-w-xl text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">Add Audio Track</h2>
        <p className="text-gray-400">Upload the beat that will drive the animation.</p>
      </div>

      <div className="w-full max-w-xl bg-dark-surface border border-dark-border rounded-2xl p-8">
        {!audioFile ? (
           <div 
             className="border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-900/10 transition-colors"
             onClick={() => fileInputRef.current?.click()}
           >
             <Music size={48} className="text-gray-500 mb-4" />
             <p className="text-lg font-medium text-gray-300">Select Audio File</p>
             <p className="text-sm text-gray-500 mt-2">MP3, WAV, AAC supported</p>
           </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full bg-brand-900/20 rounded-lg p-4 mb-6 flex items-center gap-4 border border-brand-500/30">
              <button 
                onClick={togglePlay}
                className="w-12 h-12 bg-brand-600 hover:bg-brand-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
              </button>
              <div className="flex-1">
                <p className="text-white font-medium truncate">{audioFile.name}</p>
                <div className="flex items-center gap-2 text-xs text-brand-300 mt-1">
                  <Volume2 size={12} />
                  <span>Ready for analysis</span>
                </div>
              </div>
              <button 
                onClick={() => { onUpload(null as any); setIsPlaying(false); }}
                className="text-gray-500 hover:text-red-400 text-sm px-3 py-1"
              >
                Remove
              </button>
            </div>
            
            {/* Simulated Waveform Visual */}
            <div className="w-full h-24 flex items-end justify-between gap-1 mb-6 opacity-60">
              {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-full bg-brand-500 rounded-t-sm transition-all duration-300"
                  style={{ 
                    height: `${Math.max(10, Math.random() * 100)}%`,
                    opacity: isPlaying ? 0.8 : 0.3
                  }}
                />
              ))}
            </div>
            
            <audio 
              ref={audioRef} 
              src={audioPreview || undefined} 
              onEnded={() => setIsPlaying(false)} 
              className="hidden" 
            />
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="audio/*" 
          className="hidden" 
        />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                STEP 3: CONFIG                              */
/* -------------------------------------------------------------------------- */

interface Step3Props {
  config: Pick<AppState, 'selectedStyleId' | 'intensity' | 'duration' | 'motionPrompt'>;
  onUpdate: (key: string, value: any) => void;
}

export const Step3Config: React.FC<Step3Props> = ({ config, onUpdate }) => {
  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto animate-fade-in pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">Choreography & Style</h2>
        <p className="text-gray-400">Direct the motion and aesthetics of your loop.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Col: Style & Motion */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Motion Prompt Input */}
          <div className="bg-dark-surface p-5 rounded-xl border border-dark-border">
             <label className="text-white font-semibold mb-2 flex items-center gap-2">
                <Film size={18} className="text-brand-400" /> 
                Motion Description
             </label>
             <textarea 
                className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all text-sm"
                rows={3}
                placeholder="Describe the dance or motion (e.g., 'Robot head banging', 'Slow psychedelic zoom', 'Glitchy twitching')"
                value={config.motionPrompt}
                onChange={(e) => onUpdate('motionPrompt', e.target.value)}
             />
             <p className="text-[11px] text-gray-500 mt-2">
               The AI will analyze your image and this prompt to generate specific dance frames.
             </p>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <label className="text-white font-semibold flex items-center gap-2">
              <Wand2 size={18} className="text-purple-400" /> Art Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_PRESETS.map((style) => (
                <div
                  key={style.id}
                  onClick={() => onUpdate('selectedStyleId', style.id)}
                  className={`
                    cursor-pointer rounded-xl p-3 border-2 transition-all duration-200 relative overflow-hidden flex items-center gap-3
                    ${config.selectedStyleId === style.id 
                      ? 'border-brand-500 bg-brand-900/20 ring-1 ring-brand-500/50' 
                      : 'border-dark-border bg-dark-surface hover:border-gray-600'}
                  `}
                >
                   <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                     <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="min-w-0">
                     <p className="font-medium text-sm text-white truncate">{style.name}</p>
                     <p className="text-[10px] text-gray-500 leading-tight truncate">Preset</p>
                   </div>
                  {config.selectedStyleId === style.id && (
                    <div className="absolute top-2 right-2 text-brand-500">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Sliders */}
        <div className="md:col-span-5 space-y-6 bg-dark-surface p-6 rounded-xl border border-dark-border h-fit">
           {/* Intensity */}
           <div>
            <div className="flex justify-between mb-2">
              <label className="text-white font-medium flex items-center gap-2 text-sm">
                <Zap size={16} className="text-yellow-400" /> Reactivity
              </label>
              <span className="text-brand-300 text-sm">{config.intensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={config.intensity}
              onChange={(e) => onUpdate('intensity', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <p className="text-[11px] text-gray-500 mt-2 leading-tight">
              Sensitivity to beat detection. Higher values trigger motion on subtler sounds.
            </p>
           </div>

           {/* Duration */}
           <div>
            <div className="flex justify-between mb-2">
              <label className="text-white font-medium text-sm">Duration</label>
              <span className="text-brand-300 text-sm">{config.duration}s</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={config.duration}
              onChange={(e) => onUpdate('duration', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-[11px] text-gray-500">Max 30s (Free)</p>
              <span className="text-[10px] bg-brand-900 text-brand-200 px-1.5 py-0.5 rounded border border-brand-700">
                {Math.ceil(config.duration / 5) * 5} Credits
              </span>
            </div>
           </div>
        </div>
      </div>
    </div>
  );
};