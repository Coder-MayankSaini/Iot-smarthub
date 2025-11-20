import React from 'react';
import { Power, Lightbulb, Zap, Fan } from 'lucide-react';
import { Relay } from '../types';

interface RelayCardProps {
  relay: Relay;
  onToggle: (id: number) => void;
}

const RelayCard: React.FC<RelayCardProps> = ({ relay, onToggle }) => {
  
  const getIcon = (id: number) => {
    switch(id) {
      case 0: return <Lightbulb className={`w-6 h-6 ${relay.state ? 'text-yellow-400' : 'text-slate-400'}`} />;
      case 1: return <Fan className={`w-6 h-6 ${relay.state ? 'text-blue-400' : 'text-slate-400'}`} />;
      case 2: return <Zap className={`w-6 h-6 ${relay.state ? 'text-purple-400' : 'text-slate-400'}`} />;
      default: return <Power className={`w-6 h-6 ${relay.state ? 'text-green-400' : 'text-slate-400'}`} />;
    }
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border
      ${relay.state 
        ? 'bg-white border-blue-100 shadow-lg shadow-blue-100/50' 
        : 'bg-slate-50 border-slate-200 shadow-sm'}
    `}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl transition-colors duration-300 ${relay.state ? 'bg-slate-900' : 'bg-slate-200'}`}>
          {getIcon(relay.id)}
        </div>
        <button
          onClick={() => onToggle(relay.id)}
          disabled={relay.isLoading}
          className={`
            relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${relay.state ? 'bg-blue-600' : 'bg-slate-300'}
            ${relay.isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-sm
              ${relay.state ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-slate-800">{relay.name}</h3>
        <p className="text-sm text-slate-500 mt-1">
          {relay.isLoading ? 'Syncing...' : relay.state ? 'Active' : 'Inactive'}
        </p>
      </div>

      {/* Decorative background blur */}
      {relay.state && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
      )}
    </div>
  );
};

export default RelayCard;