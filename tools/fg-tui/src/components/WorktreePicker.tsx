import type { WorktreeRef } from '../model/types.js';

export interface WorktreePickerProps {
  refs: WorktreeRef[];
  onSelect: (ref: WorktreeRef) => void;
}

export function WorktreePicker(props: WorktreePickerProps): null {
  void props;
  return null;
}
