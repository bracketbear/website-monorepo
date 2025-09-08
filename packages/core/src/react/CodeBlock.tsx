import React, { useEffect, useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Render a formatted, accessible code block. Uses the browser's built-in
 * highlight API if available in the future; for now we keep it lightweight
 * with semantic markup and utility classes so it looks good without JS.
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const lines = useMemo(() => {
    if (!code) return [];
    return code.replace(/\n$/, '').split('\n');
  }, [code]);
  const codeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Register languages on first use
    try {
      if (!hljs.listLanguages().includes('typescript'))
        hljs.registerLanguage('typescript', typescript);
      if (!hljs.listLanguages().includes('javascript'))
        hljs.registerLanguage('javascript', javascript);
      if (!hljs.listLanguages().includes('bash'))
        hljs.registerLanguage('bash', bash);
      if (!hljs.listLanguages().includes('json'))
        hljs.registerLanguage('json', json);
      if (!hljs.listLanguages().includes('css'))
        hljs.registerLanguage('css', css);
      if (!hljs.listLanguages().includes('xml'))
        hljs.registerLanguage('xml', xml); // html
      if (!hljs.listLanguages().includes('markdown'))
        hljs.registerLanguage('markdown', markdown);
    } catch {}

    // Avoid highlight.js DOM mutation when using line numbers grid
    if (!showLineNumbers && codeRef.current) {
      try {
        // If a language is provided, set it on the element for hljs to use
        if (language) {
          codeRef.current.classList.add(`language-${language}`);
        }
        codeRef.current.classList.add('hljs');
        hljs.highlightElement(codeRef.current as HTMLElement);
      } catch {}
    }
  }, [code, language, showLineNumbers]);

  const langClass = language ? `language-${language}` : undefined;

  return (
    <pre
      className={[
        'overflow-x-auto rounded-md border p-4 font-mono text-sm leading-6',
        'bg-brand-dark/95 border-brand-dark/30 text-white/90',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label="Code snippet"
    >
      <code ref={codeRef} className={langClass}>
        {showLineNumbers ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-4">
            <div
              aria-hidden="true"
              className="pr-2 text-right text-[var(--color-muted,#9ca3af)] select-none"
            >
              {lines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <div className="whitespace-pre">
              {lines.map((line, idx) => (
                <div key={idx}>{line || ' '}</div>
              ))}
            </div>
          </div>
        ) : (
          <span className="whitespace-pre">{code || ''}</span>
        )}
      </code>
    </pre>
  );
}
