import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!globalSocket) {
      const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      globalSocket = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
    }

    socketRef.current = globalSocket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    globalSocket.on("connect", handleConnect);
    globalSocket.on("disconnect", handleDisconnect);

    if (globalSocket.connected) {
      setIsConnected(true);
    }

    return () => {
      globalSocket?.off("connect", handleConnect);
      globalSocket?.off("disconnect", handleDisconnect);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
