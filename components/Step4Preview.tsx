import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Download, RefreshCcw, AlertTriangle, Loader2, Zap, Music } from 'lucide-react';
import { AppState, PoseType, GeneratedFrame } from '../types';

interface Step4Props {
  state: AppState;
  onGenerateMore: () => void;
}

export const Step4Preview: React.FC<Step4Props> = ({ state, onGenerateMore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio Graph Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Animation State Refs
  const requestRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);
  
  // Beat Detection State
  const energyHistoryRef = useRef<number[]>([]);
  
  // Choreography State
  // We now use a sequence index instead of hardcoded poses
  const sequenceIndexRef = useRef<number>(0); 
  const beatFlashRef = useRef<number>(0);
  
  // Component State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  
  const [poseImages, setPoseImages] = useState<Record<string, HTMLImageElement>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Asset Loading (Images)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const framesToLoad = state.generatedFrames.length > 0 
      ? state.generatedFrames 
      : state.imagePreviewUrl 
        ? [{ url: state.imagePreviewUrl, pose: 'base' as PoseType }] 
        : [];

    if (framesToLoad.length === 0) {
        setError("No images to render.");
        return;
    }

    setImagesReady(false);
    const newPoseMap: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    let isMounted = true;

    // Helper to verify if we are done
    const checkDone = () => {
        if (loadedCount === framesToLoad.length) {
            if (isMounted) {
                // Fallback: Map missing poses to base if needed
                const baseImg = newPoseMap['base'];
                if (baseImg) {
                    ['var1', 'var2', 'var3'].forEach(p => {
                        if (!newPoseMap[p]) newPoseMap[p] = baseImg;
                    });
                    setPoseImages(newPoseMap);
                    setImagesReady(true);
                } else {
                    setError("Failed to load base image.");
                }
            }
        }
    };

    framesToLoad.forEach((frame) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.src = frame.url;
      img.onload = () => {
        newPoseMap[frame.pose] = img;
        loadedCount++;
        checkDone();
      };
      img.onerror = (e) => {
        console.error(`Failed to load frame ${frame.pose}`, e);
        loadedCount++;
        checkDone();
      };
    });

    return () => { isMounted = false; };
  }, [state.generatedFrames, state.imagePreviewUrl]);

  // ---------------------------------------------------------------------------
  // 2. Audio Engine Initialization
  // ---------------------------------------------------------------------------
  const initAudio = useCallback(() => {
    if (audioRef.current && audioCtxRef.current?.state === 'running') {
        return true; // Already running
    }

    if (!state.audioPreviewUrl) {
        setError("Audio file is missing.");
        return false;
    }

    try {
        // Clean up old context if exists
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // High res for accurate low end
        analyser.smoothingTimeConstant = 0.8;

        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = state.audioPreviewUrl;
        audio.loop = true;
        // Important for mobile/Safari
        (audio as any).playsInline = true; 

        const dest = ctx.createMediaStreamDestination(); 

        // Create source only once
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination); // To speakers
        source.connect(dest); // To recorder

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        audioRef.current = audio;
        destRef.current = dest;
        sourceRef.current = source;

        audio.addEventListener('ended', () => setIsPlaying(false));
        
        setAudioReady(true);
        return true;
    } catch (err) {
        console.error("Audio init error:", err);
        setError("Could not initialize audio engine.");
        return false;
    }
  }, [state.audioPreviewUrl]);

  // ---------------------------------------------------------------------------
  // 3. Render Loop (The Choreographer)
  // ---------------------------------------------------------------------------
  const renderFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !imagesReady || !poseImages['base']) {
        requestRef.current = requestAnimationFrame(renderFrame);
        return;
    }

    // Handle High DPI
    const parent = containerRef.current;
    if (parent) {
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Resize if needed
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        }
    }

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // --- AUDIO ANALYSIS ---
    let isBeat = false;
    let bassLevel = 0; // 0.0 to 1.0
    
    if (analyserRef.current && (isPlaying || isRecording)) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate Bass Energy (40Hz - 150Hz)
        // SampleRate ~48000 / 2048 = ~23Hz per bin
        // Bins 2 to 8 roughly cover the kick area
        let bassSum = 0;
        const startBin = 2;
        const endBin = 8;
        for (let i = startBin; i < endBin; i++) {
            bassSum += dataArray[i];
        }
        bassLevel = (bassSum / (endBin - startBin)) / 255;

        // Dynamic Thresholding
        const historySize = 60; // ~1 second at 60fps
        energyHistoryRef.current.push(bassLevel);
        if (energyHistoryRef.current.length > historySize) {
            energyHistoryRef.current.shift();
        }

        // Calculate local average energy
        const avgEnergy = energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length;
        
        // Dynamic variance based on intensity slider
        const sensitivity = 1.5 - (state.intensity / 200); // 0.5 (sensitive) to 1.5 (dull)
        const threshold = avgEnergy * sensitivity;

        // Beat Trigger (Debounced 250ms)
        if (bassLevel > threshold && bassLevel > 0.3) {
            if (time - lastBeatTimeRef.current > 200) {
                isBeat = true;
                lastBeatTimeRef.current = time;
            }
        }
    }

    // --- SEQUENCER (Ping-Pong Loop) ---
    // This pattern ensures smooth transitions: Base -> Var1 -> Var2 -> Var3 -> Var2 -> Var1 -> Base
    const sequence: PoseType[] = ['base', 'var1', 'var2', 'var3', 'var2', 'var1'];
    
    if (isBeat) {
        beatFlashRef.current = 1.0;
        // Advance the sequence
        sequenceIndexRef.current = (sequenceIndexRef.current + 1) % sequence.length;
        
        // Occasional random stutter for dynamic feel (10% chance on beat)
        if (Math.random() < 0.1) {
             sequenceIndexRef.current = (sequenceIndexRef.current + 2) % sequence.length;
        }
    }

    const desiredPose = sequence[sequenceIndexRef.current];
    const img = poseImages[desiredPose] || poseImages['base'];

    // --- DRAWING ---
    
    // 1. Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Image with "Thump" Scale
    if (img) {
        // Thump calculation
        const thump = bassLevel * 0.05; // Max 5% scale
        const scale = Math.min(width / img.width, height / img.height) * (1 + thump);
        
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        // Center and apply slight shake on beat
        let shakeX = 0;
        let shakeY = 0;
        if (bassLevel > 0.6) {
            shakeX = (Math.random() - 0.5) * 10;
            shakeY = (Math.random() - 0.5) * 10;
        }

        const drawX = (width - drawW) / 2 + shakeX;
        const drawY = (height - drawH) / 2 + shakeY;

        ctx.save();
        ctx.translate(width/2, height/2);
        
        // Slight rotation based on bass for extra life
        const rotation = Math.sin(time / 500) * 0.01 + (bassLevel * 0.02 * (sequenceIndexRef.current % 2 === 0 ? 1 : -1));
        ctx.rotate(rotation);
        
        ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();
    }

    // 3. Beat Flash Overlay
    if (beatFlashRef.current > 0.01) {
        beatFlashRef.current *= 0.85; // Fast decay
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `rgba(255, 255, 255, ${beatFlashRef.current * 0.15})`;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
    }

    // 4. Mirrored Visualizer
    if (analyserRef.current && (isPlaying || isRecording)) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars = 32;
        const barWidth = width / bars / 2; // Split left/right
        const center = width / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        for (let i = 0; i < bars; i++) {
            // Logarithmic bin selection for better visual
            const binIndex = Math.floor(Math.pow(i / bars, 1.5) * (bufferLength / 2));
            const val = dataArray[binIndex];
            const barH = (val / 255) * (height * 0.25);

            // Right side
            ctx.rect(center + (i * barWidth), height - barH - 10, barWidth - 1, barH);
            // Left side
            ctx.rect(center - ((i + 1) * barWidth), height - barH - 10, barWidth - 1, barH);
        }
        ctx.fill();
    }

    requestRef.current = requestAnimationFrame(renderFrame);
  }, [imagesReady, poseImages, isPlaying, isRecording, state.intensity]);

  // Start Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [renderFrame]);

  // ---------------------------------------------------------------------------
  // 4. Interactions
  // ---------------------------------------------------------------------------
  const togglePlay = async () => {
    if (!audioRef.current) {
        if (!initAudio()) return;
    }
    
    if (!audioCtxRef.current || !audioRef.current) return;

    // Resume context if suspended (browser policy)
    if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
    }

    if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
    } else {
        audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => {
                console.error("Playback failed:", e);
                setError("Playback blocked. Please interact with the page.");
            });
    }
  };

  const handleDownload = async () => {
      // 1. Prepare Audio
      if (!audioRef.current) if (!initAudio()) return;
      if (!audioRef.current || !destRef.current || !canvasRef.current || !audioCtxRef.current) {
          setError("Engine not ready for export.");
          return;
      }

      setIsRecording(true);
      setDownloadProgress(0);

      // Reset playback
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false; 

      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

      // 2. Setup Recorder
      // 30 FPS for smoother video
      const canvasStream = canvasRef.current.captureStream(30); 
      const audioStream = destRef.current.stream;
      
      const combined = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioStream.getAudioTracks()
      ]);

      // Prefer VP9 for better quality/compression, fallback to default
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(combined, {
          mimeType,
          videoBitsPerSecond: 5000000 // 5Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          // Auto trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = `RhythmLoop_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          URL.revokeObjectURL(url);
          setIsRecording(false);
          
          // Restore loop state
          if (audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current.currentTime = 0;
          }
      };

      // 3. Start Recording Sequence
      recorder.start();
      audioRef.current.play();

      // 4. Monitor Progress
      const duration = state.duration;
      const interval = setInterval(() => {
          if (!audioRef.current) return;
          
          const p = (audioRef.current.currentTime / duration) * 100;
          setDownloadProgress(Math.min(99, p));
          
          if (audioRef.current.currentTime >= duration) {
              recorder.stop();
              audioRef.current.pause();
              clearInterval(interval);
              setDownloadProgress(100);
          }
      }, 100);
  };

  if (state.isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] w-full animate-fade-in">
        <RefreshCcw className="animate-spin text-brand-500 mb-6" size={64} />
        <h2 className="text-2xl font-bold text-white">Generating Animation</h2>
        <p className="text-gray-400 mt-2 text-center max-w-md">
            <span className="block font-semibold text-white mb-1">AI Director is planning your request...</span>
            Analyzing "{state.motionPrompt}" and creating frame variations.<br/>
            <span className="text-xs text-gray-600 mt-4 block">This takes about 15-20 seconds.</span>
        </p>
      </div>
    );
  }

  if (!imagesReady && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] w-full">
        <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
        <p className="text-gray-400">Preparing render engine...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto animate-fade-in pb-12">
      {error && (
        <div className="w-full bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle size={24} />
            <div className="flex-1 text-sm">{error}</div>
            <button onClick={() => window.location.reload()} className="text-xs underline hover:text-white">Reset App</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Canvas Container */}
        <div className="flex-1 flex flex-col gap-4">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-dark-border relative group aspect-video lg:aspect-auto lg:h-[500px]">
                <div ref={containerRef} className="w-full h-full relative flex items-center justify-center bg-dark-surface">
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                    
                    {isRecording && (
                        <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="text-brand-500 mb-4 animate-pulse">
                                <Zap size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-white">RENDERING VIDEO</h3>
                            <div className="w-64 h-2 bg-gray-800 rounded-full mt-6 overflow-hidden">
                                <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${downloadProgress}%` }} />
                            </div>
                            <p className="text-gray-400 mt-4 text-sm">Recording real-time output...</p>
                        </div>
                    )}
                </div>
                
                {!isRecording && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={togglePlay} 
                            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-white/20"
                        >
                            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
           {/* Export Card */}
           <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg">
             <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                 <Download size={20} className="text-brand-400" /> Export Video
             </h3>
             <p className="text-gray-500 text-xs mb-6">
                 Renders a {state.duration}s .webm video file with audio.
             </p>
             <button 
               onClick={handleDownload}
               disabled={isRecording || !imagesReady}
               className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                 ${isRecording 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50'}
               `}
             >
               {isRecording ? 'Rendering...' : 'Download Video'}
             </button>
           </div>

           {/* Assets Card */}
           <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg flex-1">
             <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                <Music size={14} />
                GENERATED SEQUENCE
             </h3>
             <div className="grid grid-cols-2 gap-2 mb-6">
                 {['base', 'var1', 'var2', 'var3'].map((key) => {
                     const img = poseImages[key];
                     const isLoaded = !!img;
                     return (
                        <div key={key} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900 group">
                            {isLoaded ? (
                                <img src={img.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-black/60 backdrop-blur-sm">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block text-center">{key}</span>
                            </div>
                        </div>
                     );
                 })}
             </div>
             <button 
                onClick={onGenerateMore} 
                disabled={state.isGenerating} 
                className="w-full bg-dark-bg hover:bg-gray-800 border border-gray-700 text-gray-300 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
             >
               <RefreshCcw size={16} className={state.isGenerating ? "animate-spin" : ""} /> 
               Regenerate Motion
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};