import { createContext, useContext } from 'react';

export type ConfirmOptions = {
  /** What to confirm. Becomes the dialog heading (pass translated text) */
  message: string;
  /** Text of the button that performs the action (translated) */
  confirmLabel: string;
};

export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Return a function that confirms with an in-app dialog instead of window.confirm.
 * It resolves to true when the action is chosen, and false on cancel, Esc, or a backdrop click.
 * Use inside ConfirmProvider.
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm は ConfirmProvider の内側で使ってください');
  return confirm;
}
