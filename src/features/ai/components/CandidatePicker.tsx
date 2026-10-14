'use client';

import { Button } from '@/components/ui/button';

interface CandidatePickerProps {
  candidates: Array<{ index: number; label: string }>;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

/** Seleção entre várias candidatas. Mostra só rótulos: ids nunca chegam à UI. */
export function CandidatePicker({ candidates, onSelect, disabled = false }: CandidatePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-on-surface-variant">Encontrei mais de um. Qual deles?</p>
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.index}>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onSelect(candidate.index)}
              className="h-auto min-h-12 w-full justify-start whitespace-normal py-2 text-left"
            >
              {candidate.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
