/**
 * WebSocket Adapter — connects to Trellis kernel
 * 
 * v1 transport: WebSocket to Trellis kernel process.
 * Handles reconnection, heartbeats, and message routing.
 */

import type { KernelEvent } from '../kernel/bridge.js';

export interface WebSocketAdapterConfig {
  url: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketMessage {
  type: 'op' | 'query' | 'event' | 'ack' | 'nack' | 'ping' | 'pong';
  payload: unknown;
  id?: string;
}

const DEFAULT_CONFIG = {
  reconnectInterval: 1000,
  heartbeatInterval: 30000,
  maxReconnectAttempts: 10,
};

export class WebSocketAdapter {
  private _config: Required<WebSocketAdapterConfig>;
  private _socket: WebSocket | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private _reconnectAttempts: number = 0;
  private _reconnectTimer: number | null = null;
  private _heartbeatTimer: number | null = null;
  private _pendingRequests: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timeout: number }> = new Map();
  private _eventListeners: Set<(event: KernelEvent) => void> = new Set();
  private _statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  constructor(config: WebSocketAdapterConfig) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this._socket = new WebSocket(this._config.url);
        this._setStatus('connecting');

        this._socket.onopen = () => {
          this._setStatus('connected');
          this._reconnectAttempts = 0;
          this._startHeartbeat();
          resolve();
        };

        this._socket.onmessage = (event) => {
          this._handleMessage(event.data);
        };

        this._socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this._socket.onclose = () => {
          this._setStatus('disconnected');
          this._stopHeartbeat();
          this._scheduleReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    this._clearReconnect();
    this._stopHeartbeat();
    this._socket?.close();
    this._socket = null;
    this._setStatus('disconnected');
  }

  async sendOp(event: KernelEvent): Promise<{ success: boolean; id?: string; error?: string }> {
    return this._send('op', event);
  }

  async query(q: unknown): Promise<unknown> {
    const result = await this._send('query', q);
    return result;
  }

  onEvent(listener: (event: KernelEvent) => void): () => void {
    this._eventListeners.add(listener);
    return () => this._eventListeners.delete(listener);
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this._statusListeners.add(listener);
    listener(this._status);
    return () => this._statusListeners.delete(listener);
  }

  private async _send(type: WebSocketMessage['type'], payload: unknown): Promise<unknown> {
    if (this._socket?.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 30000);

      this._pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });

      this._socket!.send(JSON.stringify({ type, payload, id }));

      // For fire-and-forget ops, resolve immediately
      if (type === 'op') {
        this._pendingRequests.delete(id);
        clearTimeout(timeout);
        resolve({ success: true, id });
      }
    });
  }

  private _handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'event':
          this._handleEvent(message.payload as KernelEvent);
          break;
        case 'ack':
          this._handleAck(message.id!, message.payload);
          break;
        case 'nack':
          this._handleNack(message.id!, message.payload);
          break;
        case 'pong':
          // Heartbeat response, all good
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }

  private _handleEvent(event: KernelEvent): void {
    this._eventListeners.forEach(listener => listener(event));
  }

  private _handleAck(id: string, payload: unknown): void {
    const pending = this._pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this._pendingRequests.delete(id);
      pending.resolve(payload);
    }
  }

  private _handleNack(id: string, payload: unknown): void {
    const pending = this._pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this._pendingRequests.delete(id);
      pending.reject(new Error(String(payload)));
    }
  }

  private _setStatus(status: ConnectionStatus): void {
    this._status = status;
    this._statusListeners.forEach(listener => listener(status));
  }

  private _scheduleReconnect(): void {
    if (this._reconnectAttempts >= this._config.maxReconnectAttempts) {
      this._setStatus('failed');
      return;
    }

    const delay = Math.min(
      this._config.reconnectInterval * Math.pow(2, this._reconnectAttempts),
      30000
    );

    this._reconnectTimer = window.setTimeout(() => {
      this._reconnectAttempts++;
      this.connect().catch(() => {});
    }, delay);
  }

  private _clearReconnect(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  private _startHeartbeat(): void {
    this._heartbeatTimer = window.setInterval(() => {
      if (this._socket?.readyState === WebSocket.OPEN) {
        this._socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this._config.heartbeatInterval);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer !== null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// Singleton
let _instance: WebSocketAdapter | null = null;

export function getWebSocketAdapter(config?: WebSocketAdapterConfig): WebSocketAdapter {
  if (!_instance && config) {
    _instance = new WebSocketAdapter(config);
  }
  if (!_instance) {
    throw new Error('WebSocket adapter not initialized');
  }
  return _instance;
}

export function initWebSocketAdapter(config: WebSocketAdapterConfig): WebSocketAdapter {
  _instance = new WebSocketAdapter(config);
  return _instance;
}
