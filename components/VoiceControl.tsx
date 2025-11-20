import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Activity, Check } from 'lucide-react';

interface VoiceControlProps {
  onCommand: (relayId: number, action: 'on' | 'off') => void;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.interimResults = false;

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setError(null);
        setFeedback(null);
      };
      
      recognitionInstance.onend = () => setIsListening(false);
      
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
            setError("Microphone access denied");
        } else if (event.error === 'no-speech') {
            // Ignore no-speech errors visually, just stop listening
        } else {
            setError("Microphone error: " + event.error);
        }
        setTimeout(() => setError(null), 3000);
      };

      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const cmd = event.results[current][0].transcript.toLowerCase();
        console.log("Voice command received:", cmd);
        setTranscript(cmd);
        processCommand(cmd);
        
        // Clear transcript after a delay
        setTimeout(() => setTranscript(''), 3000);
      };

      setRecognition(recognitionInstance);
    } else {
      setIsSupported(false);
      setError("Browser not supported");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processCommand = useCallback((cmd: string) => {
    let relayId = -1;
    let targetName = 'Device';

    // Updated parsing logic to match new App names
    // Relay 0: Living Room Light
    if (cmd.includes('relay 1') || cmd.includes('one') || cmd.includes('living room')) { 
        relayId = 0; 
        targetName = 'Living Room Light';
    } 
    // Relay 1: Bedroom Light
    else if (cmd.includes('relay 2') || cmd.includes('two') || cmd.includes('bedroom light')) { 
        relayId = 1; 
        targetName = 'Bedroom Light';
    } 
    // Relay 2: Kitchen Light
    else if (cmd.includes('relay 3') || cmd.includes('three') || cmd.includes('kitchen')) { 
        relayId = 2; 
        targetName = 'Kitchen Light';
    } 
    // Relay 3: Bedroom Fan
    else if (cmd.includes('relay 4') || cmd.includes('four') || cmd.includes('fan')) { 
        relayId = 3; 
        targetName = 'Bedroom Fan';
    }

    if (relayId !== -1) {
      if (cmd.includes('on') || cmd.includes('start') || cmd.includes('active')) {
        onCommand(relayId, 'on');
        setFeedback(`Turning ON ${targetName}`);
        setTimeout(() => setFeedback(null), 3000);
      } else if (cmd.includes('off') || cmd.includes('stop') || cmd.includes('kill')) {
        onCommand(relayId, 'off');
        setFeedback(`Turning OFF ${targetName}`);
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  }, [onCommand]);

  const toggleListening = () => {
    if (!isSupported) {
      alert("Voice control requires a browser like Google Chrome, Edge, or Safari.");
      return;
    }

    if (!recognition) return;

    try {
      if (isListening) {
        recognition.stop();
      } else {
        setError(null);
        setFeedback(null);
        recognition.start();
      }
    } catch (err) {
      console.error("Recognition start/stop error", err);
      // Sometimes start() is called when already started
      setIsListening(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Messages Container */}
      <div className="pointer-events-auto flex flex-col items-end">
        {transcript && !feedback && (
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm mb-2 animate-fade-in backdrop-blur-md bg-opacity-90">
            "{transcript}"
          </div>
        )}
        
        {feedback && (
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm mb-2 flex items-center gap-2 backdrop-blur-md bg-opacity-90 animate-in slide-in-from-right-5 duration-300">
            <Check className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm mb-2 flex items-center gap-2 backdrop-blur-md bg-opacity-90">
             <span>{error}</span>
          </div>
        )}
      </div>
      
      {/* Main Button */}
      <button
        onClick={toggleListening}
        className={`
          pointer-events-auto
          relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300
          ${!isSupported 
            ? 'bg-slate-400 cursor-not-allowed grayscale' 
            : isListening 
              ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/50' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/50'}
        `}
      >
        {isListening ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-red-500 animate-ping opacity-75"></span>
            <Activity className="w-8 h-8 text-white relative z-10" />
          </>
        ) : !isSupported ? (
          <MicOff className="w-8 h-8 text-slate-200" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
    </div>
  );
};

export default VoiceControl;