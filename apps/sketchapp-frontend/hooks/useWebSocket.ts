"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { CanvasElement, WSMessage, User } from '../types/canvas';

interface UseWebSocketProps {
  roomId: string;
  token: string;
  onCanvasUpdate?: (elements: CanvasElement[], appState: any) => void;
  onUserJoined?: (user: User) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdate?: (userId: string, x: number, y: number, color: string) => void;
  onChatMessage?: (message: any) => void;
}

export function useWebSocket({
  roomId,
  token,
  onCanvasUpdate,
  onUserJoined,
  onUserLeft,
  onCursorUpdate,
  onChatMessage,
}: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!roomId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    
    // Build URL with token or guestName
    let url = wsUrl;
    const params = new URLSearchParams();
    
    if (token) {
      params.append('token', token);
    } else {
      // Guest user - get name from localStorage
      const guestName = typeof window !== 'undefined' ? localStorage.getItem('guestName') : null;
      if (guestName) {
        params.append('guestName', guestName);
      } else {
        console.error('No token or guest name available');
        return;
      }
    }
    
    url = `${wsUrl}?${params.toString()}`;

    console.log('Connecting to WebSocket:', url);

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Join the room - use ws.current.send directly
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'join_room',
          roomId,
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('WebSocket message:', message.type);

        switch (message.type) {
          case 'connected':
            console.log('Connected as:', message.userName);
            break;

          case 'room_presence':
            setActiveUsers(message.users || []);
            break;

          case 'user_joined':
            if (onUserJoined) {
              onUserJoined({
                id: message.userId,
                name: message.userName,
                email: '',
                color: message.color,
              });
            }
            setActiveUsers((prev) => [
              ...prev,
              {
                id: message.userId,
                name: message.userName,
                email: '',
                color: message.color,
              },
            ]);
            break;

          case 'user_left':
            if (onUserLeft) {
              onUserLeft(message.userId);
            }
            setActiveUsers((prev) =>
              prev.filter((user) => user.id !== message.userId)
            );
            break;

          case 'cursor_update':
            if (onCursorUpdate) {
              onCursorUpdate(message.userId, message.x, message.y, message.color);
            }
            break;

          case 'canvas_update':
            if (onCanvasUpdate) {
              onCanvasUpdate(message.elements, message.appState);
            }
            break;

          case 'element_add':
          case 'element_update':
          case 'element_delete':
            // Handle individual element updates
            if (onCanvasUpdate) {
              // You might want to handle these differently
              console.log('Element update:', message.type);
            }
            break;

          case 'chat':
            if (onChatMessage) {
              onChatMessage({
                userId: message.userId,
                userName: message.userName,
                message: message.message,
                timestamp: message.timestamp,
              });
            }
            break;

          case 'error':
            console.error('WebSocket error message:', message.message);
            break;

          case 'pong':
            // Heartbeat response
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`Reconnecting in ${delay}ms...`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };
  }, [token, roomId, onCanvasUpdate, onUserJoined, onUserLeft, onCursorUpdate, onChatMessage]);

  const send = useCallback((message: WSMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const sendCursorPosition = useCallback((x: number, y: number) => {
    send({
      type: 'cursor_move',
      roomId,
      x,
      y,
    });
  }, [roomId, send]);

  const sendCanvasUpdate = useCallback((elements: CanvasElement[], appState: any) => {
    send({
      type: 'canvas_update',
      roomId,
      elements,
      appState,
    });
  }, [roomId, send]);

  const sendChatMessage = useCallback((message: string) => {
    send({
      type: 'chat',
      roomId,
      message,
    });
  }, [roomId, send]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (ws.current) {
      send({
        type: 'leave_room',
        roomId,
      });
      ws.current.close();
      ws.current = null;
    }

    setIsConnected(false);
    setActiveUsers([]);
  }, [roomId, send]);

  useEffect(() => {
    connect();

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      send({ type: 'ping' });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      disconnect();
    };
  }, [connect, disconnect, send]);

  return {
    isConnected,
    activeUsers,
    sendCursorPosition,
    sendCanvasUpdate,
    sendChatMessage,
    disconnect,
  };
}
