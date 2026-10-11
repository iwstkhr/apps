import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cx } from '../lib/cx';

/**
 * A link in body text. Gathers the color scheme that used to be hard-coded across routes.
 * Margins and display are added by the caller's className.
 */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cx(
        'text-sm text-indigo-600 hover:underline dark:text-indigo-400',
        typeof className === 'string' ? className : undefined,
      )}
    />
  );
}
