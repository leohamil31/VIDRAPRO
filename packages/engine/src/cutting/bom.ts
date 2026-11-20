import { ACCESSORIES, GLASSES, GLASS_KG_PER_M2_MM, type AccessoryCode } from '../catalog';
import { PROFILE_ROLES } from '../lines';
import type {
  AccessoryLine, CuttingList, Drawing, GlassCode, GlassCut, ItemInput, LeafGeometry, LineDefinition, ProfileCut, ProfileGroup,
} from '../types';

/** Profile length: nearest mm. */
export const mm = (v: number) => Math.round(v);
/** Glass: always round DOWN — 1 mm short fits, 1 mm long doesn't. */
export const glassMm = (v: number) => Math.floor(v);
export const glassKg = (wMm: number, hMm: number, code: GlassCode) =>
  (wMm / 1000) * (hMm / 1000) * GLASSES[code].thicknessMm * GLASS_KG_PER_M2_MM;
/** Round metres up to 0.1 m. */
export const metres = (mmTotal: number) => Math.ceil(mmTotal / 100) / 10;
/** Tubes/sachets: half units, rounded up. */
export const halves = (v: number) => Math.max(0.5, Math.ceil(v * 2) / 2);

/** Small builder that keeps recipes short and uniform. */
export class Bom {
  profiles: ProfileCut[] = [];
  glasses: GlassCut[] = [];
  private acc = new Map<string, AccessoryLine>();
  warnings: string[] = [];

  constructor(public input: ItemInput, public line: LineDefinition) {}

  /** Param from the line definition (throws a clear error if a custom line misses it). */
  param(group: string, key: string): number {
    const v = this.line.params?.[group]?.[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`A linha "${this.line.name}" não define o parâmetro ${group}.${key}.`);
    return v;
  }

  params<K extends string>(group: string, keys: readonly K[]): Record<K, number> {
    return Object.fromEntries(keys.map((k) => [k, this.param(group, k)])) as Record<K, number>;
  }

  /** Add a cut of a line profile by role. Skips zero/negative qty. */
  cut(role: string, lengthMm: number, qty: number, formula: string, opts: { angle?: 45 | 90; name?: string } = {}) {
    if (qty <= 0) return;
    const spec = this.line.profiles?.[role];
    if (!spec) throw new Error(`A linha "${this.line.name}" não possui o perfil "${role}".`);
    const roleMeta = PROFILE_ROLES[this.line.family]?.[role];
    this.profiles.push({
      role, code: spec.code, name: opts.name ?? spec.name, group: (roleMeta?.group ?? 'ESTRUTURA') as ProfileGroup,
      kgPerM: spec.kgPerM, lengthMm: mm(lengthMm), qty, cutAngle: opts.angle ?? 90, formula,
    });
  }

  /** Add a cut of a fixed (non-line) profile, e.g. tempered-glass systems. */
  cutFixed(spec: { code: string; name: string; kgPerM: number }, group: ProfileGroup, lengthMm: number, qty: number, formula: string) {
    if (qty <= 0) return;
    this.profiles.push({ role: spec.code, code: spec.code, name: spec.name, group, kgPerM: spec.kgPerM, lengthMm: mm(lengthMm), qty, cutAngle: 90, formula });
  }

  glass(label: string, widthMm: number, heightMm: number, qty: number, formula: string, notes?: string) {
    if (qty <= 0) return;
    const code = this.input.glassCode;
    const spec = GLASSES[code];
    this.glasses.push({
      label, glassCode: code, widthMm: glassMm(widthMm), heightMm: glassMm(heightMm), qty, tempered: spec.tempered, formula,
      notes: notes ?? (spec.tempered ? 'Temperado: medida final de fábrica, não recortar.' : undefined),
    });
  }

  /** Accumulates by code. `qty` is units, or metres for 'm' accessories. */
  add(code: AccessoryCode, qty: number) {
    if (!(qty > 0)) return;
    const spec = ACCESSORIES[code];
    const cur = this.acc.get(code);
    const next = Math.round(((cur?.qty ?? 0) + qty) * 100) / 100;
    this.acc.set(code, { code, name: spec.label, unit: spec.unit, qty: next });
  }

  /** Glass rubber both faces of each pane. */
  addGlassSeal(wMm: number, hMm: number, panes: number) {
    this.add('GUARNICAO_EPDM', metres(2 * 2 * (wMm + hMm) * panes));
  }

  /** Standard installation consumables for a framed item of perimeter (2L + 2H). */
  addInstallation(perimeterMm: number) {
    this.add('PARAFUSO_KIT', 1);
    this.add('SILICONE', halves(perimeterMm / 1000 / 8));   // ≈ 8 m of bead per tube
  }

  warnIf(cond: boolean, msg: string) { if (cond) this.warnings.push(msg); }

  build(leaves: LeafGeometry, drawing: Drawing): CuttingList {
    return {
      typology: this.input.typology, line: this.line.id, lineName: this.line.name, input: this.input,
      profiles: this.profiles, glasses: this.glasses, accessories: [...this.acc.values()],
      leaves, drawing, warnings: this.warnings,
    };
  }
}
