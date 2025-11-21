import React, { useState, useCallback } from 'react';
import { Zap, Layers, Image as ImageIcon, Music, CheckCircle } from 'lucide-react';
import { AppState, AppStep, DEFAULT_STATE, StylePreset } from './types';
import { STYLE_PRESETS } from './constants';
import { Step1Image, Step2Audio, Step3Config } from './components/Steps';
import { Step4Preview } from './components/Step4Preview';
import { generateDanceFrames, fileToGenericBase64 } from './services/gemini';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);

  const handleImageUpload = async (file: File) => {
    const previewUrl = await fileToGenericBase64(file);
    setAppState(prev => ({
      ...prev,
      imageFile: file,
      imagePreviewUrl: previewUrl,
      generatedFrames: [] 
    }));
  };

  const handleAudioUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setAppState(prev => ({
      ...prev,
      audioFile: file,
      audioPreviewUrl: previewUrl
    }));
  };

  const updateConfig = (key: string, value: any) => {
    setAppState(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!appState.imagePreviewUrl || !appState.audioFile) return;
    
    setAppState(prev => ({ ...prev, isGenerating: true, step: AppStep.PREVIEW }));

    const style = STYLE_PRESETS.find(s => s.id === appState.selectedStyleId);
    
    // Generate using new AI Director pipeline
    const newFrames = await generateDanceFrames(
      appState.imagePreviewUrl, 
      style?.promptModifier || 'artistic style',
      appState.motionPrompt
    );

    setAppState(prev => ({
      ...prev,
      generatedFrames: newFrames,
      isGenerating: false
    }));
  };

  const canProceed = () => {
    switch (appState.step) {
      case AppStep.UPLOAD_IMAGE: return !!appState.imageFile;
      case AppStep.UPLOAD_AUDIO: return !!appState.audioFile;
      case AppStep.CONFIGURE: return true; 
      default: return false;
    }
  };

  const nextStep = () => {
    if (appState.step === AppStep.CONFIGURE) {
      handleGenerate();
    } else {
      setAppState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const goToStep = (step: AppStep) => {
    if (step > AppStep.UPLOAD_IMAGE && !appState.imageFile) return;
    if (step > AppStep.UPLOAD_AUDIO && !appState.audioFile) return;
    setAppState(prev => ({ ...prev, step }));
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col font-sans selection:bg-brand-500/30">
      <header className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-gradient-to-tr from-brand-600 to-blue-600 p-1.5 rounded-lg">
              <Layers size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">RhythmLoop<span className="text-brand-400">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-2 bg-dark-bg px-3 py-1.5 rounded-full border border-dark-border">
               <Zap size={14} className="text-yellow-400 fill-yellow-400" />
               <span className="text-sm font-medium text-gray-300">{appState.credits} Credits</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 ring-2 ring-dark-bg"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-1 bg-dark-surface w-full md:hidden">
          <div 
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${(appState.step / 4) * 100}%` }}
          />
        </div>

        <div className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col">
          <div className="hidden md:flex justify-center mb-12 mt-4">
            <div className="flex items-center gap-4">
               {[
                 { id: AppStep.UPLOAD_IMAGE, icon: ImageIcon, label: 'Image' },
                 { id: AppStep.UPLOAD_AUDIO, icon: Music, label: 'Audio' },
                 { id: AppStep.CONFIGURE, icon: Zap, label: 'Style' },
                 { id: AppStep.PREVIEW, icon: CheckCircle, label: 'Render' }
               ].map((item, idx) => {
                 const isActive = appState.step === item.id;
                 const isDone = appState.step > item.id;
                 return (
                   <div key={item.id} className="flex items-center">
                      <button 
                        onClick={() => goToStep(item.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                          ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50' : ''}
                          ${isDone ? 'text-brand-400 bg-brand-900/10 hover:bg-brand-900/20' : ''}
                          ${!isActive && !isDone ? 'text-gray-600 cursor-not-allowed' : ''}
                        `}
                        disabled={!isDone && !isActive}
                      >
                        <item.icon size={16} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                      {idx < 3 && <div className="w-8 h-0.5 bg-dark-border mx-2" />}
                   </div>
                 )
               })}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {appState.step === AppStep.UPLOAD_IMAGE && (
              <Step1Image imagePreview={appState.imagePreviewUrl} onUpload={handleImageUpload} />
            )}
            {appState.step === AppStep.UPLOAD_AUDIO && (
              <Step2Audio audioFile={appState.audioFile} audioPreview={appState.audioPreviewUrl} onUpload={handleAudioUpload} />
            )}
            {appState.step === AppStep.CONFIGURE && (
              <Step3Config config={appState} onUpdate={updateConfig} />
            )}
            {appState.step === AppStep.PREVIEW && (
              <Step4Preview state={appState} onGenerateMore={handleGenerate} />
            )}
          </div>
        </div>

        {appState.step !== AppStep.PREVIEW && (
          <div className="border-t border-dark-border bg-dark-surface/30 p-6">
            <div className="max-w-xl mx-auto flex justify-between items-center">
              <button 
                onClick={() => goToStep(appState.step - 1)}
                disabled={appState.step === 1}
                className="px-6 py-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-0 transition-colors font-medium"
              >
                Back
              </button>
              
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={`
                  px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all transform
                  ${canProceed() 
                    ? 'bg-brand-600 hover:bg-brand-500 hover:scale-105 shadow-brand-900/50' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                `}
              >
                {appState.step === AppStep.CONFIGURE ? 'Generate Loop' : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;