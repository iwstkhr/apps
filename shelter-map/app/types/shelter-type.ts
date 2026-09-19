export const ShelterTypeEnum = {
  Flood: 'flood',
  Landslide: 'landslide',
  StormSurge: 'storm_surge',
  Earthquake: 'earthquake',
  Tsunami: 'tsunami',
  BigFire: 'big_fire',
  FloodWithinLevee: 'flood_within_levee',
  VolcanicActivity: 'volcanic_activity',
} as const;

export type ShelterTypeKey = (typeof ShelterTypeEnum)[keyof typeof ShelterTypeEnum];

export type ShelterType = Record<ShelterTypeKey, boolean>;

export const shelterTypeKeys = Object.values(ShelterTypeEnum);

const shelterTypeKeySet: ReadonlySet<string> = new Set(shelterTypeKeys);

export function isShelterTypeKey(value: string): value is ShelterTypeKey {
  return shelterTypeKeySet.has(value);
}

// These labels are also the disaster type property names in the source GeoJSON.
export const ShelterTypeJapanese = {
  [ShelterTypeEnum.Flood]: '洪水',
  [ShelterTypeEnum.Landslide]: '崖崩れ、土石流及び地滑り',
  [ShelterTypeEnum.StormSurge]: '高潮',
  [ShelterTypeEnum.Earthquake]: '地震',
  [ShelterTypeEnum.Tsunami]: '津波',
  [ShelterTypeEnum.BigFire]: '大規模な火事',
  [ShelterTypeEnum.FloodWithinLevee]: '内水氾濫',
  [ShelterTypeEnum.VolcanicActivity]: '火山現象',
} as const satisfies Record<ShelterTypeKey, string>;

const shelterTypeTableLabelOverrides: Partial<Record<ShelterTypeKey, string>> = {
  [ShelterTypeEnum.Landslide]: '崖崩れ',
  [ShelterTypeEnum.BigFire]: '火事',
};

export function getShelterTypeTableLabel(key: ShelterTypeKey): string {
  return shelterTypeTableLabelOverrides[key] ?? ShelterTypeJapanese[key];
}
