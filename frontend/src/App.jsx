import { MathJaxContext } from 'better-react-mathjax';
import { useWebSocket } from './hooks/useWebSocket';
import ResponseViewer from './components/ResponseViewer';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorBanner from './components/ErrorBanner';
import './App.css';

function App() {
  const {
    response,
    visible,
    loading,
    error,
    connectionStatus,
    desktopConnected,
  } = useWebSocket();

  const mathJaxConfig = {
    loader: { load: ['[tex]/html'] },
    tex: { packages: { '[+]': ['html'] }, inlineMath: [['$', '$']], displayMath: [['$$', '$$']], processEscapes: true, processEnvironments: true },
    options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'], processHtmlClass: 'tex2jax_process' },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen flex flex-col bg-black">
        <ConnectionStatus status={connectionStatus} desktopConnected={desktopConnected} />
        <ErrorBanner error={error} />
        <main className="flex-1 container mx-auto max-w-5xl">
          <div className="p-5 sm:p-8 text-left">
            <ResponseViewer loading={loading} response={response} visible={visible} />
          </div>
        </main>
      </div>
    </MathJaxContext>
  );
}

export default App;
