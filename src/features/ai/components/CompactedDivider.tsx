/** Divisor entre mensagens antigas (resumidas) e a conversa recente. */
export function CompactedDivider() {
  return (
    <div role="separator" className="flex items-center gap-3 py-1 text-xs text-on-surface-variant">
      <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
      <span>Conversa anterior resumida</span>
      <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
    </div>
  );
}
