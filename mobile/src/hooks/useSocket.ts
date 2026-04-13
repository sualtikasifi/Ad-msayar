import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/socketService';

export function useSocketConnection(): { socket: Socket | null } {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let mounted = true;

    connectSocket()
      .then((s) => {
        if (mounted) socketRef.current = s;
      })
      .catch(console.error);

    return () => {
      mounted = false;
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef.current };
}

export function useChallengeRoom(challengeId: string | null): void {
  useEffect(() => {
    if (!challengeId) return;
    const { getSocket } = require('../services/socketService');
    const socket = getSocket();
    if (!socket) return;

    socket.emit('challenge:join', { challengeId });
    return () => {
      socket.emit('challenge:leave', { challengeId });
    };
  }, [challengeId]);
}
