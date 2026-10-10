'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Flashlight, Camera, AlertCircle, RefreshCw, KeyRound, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import jsQR from 'jsqr';

interface OwnerScannerScreenProps {
  onBack: () => void;
  onScanResult: (rawPayload: string) => void;
  isProcessing?: boolean;
}

export const OwnerScannerScreen: React.FC<OwnerScannerScreenProps> = ({
  onBack,
  onScanResult,
  isProcessing = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Initialize camera stream ONLY when scanner screen mounts
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      setCameraState('requesting');
      setErrorMessage(null);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraState('unavailable');
          setErrorMessage('Camera access is not supported on this browser or platform.');
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability on the primary video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
            if (capabilities.torch) {
              setHasTorch(true);
            }
          } catch {
            // torch capabilities not supported
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        setCameraState('active');
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Camera request error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraState('denied');
          setErrorMessage('Camera permission was denied. Please allow camera access in your device or app permissions.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraState('unavailable');
          setErrorMessage('No camera device detected on this hardware.');
        } else {
          setCameraState('unavailable');
          setErrorMessage(err.message || 'Unable to access camera. Please check permissions.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      // Clean up camera stream and animation frame on unmount
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Frame processing loop using requestAnimationFrame + jsQR
  useEffect(() => {
    if (cameraState !== 'active' || isProcessing) return;

    let isScanningActive = true;

    const scanFrame = () => {
      if (!isScanningActive || isProcessing) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data.trim()) {
            isScanningActive = false;
            // Trigger haptic vibration on physical device
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(80); } catch {}
            }
            // Trigger scan callback (parent prevents duplicates via isProcessing)
            onScanResult(code.data.trim());
            return;
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanningActive = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [cameraState, isProcessing, onScanResult]);

  // Toggle hardware flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || isProcessing) return;
    onScanResult(manualCode.trim());
  };

  return (
    <div className="h-full flex flex-col justify-between bg-slate-950 text-white relative overflow-hidden select-none animate-fade-in font-sans">
      
      {/* Invisible Canvas for QR image analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Bar */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-30 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition-all active:scale-95 text-xs font-black"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Scanner</span>
        </button>

        <div className="text-center">
          <h2 className="text-xs font-black uppercase tracking-wider text-white">QR Pass Scanner</h2>
          <span className="text-[10px] text-emerald-400 font-bold">Meenakshi Smart Lot</span>
        </div>

        {hasTorch ? (
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-xl transition-all ${
              isTorchOn ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Flashlight"
          >
            <Flashlight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Viewport & Camera Stage */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        
        {/* Live Video Element */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          muted
          playsInline
        />

        {/* ACTIVE CAMERA VIEW: Optical Target HUD Overlay */}
        {cameraState === 'active' && (
          <div className="relative z-10 flex flex-col items-center pointer-events-none">
            
            {/* Centered QR Scanning Frame */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl relative border-2 border-emerald-400/50 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex items-center justify-center">
              
              {/* Corner Targets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl -mb-1 -mr-1" />

              {/* Animated Emerald Scanline */}
              {!isProcessing && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-md shadow-emerald-400" />
              )}

              {/* Processing Overlay inside Target Box */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-3xl flex flex-col items-center justify-center space-y-2 pointer-events-auto backdrop-blur-xs">
                  <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-black text-emerald-300">Validating Pass...</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-xs font-extrabold text-slate-200 bg-slate-950/80 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
              Align Driver&apos;s QR Code inside the frame
            </p>
          </div>
        )}

        {/* CAMERA REQUESTING STATE */}
        {cameraState === 'requesting' && (
          <div className="text-center p-6 space-y-3 z-10 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-slate-300">Requesting Camera Access...</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Camera will only be used while this verification screen is open.
            </p>
          </div>
        )}

        {/* PERMISSION DENIED STATE */}
        {cameraState === 'denied' && (
          <div className="text-center p-6 space-y-4 z-10 max-w-xs mx-auto bg-slate-900/90 rounded-3xl border border-rose-500/40 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">Camera Access Denied</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {errorMessage || 'Camera permission was denied. Please allow camera permissions in your settings to scan passes.'}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Permission</span>
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Enter Code Manually
              </button>
            </div>
          </div>
        )}

        {/* CAMERA UNAVAILABLE STATE */}
        {cameraState === 'unavailable' && (
          <div className="text-center p-6 space-y-4 z-10 max-w-xs mx-auto bg-slate-900/90 rounded-3xl border border-amber-500/40 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">Camera Unavailable</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {errorMessage || 'No camera hardware found or device camera is currently in use.'}
              </p>
            </div>
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all"
            >
              Enter Pass Code Manually
            </button>
          </div>
        )}

      </div>

      {/* Bottom Controls & Demo Fast Testing Deck */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 z-30 space-y-3">
        
        {/* Manual Code Input Bar */}
        {showManualInput ? (
          <form onSubmit={handleManualSubmit} className="flex items-center space-x-2 animate-scale-in">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter Pass Code (e.g. IDM-82931)"
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowManualInput(true)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-emerald-400 font-bold transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter Code Manually</span>
            </button>
            <span className="text-[10px] text-slate-500 font-medium">Powered by iDAM Optical Guard</span>
          </div>
        )}

        {/* Demo Fast-Track Testing Buttons (For Simulator & Testing) */}
        <div className="pt-1 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Demo Quick-Scan Scenarios</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-black">
            <button
              type="button"
              onClick={() => onScanResult('IDAM:v2:demo_idm_82931_loc-1')}
              disabled={isProcessing}
              className="p-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 truncate text-left transition-all"
              title="IDM-82931 Confirmed Booking"
            >
              ✓ Valid Pass (82931)
            </button>
            <button
              type="button"
              onClick={() => onScanResult('IDAM:v2:demo_idm_12049_loc-2')}
              disabled={isProcessing}
              className="p-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 truncate text-left transition-all"
              title="IDM-12049 Wrong Location"
            >
              ⚠️ Wrong Loc (12049)
            </button>
            <button
              type="button"
              onClick={() => onScanResult('IDAM:v2:demo_idm_94102_loc-1')}
              disabled={isProcessing}
              className="p-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-blue-300 truncate text-left transition-all"
              title="IDM-94102 Already Active"
            >
              ● Already Active (94102)
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
