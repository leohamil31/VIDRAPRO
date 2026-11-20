import { GLASS_KG_PER_M2_MM } from '../catalog';

/** Profile cut length: nearest whole millimetre. */
export const mm = (v: number) => Math.round(v);

/** Glass size: always round DOWN — a glass 1 mm short fits, 1 mm long doesn't. */
export const glassMm = (v: number) => Math.floor(v);

export const glassWeightKg = (wMm: number, hMm: number, thicknessMm: number) =>
  (wMm / 1000) * (hMm / 1000) * thicknessMm * GLASS_KG_PER_M2_MM;
