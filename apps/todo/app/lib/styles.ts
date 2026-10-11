// Tailwind classes shared by form controls and buttons

export const fieldClass =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800';

export const inputClass = `${fieldClass} w-full`;

// When two color classes are on the same element, which one wins depends on CSS order.
// So only the shape is shared, and each button kind gets exactly one color
const buttonBaseClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';

export const primaryButtonClass = `${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`;

export const secondaryButtonClass = `${buttonBaseClass} border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800`;

/** Buttons for irreversible actions (replace, delete forever) */
export const dangerButtonClass = `${buttonBaseClass} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950`;

/** The button in a confirmation dialog that confirms an irreversible action */
export const dangerPrimaryButtonClass = `${buttonBaseClass} bg-red-600 text-white hover:bg-red-700`;
