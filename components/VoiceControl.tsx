import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Activity } from 'lucide-react';

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

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.interimResults = false;

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
        setError("Microphone error");
        setTimeout(() => setError(null), 3000);
      };

      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const cmd = event.results[current][0].transcript.toLowerCase();
        setTranscript(cmd);
        processCommand(cmd);
        
        // Clear transcript after a delay
        setTimeout(() => setTranscript(''), 3000);
      };

      setRecognition(recognitionInstance);
    } else {
      setError("Browser not supported");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processCommand = useCallback((cmd: string) => {
    let relayId = -1;
    if (cmd.includes('relay 1') || cmd.includes('one')) relayId = 0;
    else if (cmd.includes('relay 2') || cmd.includes('two')) relayId = 1;
    else if (cmd.includes('relay 3') || cmd.includes('three')) relayId = 2;
    else if (cmd.includes('relay 4') || cmd.includes('four')) relayId = 3;

    if (relayId !== -1) {
      if (cmd.includes('on') || cmd.includes('start')) {
        onCommand(relayId, 'on');
      } else if (cmd.includes('off') || cmd.includes('stop')) {
        onCommand(relayId, 'off');
      }
    }
  }, [onCommand]);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (error === "Browser not supported") return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
      {transcript && (
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm mb-2 animate-fade-in">
          "{transcript}"
        </div>
      )}
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm mb-2">
          {error}
        </div>
      )}
      
      <button
        onClick={toggleListening}
        className={`
          relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300
          ${isListening ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-blue-600 hover:bg-blue-700'}
        `}
      >
        {isListening ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-red-500 animate-ping opacity-75"></span>
            <Activity className="w-8 h-8 text-white relative z-10" />
          </>
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
    </div>
  );
};

export default VoiceControl;