import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EnergyData } from '../types';

interface EnergyChartProps {
  data: EnergyData[];
}

const EnergyChart: React.FC<EnergyChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Power Consumption (Simulated)</h3>
        <div className="flex gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Live</span>
        </div>
      </div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#64748b', fontSize: 12}}
                dy={10}
            />
            <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#64748b', fontSize: 12}}
            />
            <Tooltip 
                contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                itemStyle={{color: '#fff'}}
                labelStyle={{color: '#94a3b8'}}
            />
            <Area 
                type="monotone" 
                dataKey="usage" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorUsage)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnergyChart;