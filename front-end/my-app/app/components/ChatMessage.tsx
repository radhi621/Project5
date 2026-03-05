import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  imageUrls?: string[];
}

// ---------------------------------------------------------------------------
// Inline renderer: bold, italic, inline-code within a single line of text
// ---------------------------------------------------------------------------
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Matches: **bold**, *italic*, `code`
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index} className="italic">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 bg-gray-100 text-orange-600 rounded text-sm font-mono border border-gray-200">
          {match[4]}
        </code>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Block renderer: parses markdown blocks — headings, code fences, lists, hr,
// blank line separated paragraphs
// ---------------------------------------------------------------------------
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block  ```...```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={key++} className="my-3 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          {lang && (
            <div className="px-4 py-1.5 bg-gray-700 text-gray-300 text-xs font-mono uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="p-4 bg-gray-800 text-gray-100 text-sm font-mono overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++; // skip closing ```
      continue;
    }

    // Heading ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const cls =
        level === 1
          ? 'text-xl font-bold text-gray-900 mt-4 mb-2'
          : level === 2
          ? 'text-lg font-bold text-gray-900 mt-3 mb-1.5'
          : 'text-base font-semibold text-gray-800 mt-2 mb-1';
      elements.push(
        <div key={key++} className={cls}>
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule ---
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="my-3 border-gray-200" />);
      i++;
      continue;
    }

    // Unordered list block
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1 pl-5 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-800">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list block
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
        num++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1 pl-1 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-gray-800">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s|```|---)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="text-gray-800 leading-relaxed my-1">
          {renderInline(paraLines.join(' '))}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Image attachment display
// ---------------------------------------------------------------------------
function ImageAttachments({ urls }: { urls: string[] }) {
  const [enlarged, setEnlarged] = React.useState<string | null>(null);

  return (
    <>
      <div className={`mt-2 flex flex-wrap gap-2 ${urls.length === 1 ? 'max-w-xs' : 'max-w-sm'}`}>
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setEnlarged(url)}
            className="rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ width: urls.length === 1 ? '100%' : '140px', height: urls.length === 1 ? 'auto' : '110px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Uploaded image ${i + 1}`}
              className="object-cover w-full h-full"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enlarged}
            alt="Enlarged"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setEnlarged(null)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

// Shown for historical messages loaded from DB where image data is no longer available
function ImageHistoryPlaceholder() {
  return (
    <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Image uploaded for analysis
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ChatMessage({ role, content, timestamp, imageUrls }: ChatMessageProps) {
  const isUser = role === 'user';
  const isImageUploadMessage = isUser && content === 'Analyzing uploaded files...';

  return (
    <div className={`flex gap-4 px-4 py-6 ${isUser ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 7H7v6h6V7z" />
              <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">
            {isUser ? 'You' : 'AutoDiag AI'}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500">{timestamp}</span>
          )}
        </div>

        {/* Text content — skip the fallback label if images are present live */}
        {isUser ? (
          !isImageUploadMessage || !imageUrls?.length ? (
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</div>
          ) : null
        ) : (
          <MarkdownContent content={content} />
        )}

        {/* Image display */}
        {isUser && (
          imageUrls && imageUrls.length > 0
            ? <ImageAttachments urls={imageUrls} />
            : isImageUploadMessage
              ? <ImageHistoryPlaceholder />
              : null
        )}
      </div>
    </div>
  );
}
