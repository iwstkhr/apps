export const shelterTypeKeys = [
  'flood',
  'landslide',
  'storm_surge',
  'earthquake',
  'tsunami',
  'big_fire',
  'flood_within_levee',
  'volcanic_activity',
] as const;

export type ShelterTypeKey = (typeof shelterTypeKeys)[number];

export type ShelterType = Record<ShelterTypeKey, boolean>;

const shelterTypeKeySet: ReadonlySet<string> = new Set(shelterTypeKeys);

export function isShelterTypeKey(value: string): value is ShelterTypeKey {
  return shelterTypeKeySet.has(value);
}

// These labels are also the disaster type property names in the source GeoJSON.
export const ShelterTypeJapanese = {
  flood: '洪水',
  landslide: '崖崩れ、土石流及び地滑り',
  storm_surge: '高潮',
  earthquake: '地震',
  tsunami: '津波',
  big_fire: '大規模な火事',
  flood_within_levee: '内水氾濫',
  volcanic_activity: '火山現象',
} as const satisfies Record<ShelterTypeKey, string>;

const shelterTypeTableLabelOverrides: Partial<Record<ShelterTypeKey, string>> = {
  landslide: '崖崩れ',
  big_fire: '火事',
};

export function getShelterTypeTableLabel(key: ShelterTypeKey): string {
  return shelterTypeTableLabelOverrides[key] ?? ShelterTypeJapanese[key];
}
