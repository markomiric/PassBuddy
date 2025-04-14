import { useEffect, useState, useRef } from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import './App.css';

function App() {
  const [response, setResponse] = useState('');
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected'

  const socketRef = useRef(null);
  const timeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
      packages: { "[+]": ["html"] },
      inlineMath: [['$', '$']],
      displayMath: [['$$', '$$']],
      processEscapes: true,
      processEnvironments: true
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      processHtmlClass: 'tex2jax_process'
    }
  };



  useEffect(() => {
    const lastMessage = localStorage.getItem('lastMessage');
    if (lastMessage) {
      setResponse(lastMessage);
      setLoading(false); // Ensure loading is false if a message exists
    }

    const connectWebSocket = () => {
      setConnectionStatus('connecting');
      setLoading(true);

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsHost;

      // For production, use the same host but with the ws protocol and relay port
      if (window.location.hostname !== 'localhost') {
        wsHost = `${protocol}//${window.location.hostname}:3030`;
      } else {
        // For development, connect to localhost:3030
        wsHost = 'ws://localhost:3030';
      }

      console.log(`Connecting to WebSocket at ${wsHost}`);
      const socket = new WebSocket(`${wsHost}?clientType=browser`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setError('');
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;

        // Send a ping every 25 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        }, 25000);

        // Store the interval ID to clear it on disconnect
        socketRef.current.pingInterval = pingInterval;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('Received message type:', msg.type);

          switch(msg.type) {
            case 'gpt_response':
              setVisible(false);
              setLoading(false);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => {
                setResponse(msg.data);
                setVisible(true);
                localStorage.setItem('lastMessage', msg.data); // Save the latest message
              }, 100);
              break;

            case 'connection_status':
              console.log('Connection status update:', msg);
              if (msg.desktopConnected !== undefined) {
                setDesktopConnected(msg.desktopConnected);
              }
              if (msg.status === 'desktop_connected') {
                setDesktopConnected(true);
              } else if (msg.status === 'desktop_disconnected') {
                setDesktopConnected(false);
              }
              break;

            case 'pong':
              // Heartbeat response received, connection is alive
              setConnectionStatus('connected');
              break;

            default:
              console.log('Unhandled message type:', msg.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setLoading(false);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket encountered error:', err);
        setError('WebSocket encountered an error. Retrying...');
        setConnectionStatus('disconnected');
        setLoading(false);
      };

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event);

        // Clear the ping interval if it exists
        if (socketRef.current && socketRef.current.pingInterval) {
          clearInterval(socketRef.current.pingInterval);
        }

        setDesktopConnected(false);
        setConnectionStatus('disconnected');
        setError('WebSocket disconnected. Retrying...');

        // Implement exponential backoff for reconnection attempts
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
          setTimeout(() => connectWebSocket(), delay);
        } else {
          setError('Connection failed after multiple attempts. Please refresh the page to try again.');
        }
      };
    };

    connectWebSocket();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (socketRef.current) {
        if (socketRef.current.pingInterval) {
          clearInterval(socketRef.current.pingInterval);
        }
        socketRef.current.close();
      }
    };
  }, []);



  // Format the response to handle both code blocks and math expressions
  const formatResponse = (text) => {
    // ...existing formatResponse function...
    if (!text) return text;

    // Function to prepare LaTeX content by fixing backslashes
    const prepareLatex = (latex) => {
      return latex
        .replace(/\\\\/g, '\\') // Replace double backslashes with single
        .replace(/\\([^\\])/g, '\\$1'); // Ensure single backslashes are preserved
    };

    // Split text into segments
    const segments = text.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);

    return segments.map((segment, index) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        // Display math - remove $$ and prepare LaTeX
        const math = segment.slice(2, -2);
        return (
          <MathJax key={index} dynamic>
            {'$$' + prepareLatex(math) + '$$'}
          </MathJax>
        );
      } else if (segment.startsWith('$') && segment.endsWith('$') && !segment.includes('\n')) {
        // Inline math - remove $ and prepare LaTeX
        const math = segment.slice(1, -1);
        return (
          <MathJax key={index} dynamic inline>
            {'$' + prepareLatex(math) + '$'}
          </MathJax>
        );
      } else if (segment.startsWith('```') && segment.endsWith('```')) {
        // Code block
        const [firstLine, ...lines] = segment.split('\n');
        lines.pop(); // Remove the last ```

        // Extract language if specified after backticks
        const language = firstLine.slice(3).trim();
        const code = lines.join('\n');

        return (
          <pre key={index} className={`code-block ${language ? `language-${language}` : ''}`}>
            <code>{code}</code>
          </pre>
        );
      } else if (segment.trim()) {
        // Regular text
        return <span key={index}>{segment}</span>;
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen flex flex-col bg-black">
        <main className="flex-1 container mx-auto max-w-5xl">
            <div className="p-5 sm:p-8 text-left">
              <div className="prose prose-lg max-w-none prose-invert">
                {formatResponse(response)}
              </div>
          </div>
        </main>
      </div>
    </MathJaxContext>
  );
}

export default App;
