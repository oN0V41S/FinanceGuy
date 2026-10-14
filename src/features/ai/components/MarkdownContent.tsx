'use client';

import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Só links http(s) e mailto são mantidos; qualquer outro esquema (javascript:, data:) é descartado. */
function safeUrl(url: string): string {
  return /^(https?:|mailto:)/i.test(url) ? url : '';
}

const components: Components = {
  p: ({ node: _node, ...props }) => <p className="leading-relaxed [&:not(:first-child)]:mt-3" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
  h1: ({ node: _node, ...props }) => <h3 className="mt-4 mb-2 text-lg font-semibold first:mt-0" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-3 mb-1 text-base font-semibold first:mt-0" {...props} />,
  h4: ({ node: _node, ...props }) => <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="mt-2 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="mt-2 list-decimal space-y-1 pl-5" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="mt-3 border-l-2 border-outline-variant pl-3 text-on-surface-variant" {...props} />
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-4 border-outline-variant" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a
      className="text-brand-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-surface-container-high px-1 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-container-high p-3 text-sm" {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-outline-variant px-2 py-1.5 text-left font-semibold" {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b border-outline-variant/50 px-2 py-1.5" {...props} />
  ),
  // Imagens remotas não são carregadas (evita rastreamento por URL gerada pelo modelo).
  img: () => null,
};

/** Renderiza markdown do assistente. HTML bruto nunca é interpretado (react-markdown não o habilita). */
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="break-words text-on-surface">
      <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={safeUrl}>
        {content}
      </Markdown>
    </div>
  );
}
