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

export const fetchRelayStatus = async (ip: string): Promise<boolean[] | null> => {
  const baseUrl = getBaseUrl(ip);
  
  try {
    // Try full CORS request first to get data
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
      // Fallback: Check if device is reachable even if we can't read data (CORS error)
    // This handles the case where commands work (fire-and-forget) but reading status fails.
    try {
      // Short timeout for the fallback ping
      const controllerFallback = new AbortController();
      const idFallback = setTimeout(() => controllerFallback.abort(), 1000); // Reduced to 1s
      
      await fetch(`${baseUrl}/`, { 
          method: 'GET', 
          mode: 'no-cors', // Opaque response
          signal: controllerFallback.signal,
          cache: 'no-cache'
      });
      clearTimeout(idFallback);

      // If this succeeds, we are connected but blocked from reading. 
      // Return null to indicate "Online but blind".
      return null; 
    } catch (pingError) {
      // If this also fails, we are truly offline
      console.error(`Failed to fetch ESP32 status from ${ip}.`, error);
      throw error;
    }
  }
};

export const toggleRelayRequest = async (ip: string, relayIndex: number): Promise<void> => {
  // The C++ code expects /toggle?r=0
  // It returns a 303 redirect to /, which fetch follows automatically usually.
  
  // Use Image Beacon trick to completely bypass CORS/Preflight for simple GETs
  // This is robust for fire-and-forget actions
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(ip);
    const url = `${baseUrl}/toggle?r=${relayIndex}&t=${Date.now()}`; // Add timestamp to prevent caching
    console.log(`[ESP32] Toggling via Beacon: ${url}`);
    
    const img = new Image();
    
    // Image onload/onerror events work even cross-origin usually, 
    // but some browsers suppress them for private network access.
    // Since we just want to send the packet, we assume success if no immediate error.
    
    img.onload = () => {
        console.log("Beacon loaded");
        resolve();
    };
    
    img.onerror = (e) => {
        // Even on 404 or CORS block, the request usually hits the server.
        console.log("Beacon error/blocked (expected for CORS), but packet sent.");
        resolve(); 
    };

    img.src = url;
    
    // Auto-resolve after short delay because image events might be suppressed
    setTimeout(() => resolve(), 100);
  });
};

export const updateLcdText = async (ip: string, text: string): Promise<void> => {
  // Use a hidden HTML Form to send a POST request.
  // This bypasses CORS Preflight (OPTIONS) requests completely, ensuring the ESP32
  // receives a standard POST request without getting confused by browser handshake data.
  return new Promise((resolve) => {
    const iframeName = `lcd_iframe_${Date.now()}`;
    
    // Create hidden iframe to be the target of the form (prevents page reload)
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Create form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${getBaseUrl(ip)}/lcd`;
    form.target = iframeName;
    form.style.display = 'none';

    // Add input field
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'text';
    input.value = text;
    form.appendChild(input);

    document.body.appendChild(form);

    // Submit the form
    try {
        form.submit();
        console.log(`[ESP32] Sent LCD POST via Hidden Form: "${text}"`);
    } catch (e) {
        console.error("Form submit failed", e);
    }

    // Cleanup DOM elements after a short delay
    setTimeout(() => {
      try {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
      } catch (e) {
          // Ignore cleanup errors
      }
      resolve();
    }, 200);
  });
};

// Mock data generator for demo mode
export const getMockStatus = (currentRelays: Relay[]): Relay[] => {
  return currentRelays.map(r => ({ ...r, isLoading: false }));
};