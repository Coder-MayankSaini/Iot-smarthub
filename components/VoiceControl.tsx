import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, Check, Zap } from 'lucide-react';

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

  // Store onCommand in a ref
  const onCommandRef = React.useRef(onCommand);
  // Ref to track if we should auto-restart (Always Listening mode)
  const isAlwaysListeningRef = useRef(false);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true; // Enable continuous listening
      recognitionInstance.lang = 'en-US';
      recognitionInstance.interimResults = false;

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setError(null);
        setFeedback(null);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
        // Auto-restart if we are in "Always Listening" mode
        if (isAlwaysListeningRef.current) {
             // Small delay to prevent CPU hogging if it crashes repeatedly
             setTimeout(() => {
                 try {
                     recognitionInstance.start();
                 } catch (e) {
                     console.log("Restart ignored", e);
                 }
             }, 200);
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech error", event.error);
        if (event.error === 'not-allowed') {
            setError("Microphone access denied");
            isAlwaysListeningRef.current = false; // Stop loop if denied
        } else if (event.error === 'no-speech') {
            // Ignore no-speech errors visually
        } else {
           // Other errors
        }
      };

      recognitionInstance.onresult = (event: any) => {
        // Handle continuous results
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                const cmd = event.results[i][0].transcript.toLowerCase().trim();
                console.log("Voice input:", cmd);
                setTranscript(cmd);
                
                // Check for Wake Word
                if (checkForWakeWord(cmd)) {
                    setFeedback("I'm listening...");
                    // If the wake word is present, process the whole string for commands
                    // E.g. "Hey Mewmew turn on light"
                    processCommand(cmd, onCommandRef.current);
                } else {
                    // Optional: Log ignored commands
                    // console.log("Ignored (No wake word)");
                }

                setTimeout(() => setTranscript(''), 3000);
            }
        }
      };

      setRecognition(recognitionInstance);
    } else {
      setIsSupported(false);
      setError("Browser not supported");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkForWakeWord = (text: string): boolean => {
      // Wake word variations
      const patterns = [
          /hey\s+mew\s*mew/i,
          /hey\s+mu\s*mu/i,
          /hey\s+new\s*new/i,
          /hey\s+meow\s*meow/i,
          /hi\s+mew\s*mew/i
      ];
      return patterns.some(p => p.test(text));
  };

  const processCommand = (cmd: string, commandFn: (relayId: number, action: 'on' | 'off') => void) => {
    let relayId = -1;
    let targetName = 'Device';

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
      // Enhanced OFF detection
      const isOff = /\boff\b/.test(cmd) || /\bof\b/.test(cmd) || cmd.includes('stop') || cmd.includes('kill') || cmd.includes('deactivate') || cmd.includes('shutdown');
      
      // Enhanced ON detection
      const isOn = /\bon\b/.test(cmd) || cmd.includes('start') || cmd.includes('active') || cmd.includes('enable') || cmd.includes('engage');

      if (isOff) {
        commandFn(relayId, 'off');
        setFeedback(`Turning OFF ${targetName}`);
        setTimeout(() => setFeedback(null), 3000);
      } else if (isOn) {
        commandFn(relayId, 'on');
        setFeedback(`Turning ON ${targetName}`);
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
      alert("Voice control requires a browser like Google Chrome.");
      return;
    }
    if (!recognition) return;

    if (isListening) {
      // Stop
      isAlwaysListeningRef.current = false;
      recognition.stop();
    } else {
      // Start Always Listening
      isAlwaysListeningRef.current = true;
      recognition.start();
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
            {feedback === "I'm listening..." ? <Zap className="w-4 h-4 fill-current" /> : <Check className="w-4 h-4" />}
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
              ? 'bg-purple-600 hover:bg-purple-700 scale-110 shadow-purple-500/50' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/50'}
        `}
      >
        {isListening ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-purple-500 animate-ping opacity-75"></span>
            <Mic className="w-8 h-8 text-white relative z-10" />
          </>
        ) : !isSupported ? (
          <MicOff className="w-8 h-8 text-slate-200" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
      {isListening && <div className="text-xs font-bold text-purple-600 bg-white px-2 py-1 rounded-full shadow-sm mt-1">Listening for "Hey Mewmew"</div>}
    </div>
  );
};

export default VoiceControl;
