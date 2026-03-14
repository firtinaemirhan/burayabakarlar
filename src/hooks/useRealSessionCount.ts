import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SESSION_SERVER_URL =
  import.meta.env.VITE_SESSION_SERVER_URL || "http://localhost:3001";

export function useRealSessionCount() {
  const [count, setCount] = useState(1);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SESSION_SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("userCount", (newCount: number) => {
      setCount(newCount);
    });

    socket.on("connect", () => {
      fetch(`${SESSION_SERVER_URL}/api/user-count`)
        .then((res) => res.json())
        .then((data) => setCount(data.count))
        .catch(() => console.log("Count fetch failed, using socket"));
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from session server");
    });

    socket.on("connect_error", (error) => {
      console.warn("Session server connection error:", error.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { count };
}
