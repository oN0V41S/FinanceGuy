import { Fragment } from 'react';
import type { MissingFieldDto } from '@/features/ai/types';

/** Aviso calmo: "Faltou <b>valor</b>. Exemplo: …". */
export function MissingFieldsNotice({ missingFields }: { missingFields: MissingFieldDto[] }) {
  if (missingFields.length === 0) return null;

  return (
    <p className="rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
      Faltou{' '}
      {missingFields.map((field, index) => (
        <Fragment key={field.key}>
          {index > 0 && (index === missingFields.length - 1 ? ' e ' : ', ')}
          <strong className="font-semibold text-on-surface">{field.label}</strong>
        </Fragment>
      ))}
      . Exemplo: {missingFields.map((field) => field.example).join('; ')}
    </p>
  );
}
