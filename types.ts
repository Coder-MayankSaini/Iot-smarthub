export interface Relay {
  id: number;
  name: string;
  state: boolean; // true = ON, false = OFF
  isLoading: boolean;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface AppSettings {
  ipAddress: string;
  useDemoMode: boolean;
}

export interface EnergyData {
  time: string;
  usage: number;
}