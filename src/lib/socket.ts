// WebSocket client — remplace Socket.io par WebSocket natif du navigateur
// Se connecte à ws://localhost:8000/ws/ (Django Channels)

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

type Listener = (data: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

function getWsUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (configuredUrl) return configuredUrl;

  const hostname = window.location.hostname;
  const port = import.meta.env.VITE_WS_PORT ?? "8000";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${hostname}:${port}/ws/`;
}

function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    console.log("[ws] connected to Django Channels");
    emit_local("connect", null);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as { event: string; data: unknown };
      emit_local(msg.event, msg.data);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    emit_local("disconnect", null);
    console.log("[ws] disconnected — reconnect in 2s");
    reconnectTimer = setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function emit_local(event: string, data: unknown) {
  const set = listeners.get(event);
  if (set) {
    set.forEach((fn) => fn(data));
  }
}

export function on(event: string, listener: Listener): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(listener);
  return () => listeners.get(event)?.delete(listener);
}

export function off(event: string, listener: Listener): void {
  listeners.get(event)?.delete(listener);
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

// Démarre la connexion dès l'import du module
connect();

