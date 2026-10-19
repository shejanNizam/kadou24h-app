/**
 * One Socket.io connection per signed-in session (auth: { token }).
 * Feature code subscribes with getSocket()?.on(...) inside effects.
 */
import { io, type Socket } from 'socket.io-client';

import { config } from './config';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  if (socket && currentToken === token) return socket;
  socket?.disconnect();
  currentToken = token;
  socket = io(config.socketUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelayMax: 10_000,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}

export const getSocket = () => socket;
