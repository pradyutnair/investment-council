'use client';

import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SourceMap {
  [key: string]: { name: string; url: string };
}

function parseSources(markdown: string): SourceMap {
  const sources: SourceMap = {};

  // Match the Sources/References section and extract URLs
  const sourcesSectionMatch = markdown.match(/##\s*(?:Sources?|References?)\s*\n([\s\S]+?)(?=\n##|\n*$)/i);
  if (!sourcesSectionMatch) {
    // Try to find inline source links like [1]: url or numbered sources
    const inlineSourceRegex = /\[(\d+)\]:\s*<?([^\s<>]+)>?(?:\s+"([^"]+)")?/gm;
    let match;
    while ((match = inlineSourceRegex.exec(markdown)) !== null) {
      const [, num, url, title] = match;
      sources[num] = { name: title || url, url };
    }
    return sources;
  }

  const sourcesContent = sourcesSectionMatch[1];

  // Match various source formats:
  // 1. [Name](url)
  // 2. 1. Name - url
  // 3. [1] Name: url
  const linkRegex = /^(\d+)\.\s*\[([^\]]+)\]\(([^)]+)\)/gm;
  const plainLinkRegex = /^(\d+)\.\s*(.+?)\s*[-–:]\s*(https?:\/\/[^\s]+)/gm;
  const bracketLinkRegex = /^\[(\d+)\]\s*(.+?):\s*(https?:\/\/[^\s]+)/gm;
  
  let match;

  while ((match = linkRegex.exec(sourcesContent)) !== null) {
    const [, num, name, url] = match;
    sources[num] = { name, url };
  }
  
  while ((match = plainLinkRegex.exec(sourcesContent)) !== null) {
    const [, num, name, url] = match;
    if (!sources[num]) sources[num] = { name: name.trim(), url };
  }
  
  while ((match = bracketLinkRegex.exec(sourcesContent)) !== null) {
    const [, num, name, url] = match;
    if (!sources[num]) sources[num] = { name: name.trim(), url };
  }

  return sources;
}

function formatTextWithCitations(text: string, sources: SourceMap): React.ReactNode {
  if (typeof text !== 'string') return text;
  
  // Split text by various citation formats:
  // [cite: 7], [cite:7], [7], [1,2], [cite: 1, 2]
  const parts = text.split(/(\[cite:\s*\d+(?:,\s*\d+)*\]|\[\d+(?:,\s*\d+)*\])/gi);

  return parts.map((part, index) => {
    // Match [cite: X] or [cite:X] format
    const citeMatch = part.match(/^\[cite:\s*(\d+(?:,\s*\d+)*)\]$/i);
    // Match [X] format
    const bracketMatch = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
    
    const citationMatch = citeMatch || bracketMatch;

    if (citationMatch) {
      const citationNumbers = citationMatch[1].split(',').map(n => n.trim());

      return (
        <sup key={index} className="inline text-[10px] font-semibold text-blue-600 dark:text-blue-400 ml-0.5">
          {citationNumbers.map((num, i) => {
            const source = sources[num];
            if (source) {
              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline no-underline"
                  title={source.name}
                >
                  {i > 0 ? ',' : ''}{num}
                </a>
              );
            }
            return <span key={i}>{i > 0 ? ',' : ''}{num}</span>;
          })}
        </sup>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

// Helper to recursively process children with citations
function processChildrenWithCitations(children: React.ReactNode, sources: SourceMap): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return formatTextWithCitations(child, sources);
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
      return React.cloneElement(child, {
        ...child.props,
        children: processChildrenWithCitations(child.props.children, sources),
      });
    }
    return child;
  });
}

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export function FormattedMarkdown({ content, className = '' }: FormattedMarkdownProps) {
  const sources = parseSources(content);

  const components: Components = {
    // Headings
    h1: ({ children }) => (
      <h1 className="font-serif text-[28px] font-bold mt-8 mb-4 pb-2 border-b border-border first:mt-0">
        {processChildrenWithCitations(children, sources)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-serif text-[22px] font-semibold mt-6 mb-3 text-foreground">
        {processChildrenWithCitations(children, sources)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-serif text-[18px] font-medium mt-5 mb-2 text-foreground">
        {processChildrenWithCitations(children, sources)}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-serif text-[16px] font-medium mt-4 mb-2 text-foreground">
        {processChildrenWithCitations(children, sources)}
      </h4>
    ),
    
    // Paragraphs
    p: ({ children }) => (
      <p className="font-serif mb-4 text-[18px] leading-[1.8] text-foreground/90">
        {processChildrenWithCitations(children, sources)}
      </p>
    ),
    
    // Lists
    ul: ({ children }) => (
      <ul className="font-serif mb-4 ml-6 list-disc space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="font-serif mb-4 ml-6 list-decimal space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="font-serif text-[17px] leading-[1.8] text-foreground/90">
        {processChildrenWithCitations(children, sources)}
      </li>
    ),
    
    // Tables - properly styled
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[15px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50 border-b border-border">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-[13px] font-semibold text-foreground uppercase tracking-wide">
        {processChildrenWithCitations(children, sources)}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-[15px] text-foreground/90">
        {processChildrenWithCitations(children, sources)}
      </td>
    ),
    
    // Code blocks
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-muted text-[14px] font-mono text-foreground" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={`${className} text-[14px]`} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-4 p-4 rounded-lg bg-muted overflow-x-auto text-[14px]">
        {children}
      </pre>
    ),
    
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="font-serif my-4 pl-4 border-l-2 border-primary/40 italic text-muted-foreground text-[17px]">
        {children}
      </blockquote>
    ),
    
    // Links
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {children}
      </a>
    ),
    
    // Strong/Bold
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">
        {processChildrenWithCitations(children, sources)}
      </strong>
    ),
    
    // Horizontal rule
    hr: () => <hr className="my-6 border-border" />,
  };

  return (
    <div className={`font-serif ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
