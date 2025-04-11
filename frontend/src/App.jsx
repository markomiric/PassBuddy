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
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

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

  // Apply dark mode class to document.documentElement (html tag)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

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

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

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
            {language && <div className="code-language">{language}</div>}
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
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        <header className="sticky top-0 z-10 bg-opacity-90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm px-4 py-3">
          <div className="container mx-auto max-w-5xl flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span role="img" aria-label="Robot" className="text-2xl">🤖</span>
              <span>GPT Response Viewer</span>
            </h1>
            <div className="flex items-center gap-3">
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-500 animate-pulse'
                      : connectionStatus === 'connecting'
                        ? 'bg-yellow-500 animate-ping'
                        : 'bg-red-500'
                  }`}></span>
                  <span className="hidden sm:inline">
                    {connectionStatus === 'connected'
                      ? 'Connected'
                      : connectionStatus === 'connecting'
                        ? 'Connecting...'
                        : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Desktop Connection Status */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                desktopConnected
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  desktopConnected ? 'bg-blue-500' : 'bg-gray-400'
                }`}></span>
                <span>Desktop {desktopConnected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`p-2.5 rounded-full transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto max-w-5xl px-4 py-6">
          {error && (
            <div className="mb-5 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-l-4 border-red-500" role="alert">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-700 ${
            darkMode
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`} style={{ opacity: visible ? 1 : 0 }}>
            {loading && !response && (
              <div className="absolute inset-0 flex items-center justify-center bg-opacity-80 bg-gray-200 dark:bg-gray-800 dark:bg-opacity-90 z-10">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 dark:border-blue-700 dark:border-t-blue-300 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Waiting for response...</p>
                </div>
              </div>
            )}

            <div className="p-5 sm:p-8 text-left">
              {response ? (
                <div className={`prose prose-lg max-w-none ${
                  darkMode ? 'prose-invert' : ''
                }`}>
                  {formatResponse(response)}
                </div>
              ) : !loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-medium">Waiting for a response from desktop app</p>
                  <p className="mt-2 max-w-md">Use the Screenshot AI desktop application to capture and analyze text</p>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <footer className="mt-auto py-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <p>Screenshot AI Relay</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Server Status:</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-500'
                      : connectionStatus === 'connecting'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}></span>
                  <span>
                    {connectionStatus === 'connected'
                      ? 'Connected'
                      : connectionStatus === 'connecting'
                        ? 'Connecting'
                        : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </MathJaxContext>
  );
}

export default App;
