import { MathJax } from 'better-react-mathjax';

export function prepareLatex(latex) {
  return latex
    .replace(/\\\\/g, '\\') // Replace double backslashes with single
    .replace(/\\([^\\])/g, '\\$1');
}

export function formatResponse(text) {
  if (!text) return text;

  const segments = text.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);

  return segments
    .map((segment, index) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        const math = segment.slice(2, -2);
        return (
          <MathJax key={index} dynamic>{'$$' + prepareLatex(math) + '$$'}</MathJax>
        );
      } else if (segment.startsWith('$') && segment.endsWith('$') && !segment.includes('\n')) {
        const math = segment.slice(1, -1);
        return (
          <MathJax key={index} dynamic inline>
            {'$' + prepareLatex(math) + '$'}
          </MathJax>
        );
      } else if (segment.startsWith('```') && segment.endsWith('```')) {
        const [firstLine, ...lines] = segment.split('\n');
        lines.pop();
        const language = firstLine.slice(3).trim();
        const code = lines.join('\n');
        return (
          <pre key={index} className={language ? `language-${language}` : ''}>
            <code>{code}</code>
          </pre>
        );
      } else if (segment.trim()) {
        return <span key={index}>{segment}</span>;
      }
      return null;
    })
    .filter(Boolean);
}