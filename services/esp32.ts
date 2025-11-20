import { Relay } from '../types';

// The ESP32 C++ code returns plain HTML strings. We must parse them.
// Example response: "Relay 1: ON <a href='/toggle?r=0'>Toggle</a><br>..."

export const parseRelayStatus = (html: string): boolean[] => {
  const states: boolean[] = [false, false, false, false];
  
  // Regex to match "Relay X: ON" or "Relay X: OFF"
  // Note: The C++ code uses 1-based indexing in display "Relay 1", but 0-based for logic
  for (let i = 0; i < 4; i++) {
    const regex = new RegExp(`Relay ${i + 1}: (ON|OFF)`, 'i');
    const match = html.match(regex);
    if (match) {
      states[i] = match[1].toUpperCase() === 'ON';
    }
  }
  return states;
};

export const fetchRelayStatus = async (ip: string): Promise<boolean[]> => {
  try {
    // In a real scenario without a proxy, this might hit CORS issues if the ESP32
    // doesn't send Access-Control-Allow-Origin headers.
    // For this demo, we assume the user might use a proxy or the ESP32 is configured correctly.
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`http://${ip}/`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors', // This requires ESP32 to handle CORS headers, or use 'no-cors' (opaque)
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return parseRelayStatus(text);
  } catch (error) {
    console.error("Failed to fetch ESP32 status", error);
    throw error;
  }
};

export const toggleRelayRequest = async (ip: string, relayIndex: number): Promise<void> => {
  // The C++ code expects /toggle?r=0
  // It returns a 303 redirect to /, which fetch follows automatically usually.
  try {
    await fetch(`http://${ip}/toggle?r=${relayIndex}`, {
      method: 'GET',
      mode: 'no-cors', // Often fire-and-forget for IoT if CORS is strict
    });
  } catch (error) {
    console.error(`Failed to toggle relay ${relayIndex}`, error);
    throw error;
  }
};

// Mock data generator for demo mode
export const getMockStatus = (currentRelays: Relay[]): Relay[] => {
  return currentRelays.map(r => ({ ...r, isLoading: false }));
};