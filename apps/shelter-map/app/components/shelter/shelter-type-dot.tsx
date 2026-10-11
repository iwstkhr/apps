import { cn } from '~/lib/cn';
import { SHELTER_TYPE_COLORS, type ShelterTypeKey } from '~/types/shelter-type';

/** The disaster type's color as a dot beside its label; the label carries the meaning. */
export function ShelterTypeDot({
  typeKey,
  className,
}: {
  typeKey: ShelterTypeKey;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: SHELTER_TYPE_COLORS[typeKey] }}
      aria-hidden="true"
    />
  );
}
