import type { AccessoryUnit, Finish, GlassCode } from './types';

export const ENGINE_VERSION = '2.0.0';
export const STANDARD_BAR_MM = 6000;
export const SAW_KERF_MM = 4;
/** Glass density ≈ 2.5 kg per m² per mm of thickness. */
export const GLASS_KG_PER_M2_MM = 2.5;

// ---------------------------------------------------------------------------
// Finishes (aluminium colour — priced per kg)
// ---------------------------------------------------------------------------
export const FINISHES: Record<Finish, { label: string; hex: string; defaultPrice: number }> = {
  BRANCO:        { label: 'Branco',        hex: '#F4F6F8', defaultPrice: 48 },
  PRETO:         { label: 'Preto',         hex: '#1F2329', defaultPrice: 58 },
  NATURAL_FOSCO: { label: 'Natural Fosco', hex: '#B9BEC4', defaultPrice: 44 },
  BRONZE:        { label: 'Bronze',        hex: '#5B4636', defaultPrice: 56 },
  CHAMPANHE:     { label: 'Champanhe',     hex: '#C9B48F', defaultPrice: 56 },
  AMADEIRADO:    { label: 'Amadeirado',    hex: '#8A5A36', defaultPrice: 72 },
};

// ---------------------------------------------------------------------------
// Glass
// ---------------------------------------------------------------------------
export interface GlassSpec { label: string; thicknessMm: number; tempered: boolean; laminated?: boolean; tint: string; defaultPrice: number }

export const GLASSES: Record<GlassCode, GlassSpec> = {
  SEM_VIDRO:              { label: 'Sem vidro',                       thicknessMm: 0,  tempered: false, tint: '#ffffff', defaultPrice: 0 },
  COMUM_INCOLOR_4:        { label: 'Comum Incolor 4mm',               thicknessMm: 4,  tempered: false, tint: '#DCEFFB', defaultPrice: 95 },
  COMUM_FUME_4:           { label: 'Comum Fumê 4mm',                  thicknessMm: 4,  tempered: false, tint: '#A7B0B9', defaultPrice: 120 },
  COMUM_MINIBOREAL_4:     { label: 'Mini Boreal 4mm',                 thicknessMm: 4,  tempered: false, tint: '#E8EEF3', defaultPrice: 120 },
  COMUM_CANELADO_4:       { label: 'Canelado 4mm',                    thicknessMm: 4,  tempered: false, tint: '#E3ECF2', defaultPrice: 135 },
  TEMPERADO_INCOLOR_6:    { label: 'Temperado Incolor 6mm',           thicknessMm: 6,  tempered: true,  tint: '#D4EBFA', defaultPrice: 160 },
  TEMPERADO_INCOLOR_8:    { label: 'Temperado Incolor 8mm',           thicknessMm: 8,  tempered: true,  tint: '#CDE7F8', defaultPrice: 210 },
  TEMPERADO_FUME_8:       { label: 'Temperado Fumê 8mm',              thicknessMm: 8,  tempered: true,  tint: '#9AA4AE', defaultPrice: 260 },
  TEMPERADO_VERDE_8:      { label: 'Temperado Verde 8mm',             thicknessMm: 8,  tempered: true,  tint: '#BFE3D0', defaultPrice: 250 },
  TEMPERADO_BRONZE_8:     { label: 'Temperado Bronze 8mm',            thicknessMm: 8,  tempered: true,  tint: '#C9A98A', defaultPrice: 265 },
  TEMPERADO_INCOLOR_10:   { label: 'Temperado Incolor 10mm',          thicknessMm: 10, tempered: true,  tint: '#C6E2F5', defaultPrice: 280 },
  LAMINADO_INCOLOR_8:     { label: 'Laminado Incolor 8mm (4+4)',      thicknessMm: 8,  tempered: false, laminated: true, tint: '#D2E9F7', defaultPrice: 260 },
  LAMINADO_TEMPERADO_10:  { label: 'Laminado Temperado 10mm (5+5)',   thicknessMm: 10, tempered: true,  laminated: true, tint: '#C8E3F5', defaultPrice: 480 },
  LAMINADO_TEMPERADO_12:  { label: 'Laminado Temperado 12mm (6+6)',   thicknessMm: 12, tempered: true,  laminated: true, tint: '#C1DFF3', defaultPrice: 560 },
  REFLETIVO_PRATA_8:      { label: 'Laminado Refletivo Prata 8mm',    thicknessMm: 8,  tempered: false, laminated: true, tint: '#AFC3D1', defaultPrice: 340 },
};

// ---------------------------------------------------------------------------
// Accessories — priced individually (unit or metre). Reference prices in BRL.
// ---------------------------------------------------------------------------
export interface AccessorySpec { label: string; unit: AccessoryUnit; group: 'Esquadrias' | 'Temperado' | 'Fachada e guarda-corpo' | 'Instalação'; defaultPrice: number }

export const ACCESSORIES = {
  // Esquadrias
  ROLDANA_JANELA:        { label: 'Roldana para janela de correr',               unit: 'un', group: 'Esquadrias', defaultPrice: 6.5 },
  ROLDANA_PORTA:         { label: 'Roldana dupla com rolamento (porta de correr)', unit: 'un', group: 'Esquadrias', defaultPrice: 22 },
  FECHO_CONCHA:          { label: 'Fecho concha / trinco lateral',               unit: 'un', group: 'Esquadrias', defaultPrice: 14 },
  FECHO_CENTRAL:         { label: 'Fecho central (encontro de folhas)',          unit: 'un', group: 'Esquadrias', defaultPrice: 18 },
  FECHO_MAXIM_AR:        { label: 'Fecho / cremona para maxim-ar',               unit: 'un', group: 'Esquadrias', defaultPrice: 24 },
  FECHADURA_CORRER:      { label: 'Fechadura para porta de correr (bico de papagaio)', unit: 'un', group: 'Esquadrias', defaultPrice: 65 },
  FECHADURA_GIRO:        { label: 'Fechadura para porta de giro (máquina 40 mm)', unit: 'un', group: 'Esquadrias', defaultPrice: 75 },
  MACANETA:              { label: 'Conjunto de maçanetas com espelho',           unit: 'un', group: 'Esquadrias', defaultPrice: 55 },
  CILINDRO_CHAVE:        { label: 'Cilindro com chaves',                         unit: 'un', group: 'Esquadrias', defaultPrice: 32 },
  PUXADOR_CONCHA:        { label: 'Puxador concha',                              unit: 'un', group: 'Esquadrias', defaultPrice: 6 },
  PUXADOR_TUBULAR:       { label: 'Puxador tubular 30 cm (alumínio)',            unit: 'un', group: 'Esquadrias', defaultPrice: 48 },
  DOBRADICA_ALUMINIO:    { label: 'Dobradiça de alumínio',                       unit: 'un', group: 'Esquadrias', defaultPrice: 16 },
  FERROLHO:              { label: 'Fecho unha / ferrolho (folha passiva)',       unit: 'un', group: 'Esquadrias', defaultPrice: 19 },
  BRACO_MAXIM_AR:        { label: 'Braço articulado maxim-ar (par)',             unit: 'un', group: 'Esquadrias', defaultPrice: 42 },
  PIVO_BASCULANTE:       { label: 'Pivô / articulação para basculante (par)',    unit: 'un', group: 'Esquadrias', defaultPrice: 9 },
  HASTE_BASCULANTE:      { label: 'Haste de comando para basculante',            unit: 'un', group: 'Esquadrias', defaultPrice: 28 },
  ESCOVA_VEDACAO:        { label: 'Escova de vedação (felpa)',                   unit: 'm',  group: 'Esquadrias', defaultPrice: 1.2 },
  GUARNICAO_EPDM:        { label: 'Guarnição EPDM para vidro',                   unit: 'm',  group: 'Esquadrias', defaultPrice: 1.8 },
  BATENTE_STOP:          { label: 'Batente / stop de folha',                     unit: 'un', group: 'Esquadrias', defaultPrice: 2.5 },
  CANTONEIRA_ESQUADRO:   { label: 'Cantoneira de esquadro (canto 45°)',          unit: 'un', group: 'Esquadrias', defaultPrice: 1.6 },
  // Temperado
  ROLDANA_BOX:           { label: 'Roldana para box',                            unit: 'un', group: 'Temperado', defaultPrice: 18 },
  PUXADOR_BOX:           { label: 'Puxador para box (furo duplo)',               unit: 'un', group: 'Temperado', defaultPrice: 32 },
  BATEDOR_BOX:           { label: 'Batedor / stop para box',                     unit: 'un', group: 'Temperado', defaultPrice: 6 },
  SUPORTE_CANTO_BOX:     { label: 'Suporte de canto para box',                   unit: 'un', group: 'Temperado', defaultPrice: 28 },
  FIXADOR_VIDRO:         { label: 'Fixador / prendedor de vidro fixo',           unit: 'un', group: 'Temperado', defaultPrice: 6 },
  PIVO_SUPERIOR:         { label: 'Pivô superior (dobradiça superior)',          unit: 'un', group: 'Temperado', defaultPrice: 85 },
  PIVO_INFERIOR:         { label: 'Pivô inferior (dobradiça inferior)',          unit: 'un', group: 'Temperado', defaultPrice: 85 },
  DOBRADICA_TEMPERADO:   { label: 'Dobradiça para vidro temperado',              unit: 'un', group: 'Temperado', defaultPrice: 95 },
  FECHADURA_TEMPERADO:   { label: 'Fechadura de vidro com contra-fechadura',     unit: 'un', group: 'Temperado', defaultPrice: 120 },
  PUXADOR_TEMPERADO:     { label: 'Puxador tubular para temperado 60 cm',        unit: 'un', group: 'Temperado', defaultPrice: 110 },
  ROLDANA_APARENTE:      { label: 'Roldana aparente para porta de correr',       unit: 'un', group: 'Temperado', defaultPrice: 75 },
  GUIA_INFERIOR:         { label: 'Guia inferior de piso (porta de correr)',     unit: 'un', group: 'Temperado', defaultPrice: 22 },
  ROLDANA_JANELA_TEMP:   { label: 'Roldana para janela temperada',               unit: 'un', group: 'Temperado', defaultPrice: 14 },
  TRINCO_JANELA_TEMP:    { label: 'Trinco / fecho para janela temperada',        unit: 'un', group: 'Temperado', defaultPrice: 22 },
  ROLDANA_SACADA:        { label: 'Carrinho / roldana para sacada',              unit: 'un', group: 'Temperado', defaultPrice: 45 },
  PIVO_SACADA:           { label: 'Pivô giratório de sacada',                    unit: 'un', group: 'Temperado', defaultPrice: 38 },
  FECHO_SACADA:          { label: 'Fecho / trava de folha de sacada',            unit: 'un', group: 'Temperado', defaultPrice: 18 },
  CALCO_U:               { label: 'Calço / cunha de fixação no perfil U',        unit: 'un', group: 'Temperado', defaultPrice: 3.5 },
  // Fachada e guarda-corpo
  ANCORAGEM_FACHADA:     { label: 'Ancoragem / suporte de coluna (fachada)',     unit: 'un', group: 'Fachada e guarda-corpo', defaultPrice: 35 },
  SILICONE_ESTRUTURAL:   { label: 'Silicone estrutural (sachê 600 ml)',          unit: 'un', group: 'Fachada e guarda-corpo', defaultPrice: 85 },
  FIXADOR_COLUNA:        { label: 'Chapa de fixação de coluna (guarda-corpo)',   unit: 'un', group: 'Fachada e guarda-corpo', defaultPrice: 25 },
  TAMPA_CORRIMAO:        { label: 'Tampa / terminal de corrimão',                unit: 'un', group: 'Fachada e guarda-corpo', defaultPrice: 9 },
  // Instalação
  PARAFUSO_KIT:          { label: 'Kit parafusos e buchas de instalação',       unit: 'un', group: 'Instalação', defaultPrice: 8 },
  SILICONE:              { label: 'Silicone neutro (tubo 280 g)',                unit: 'un', group: 'Instalação', defaultPrice: 28 },
  ESPUMA_PU:             { label: 'Espuma expansiva PU (lata)',                  unit: 'un', group: 'Instalação', defaultPrice: 35 },
} satisfies Record<string, AccessorySpec>;

export type AccessoryCode = keyof typeof ACCESSORIES;

// ---------------------------------------------------------------------------
// Tempered-glass system profiles (not line-dependent, sold in the chosen finish)
// ---------------------------------------------------------------------------
export const TEMPERED_PROFILES = {
  BOX_TRILHO:        { code: 'TP-BXT', name: 'Trilho superior box',                  kgPerM: 0.540 },
  U_INFERIOR:        { code: 'TP-UI',  name: 'Perfil U inferior (fixos)',             kgPerM: 0.155 },
  U_LATERAL:         { code: 'TP-UL',  name: 'Perfil U lateral',                      kgPerM: 0.155 },
  U_SUPERIOR:        { code: 'TP-US',  name: 'Perfil U superior',                     kgPerM: 0.155 },
  CANTONEIRA:        { code: 'TP-CT',  name: 'Cantoneira de batida',                  kgPerM: 0.120 },
  BATENTE:           { code: 'TP-BT',  name: 'Batente (cantoneira de porta)',         kgPerM: 0.210 },
  TRILHO_APARENTE:   { code: 'TP-TAP', name: 'Trilho aparente (porta de correr)',     kgPerM: 1.150 },
  JANELA_TRILHO_SUP: { code: 'TP-JTS', name: 'Trilho superior janela temperada',      kgPerM: 0.480 },
  JANELA_TRILHO_INF: { code: 'TP-JTI', name: 'Trilho inferior janela temperada',      kgPerM: 0.520 },
  SACADA_TRILHO_SUP: { code: 'TP-STS', name: 'Trilho superior sacada',                kgPerM: 1.380 },
  SACADA_TRILHO_INF: { code: 'TP-STI', name: 'Trilho inferior sacada',                kgPerM: 1.120 },
  SACADA_PERFIL_FOLHA:{ code: 'TP-SPF', name: 'Perfil de folha sacada (sup./inf.)',   kgPerM: 0.410 },
  SACADA_ARREMATE:   { code: 'TP-SAR', name: 'Perfil de arremate lateral sacada',     kgPerM: 0.300 },
  GC_PERFIL_U:       { code: 'TP-GCU', name: 'Perfil U de base guarda-corpo (embutido)', kgPerM: 2.350 },
  GC_CORRIMAO:       { code: 'TP-GCC', name: 'Corrimão com fenda (tubo de topo)',     kgPerM: 0.980 },
} as const;

export const TEMPERED_PARAMS = {
  transpasse: 50,
  box: { maxWidth2F: 1400, alturaFixoDesc: 15, alturaMovelDesc: 35, uLateralDesc: 15 },
  pivot: { folgaLateral: 4, folgaPiso: 10, folgaSuperior: 5, maxLeafKg: 80 },
  abrir: { folgaLateral: 3, folgaPiso: 10, folgaSuperior: 5 },
  correr: { maxWidth2F: 2000, alturaFixoDesc: 15, alturaMovelDesc: 30 },
  janela: { alturaDesc: 40 },
  fixo: { folga: 5 },
  sacada: { painelMax: 700, folgaLateral: 10, junta: 3, alturaDesc: 60 },
  guardaCorpo: { painelMax: 1200, junta: 10, folgaLateral: 5, embutimento: 90, folgaTopo: 40 },
};
