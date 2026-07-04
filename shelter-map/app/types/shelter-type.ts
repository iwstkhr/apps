export interface ShelterType {
  flood: boolean;
  landslide: boolean;
  storm_surge: boolean;
  earthquake: boolean;
  tsunami: boolean;
  big_fire: boolean;
  flood_within_levee: boolean;
  volcanic_activity: boolean;
}

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

export const shelterTypeKeys = Object.values(ShelterTypeEnum);

export const ShelterTypeJapanese = new Map<ShelterTypeKey, string>([
  [ShelterTypeEnum.Flood, '洪水'],
  [ShelterTypeEnum.Landslide, '崖崩れ、土石流及び地滑り'],
  [ShelterTypeEnum.StormSurge, '高潮'],
  [ShelterTypeEnum.Earthquake, '地震'],
  [ShelterTypeEnum.Tsunami, '津波'],
  [ShelterTypeEnum.BigFire, '大規模な火事'],
  [ShelterTypeEnum.FloodWithinLevee, '内水氾濫'],
  [ShelterTypeEnum.VolcanicActivity, '火山現象'],
]);

export function getShelterTypeTableLabel(key: ShelterTypeKey): string {
  if (key === ShelterTypeEnum.Landslide) {
    return '崖崩れ';
  }
  if (key === ShelterTypeEnum.BigFire) {
    return '火事';
  }

  return ShelterTypeJapanese.get(key) ?? key;
}
