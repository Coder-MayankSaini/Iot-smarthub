import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Wifi, Loader2, AlertTriangle, Monitor, Info } from 'lucide-react';
import { Relay, ConnectionStatus, AppSettings, EnergyData } from './types';
import RelayCard from './components/RelayCard';
import VoiceControl from './components/VoiceControl';
import EnergyChart from './components/EnergyChart';
import { fetchRelayStatus, toggleRelayRequest, updateLcdText } from './services/esp32';

const DEFAULT_IP = "172.16.234.150";

const App: React.FC = () => {
  // App State
  const [settings, setSettings] = useState<AppSettings>({
    ipAddress: DEFAULT_IP,
    useDemoMode: true, // Default to demo so user sees UI immediately
  });
  
  const [relays, setRelays] = useState<Relay[]>([
    { id: 0, name: 'Living Room Light', state: false, isLoading: false },
    { id: 1, name: 'Bedroom Light', state: false, isLoading: false },
    { id: 2, name: 'Kitchen Light', state: false, isLoading: false },
    { id: 3, name: 'Bedroom Fan', state: false, isLoading: false },
  ]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  
  // New state to track if we are online but blocked by CORS (cannot read status)
  const [isCorsRestricted, setIsCorsRestricted] = useState(false);
  
  // LCD State
  const [lcdText, setLcdText] = useState('');
  const [isSendingLcd, setIsSendingLcd] = useState(false);

  // Generate mock energy data
  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const data: EnergyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          usage: Math.floor(Math.random() * 40) + 20 + (relays.filter(r => r.state).length * 50),
        });
      }
      return data;
    };
    setEnergyData(generateData());

    const interval = setInterval(() => {
      setEnergyData(prev => {
        const newData = [...prev.slice(1)];
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          usage: Math.floor(Math.random() * 40) + 20 + (relays.filter(r => r.state).length * 50),
        });
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [relays]); // Update base load when relays change

  // Polling Logic
  const syncStatus = useCallback(async () => {
    if (settings.useDemoMode) {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setIsCorsRestricted(false);
      return;
    }

    // Avoid flickering "Connecting..." if we are just polling in background, 
    // but show it if we were offline.
    if (connectionStatus === ConnectionStatus.ERROR || connectionStatus === ConnectionStatus.DISCONNECTED) {
       setConnectionStatus(ConnectionStatus.CONNECTING);
    }

    try {
      const states = await fetchRelayStatus(settings.ipAddress);
      
      if (states === null) {
        // Reachable, but CORS blocked reading.
        // We consider this "Connected" so the user can use buttons, but we flag it as restricted.
        setIsCorsRestricted(true);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        // We do NOT update 'relays' state here, preserving our optimistic local state.
      } else {
        // Fully functional
        setIsCorsRestricted(false);
        setRelays(prev => prev.map((r, idx) => ({
          ...r,
          state: states[idx] ?? false,
          isLoading: false
        })));
        setConnectionStatus(ConnectionStatus.CONNECTED);
      }
    } catch (err) {
      console.error(err);
      setConnectionStatus(ConnectionStatus.ERROR);
      setIsCorsRestricted(false);
    }
  }, [settings.ipAddress, settings.useDemoMode, connectionStatus]);

  useEffect(() => {
    syncStatus();
    const interval = setInterval(syncStatus, 5000);
    return () => clearInterval(interval);
  }, [syncStatus]);

  // Handlers
  const handleToggle = async (id: number) => {
    // Optimistic UI update
    setRelays(prev => prev.map(r => r.id === id ? { ...r, state: !r.state } : r));

    if (!settings.useDemoMode) {
      try {
        await toggleRelayRequest(settings.ipAddress, id);
        // If we are fully connected, we could sync immediately.
        // If restricted, we rely on the optimistic update above.
        if (!isCorsRestricted) {
             setTimeout(syncStatus, 500); 
        }
      } catch (error) {
        // Revert on failure
        setRelays(prev => prev.map(r => r.id === id ? { ...r, state: !r.state } : r));
        alert("Failed to toggle relay. Check connection.");
      }
    }
  };

  const handleLcdSubmit = async () => {
    if (!lcdText.trim()) return;
    
    setIsSendingLcd(true);
    try {
      if (!settings.useDemoMode) {
        await updateLcdText(settings.ipAddress, lcdText);
      } else {
        // Simulate delay in demo mode
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setLcdText('');
    } catch (error) {
      console.error(error);
      alert("Failed to send message to LCD");
    } finally {
      setIsSendingLcd(false);
    }
  };

  const handleVoiceCommand = (id: number, action: 'on' | 'off') => {
    const relay = relays.find(r => r.id === id);
    if (relay) {
      const shouldToggle = (action === 'on' && !relay.state) || (action === 'off' && relay.state);
      if (shouldToggle) {
        handleToggle(id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SmartHub</h1>
              <p className="text-xs text-slate-500 hidden sm:block">ESP32 Controller</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
              connectionStatus === ConnectionStatus.CONNECTED 
                ? (isCorsRestricted ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                : connectionStatus === ConnectionStatus.ERROR
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === ConnectionStatus.CONNECTED 
                    ? (isCorsRestricted ? 'bg-yellow-500' : 'bg-emerald-500')
                    : connectionStatus === ConnectionStatus.ERROR ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="hidden sm:inline">
                {settings.useDemoMode ? 'Demo Mode' : 
                 connectionStatus === ConnectionStatus.CONNECTED ? (isCorsRestricted ? 'Restricted' : 'Online') : 
                 connectionStatus === ConnectionStatus.ERROR ? 'Offline' : 'Connecting'}
              </span>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Error Banner */}
        {!settings.useDemoMode && connectionStatus === ConnectionStatus.ERROR && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Connection Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                Could not reach ESP32 at <strong>{settings.ipAddress}</strong>. 
                Ensure you are on the same network or check CORS settings.
                <br/>
                <button 
                  onClick={() => setSettings(s => ({...s, useDemoMode: true}))}
                  className="underline font-medium mt-1 hover:text-red-900"
                >
                  Switch to Demo Mode
                </button> to test UI.
              </p>
            </div>
          </div>
        )}

        {/* Restricted Access Warning */}
        {!settings.useDemoMode && isCorsRestricted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Partial Connection</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Commands are working, but relay status cannot be read due to browser security (CORS). 
                Buttons will update blindly. Update ESP32 code to fix full sync.
              </p>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <section>
          <EnergyChart data={energyData} />
        </section>

        {/* LCD Control Section */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Monitor className="w-6 h-6 text-slate-700" />
            LCD Messenger
          </h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Text (Max 32 chars)
                </label>
                <input 
                  type="text" 
                  maxLength={32}
                  value={lcdText}
                  onChange={(e) => setLcdText(e.target.value)}
                  placeholder="Enter message to display..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLcdSubmit();
                    }
                  }}
                />
              </div>
              <button 
                onClick={handleLcdSubmit}
                disabled={isSendingLcd || !lcdText.trim()}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-w-[140px] h-[42px]"
              >
                {isSendingLcd ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Display'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Sends text to the connected I2C LCD display.
            </p>
          </div>
        </section>

        {/* Relays Grid */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            Device Control
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relays.map((relay) => (
              <RelayCard 
                key={relay.id} 
                relay={relay} 
                onToggle={handleToggle} 
              />
            ))}
          </div>
        </section>
      </main>

      {/* Voice Control Overlay */}
      <VoiceControl onCommand={handleVoiceCommand} />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ESP32 IP Address</label>
                <input 
                  type="text" 
                  value={settings.ipAddress}
                  onChange={(e) => setSettings(s => ({...s, ipAddress: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="block font-medium text-slate-900">Demo Mode</span>
                  <span className="text-xs text-slate-500">Simulate connection for UI testing</span>
                </div>
                <button 
                  onClick={() => setSettings(s => ({...s, useDemoMode: !s.useDemoMode}))}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${settings.useDemoMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.useDemoMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  syncStatus();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;