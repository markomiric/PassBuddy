import { useState, useEffect, useRef } from "react";

export function useWebSocket() {
  const [response, setResponse] = useState(
    () => localStorage.getItem("lastMessage") || ""
  );
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!localStorage.getItem("lastMessage"));
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const socketRef = useRef(null);
  const timeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    setConnectionStatus("connecting");
    setLoading(true);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host =
      window.location.hostname !== "localhost"
        ? `${protocol}//${window.location.hostname}:3030`
        : "ws://localhost:3030";
    const socket = new WebSocket(`${host}?clientType=browser`);
    socketRef.current = socket;

    socket.onopen = () => {
      setError("");
      setConnectionStatus("connected");
      reconnectAttemptRef.current = 0;
      // Send periodic ping
      socketRef.current.pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            })
          );
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "gpt_response":
            setVisible(false);
            setLoading(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              setResponse(msg.data);
              setVisible(true);
              localStorage.setItem("lastMessage", msg.data);
            }, 100);
            break;
          case "connection_status":
            setDesktopConnected(
              msg.desktopConnected ?? msg.status === "desktop_connected"
            );
            break;
          case "pong":
            setConnectionStatus("connected");
            break;
          default:
            // ignore other types
            break;
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        setError("Error parsing WebSocket message");
        setLoading(false);
      }
    };

    socket.onerror = () => {
      setError("WebSocket encountered error. Retrying...");
      setConnectionStatus("disconnected");
      setLoading(false);
    };

    socket.onclose = () => {
      if (socketRef.current?.pingInterval)
        clearInterval(socketRef.current.pingInterval);
      setDesktopConnected(false);
      setConnectionStatus("disconnected");
      setError("WebSocket disconnected. Retrying...");

      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000);
        reconnectAttemptRef.current++;
        setTimeout(connect, delay);
      } else {
        setError("Connection failed after multiple attempts. Please refresh.");
      }
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (socketRef.current) {
        if (socketRef.current.pingInterval)
          clearInterval(socketRef.current.pingInterval);
        socketRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return {
    response,
    visible,
    loading,
    error,
    connectionStatus,
    desktopConnected,
    sendMessage,
  };
}
