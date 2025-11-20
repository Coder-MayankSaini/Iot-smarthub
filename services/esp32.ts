import { Relay } from '../types';

// The ESP32 C++ code returns plain HTML strings. We must parse them.
// Example response: "Relay 1: ON <a href='/toggle?r=0'>Toggle</a><br>..."

// Helper to ensure we always use HTTP, not HTTPS, and handle raw IP input
const getBaseUrl = (ip: string): string => {
  // Remove any protocol if user typed it (http:// or https://) and remove trailing slashes
  const cleanIp = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `http://${cleanIp}`;
};

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
    const baseUrl = getBaseUrl(ip);
    
    // In a real scenario without a proxy, this might hit CORS issues if the ESP32
    // doesn't send Access-Control-Allow-Origin headers.
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors', // This requires ESP32 to send Access-Control-Allow-Origin header
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return parseRelayStatus(text);
  } catch (error) {
    console.error(`Failed to fetch ESP32 status from ${ip}. \nPossible causes:\n1. ESP32 is offline.\n2. CORS is not enabled on ESP32 (Check Arduino code).\n3. Mixed Content (HTTPS calling HTTP).`, error);
    throw error;
  }
};

export const toggleRelayRequest = async (ip: string, relayIndex: number): Promise<void> => {
  // The C++ code expects /toggle?r=0
  // It returns a 303 redirect to /, which fetch follows automatically usually.
  try {
    const baseUrl = getBaseUrl(ip);
    
    await fetch(`${baseUrl}/toggle?r=${relayIndex}`, {
      method: 'GET',
      mode: 'no-cors', // Often fire-and-forget for IoT if CORS is strict
    });
  } catch (error) {
    console.error(`Failed to toggle relay ${relayIndex} at ${ip}`, error);
    throw error;
  }
};

export const updateLcdText = async (ip: string, text: string): Promise<void> => {
  try {
    const baseUrl = getBaseUrl(ip);
    
    // The ESP32 code uses: server.on("/lcd", HTTP_POST, handleLCD);
    // It reads parameters using server.arg("text").
    // We must send a POST request with x-www-form-urlencoded body.
    const body = new URLSearchParams();
    body.append('text', text);

    await fetch(`${baseUrl}/lcd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
      mode: 'no-cors', // Result is a 303 redirect, which is opaque in no-cors mode
    });
  } catch (error) {
    console.error(`Failed to update LCD at ${ip}`, error);
    throw error;
  }
};

// Mock data generator for demo mode
export const getMockStatus = (currentRelays: Relay[]): Relay[] => {
  return currentRelays.map(r => ({ ...r, isLoading: false }));
};