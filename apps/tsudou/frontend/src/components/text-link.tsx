import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cx } from '../lib/cx';

/**
 * 本文中のリンク。同じ配色をルート各所でベタ書きしていたのをここに集約する。
 * 余白や display は呼び出し側の className で足す。
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
