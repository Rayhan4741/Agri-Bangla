/**
 * Shared TypeScript interfaces for every JSON file in src/data/.
 * Keep these in sync with docs/DATA.md.
 */

/** How trustworthy a record is. */
export type DataStatus =
  | 'verified' // content checked against a named official source
  | 'link-checked' // only the URL/domain was confirmed to be live
  | 'illustrative' // educational sample written for this demo; verify before acting
  | 'unverified';

/** Fields every content record carries. */
export interface RecordMeta {
  /** Documents this record was actually derived from (ids in governmentResources.json). Empty when written as illustrative content. */
  sourceIds: string[];
  /** Organisations where a farmer can verify / get official advice (ids in governmentResources.json). */
  verifyWithIds: string[];
  /** ISO date (YYYY-MM-DD) of the last review, or null when never reviewed. */
  lastVerified: string | null;
  dataStatus: DataStatus;
}

export type SeasonId = 'rabi' | 'kharif-1' | 'kharif-2' | 'year-round';

export interface CropStage {
  nameBn: string;
  durationBn?: string;
  tasksBn: string[];
}

export type GrowthModel = 'rice' | 'grain' | 'vegetable' | 'vine' | 'tree' | 'tuber' | 'other';

export interface Crop extends RecordMeta {
  id: string;
  nameBn: string;
  nameEn: string;
  category: string;
  seasons: SeasonId[];
  icon: string;
  descriptionBn: string;
  durationBn?: string;
  stages: CropStage[];
  soilTypes: string[];
  irrigation: string[];
  fertilizerGuideIds: string[];
  irrigationGuideIds: string[];
  diseaseIds: string[];
  tipsBn: string[];
  harvestBn?: string;
  storageBn?: string;
  keywords: string[];
  growthModel: GrowthModel;
}

export interface CropCategory {
  id: string;
  nameBn: string;
  nameEn: string;
  icon: string;
  descriptionBn: string;
}

export type DiseaseType = 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient' | 'physiological';
export type PlantPart = 'leaf' | 'stem' | 'fruit' | 'root' | 'whole' | 'grain';
export type SymptomColor = 'yellow' | 'brown' | 'black' | 'white' | 'red' | 'grey' | 'green';
export type SymptomPattern = 'spots' | 'stripes' | 'wilting' | 'rot' | 'holes' | 'curl' | 'powder' | 'dry' | 'stunted' | 'insects';

export interface CropDisease extends RecordMeta {
  id: string;
  nameBn: string;
  nameEn: string;
  cropIds: string[];
  type: DiseaseType;
  parts: PlantPart[];
  colors: SymptomColor[];
  patterns: SymptomPattern[];
  symptomsBn: string[];
  causeBn: string;
  favorableConditionsBn: string;
  preventionBn: string[];
  safeNextStepsBn: string[];
  whenToSeekHelpBn: string;
  keywords: string[];
  /** Individual statements checked against an official document (the rest of the record may still be illustrative). */
  sourcedFactsBn?: SourcedFact[];
  sourceUrls?: string[];
}

export interface SourcedFact {
  textBn: string;
  sourceBn: string;
  url: string;
  /** YYYY-MM-DD the statement was checked against the source */
  checked: string;
}

export interface TopicGuide extends RecordMeta {
  id: string;
  titleBn: string;
  topic: string;
  icon: string;
  summaryBn: string;
  pointsBn: string[];
  cautionBn?: string;
  cropIds?: string[];
  keywords: string[];
}

export type FertilizerGuide = TopicGuide;
export type IrrigationGuide = TopicGuide;
export type FisheriesGuide = TopicGuide;

export interface AnimalDiseaseSign {
  nameBn: string;
  signsBn: string;
  actionBn: string;
}

export interface AnimalGuide extends RecordMeta {
  id: string;
  nameBn: string;
  nameEn: string;
  kind: 'livestock' | 'poultry';
  icon: string;
  overviewBn: string;
  feedingBn: string[];
  careBn: string[];
  hygieneBn: string[];
  housingBn: string[];
  warningSignsBn: string[];
  diseases: AnimalDiseaseSign[];
  keywords: string[];
}

export type HazardId = 'heavy-rain' | 'flood' | 'flash-flood' | 'drought' | 'heat' | 'humidity' | 'salinity' | 'cyclone' | 'cold' | 'irrigation' | 'seasonal';

export interface WeatherGuide extends RecordMeta {
  id: string;
  hazard: HazardId;
  titleBn: string;
  icon: string;
  summaryBn: string;
  beforeBn: string[];
  duringBn: string[];
  afterBn: string[];
  keywords: string[];
}

export type RiskMetric = 'humidityMean' | 'precipSum' | 'tempMax' | 'tempMin' | 'windMax' | 'dryDays';

export interface WeatherRiskRule {
  id: string;
  titleBn: string;
  metric: RiskMetric;
  op: 'gte' | 'lte';
  threshold: number;
  /** number of consecutive forecast days the condition must hold */
  consecutiveDays: number;
  level: 'watch' | 'warning';
  adviceBn: string;
  guideId: string;
}

export interface SprayRule {
  maxWindKmh: number;
  rainFreeHoursAfter: number;
  startHour: number;
  endHour: number;
  noteBn: string;
}

export interface WeatherGuidesFile {
  guides: WeatherGuide[];
  riskRules: WeatherRiskRule[];
  sprayRule: SprayRule;
  disclaimerBn: string;
}

export interface Market {
  id: string;
  nameBn: string;
  districtId: string;
}

export interface Commodity {
  id: string;
  nameBn: string;
  cropId?: string;
}

export interface MarketRecord {
  commodityId: string;
  marketId: string;
  period: number; // 1..12 sample period index
  priceBdtPerKg: number;
}

export interface MarketSamplesFile {
  noticeBn: string;
  dataStatus: DataStatus;
  periodLabelBn: string;
  markets: Market[];
  commodities: Commodity[];
  records: MarketRecord[];
}

export interface LandUnit {
  id: string;
  nameBn: string;
  nameEn: string;
  /** square metres in one unit (default; regional units may be edited by the user) */
  sqm: number;
  editable: boolean;
  noteBn?: string;
}

export interface FertilizerProduct {
  id: string;
  nameBn: string;
  nameEn: string;
  /** nutrient fraction by mass (0–1) for the main nutrients the product supplies */
  nutrients: Partial<Record<'N' | 'P' | 'K' | 'S' | 'Zn' | 'B', number>>;
  noteBn: string;
}

export interface CalculatorInfo {
  id: string;
  titleBn: string;
  icon: string;
  descriptionBn: string;
  formulaBn: string;
  assumptionsBn: string[];
}

export interface FarmingCalculatorsFile {
  landUnits: LandUnit[];
  fertilizerProducts: FertilizerProduct[];
  calculators: CalculatorInfo[];
}

export interface CalendarTask {
  id: string;
  cropId?: string;
  stageBn: string;
  taskBn: string;
}

export interface CalendarMonth {
  month: number; // 1..12
  nameBn: string;
  banglaMonthsBn: string;
  seasonId: SeasonId;
  focusBn: string;
  tasks: CalendarTask[];
}

export interface Season {
  id: SeasonId;
  nameBn: string;
  monthsBn: string;
  descriptionBn: string;
}

export interface SeasonalCalendarFile extends RecordMeta {
  variationNoteBn: string;
  seasons: Season[];
  months: CalendarMonth[];
  cropTimelines: { cropId: string; segments: { stageBn: string; startMonth: number; endMonth: number }[] }[];
}

export interface GovernmentResource {
  id: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  url: string;
  category: 'extension' | 'research' | 'livestock' | 'fisheries' | 'market' | 'weather' | 'university' | 'ministry';
  verificationStatus: DataStatus;
  lastVerified: string | null;
  verificationNoteBn: string;
}

export interface FaqItem extends RecordMeta {
  id: string;
  questionBn: string;
  answerBn: string;
  stepsBn?: string[];
  category: 'crop' | 'disease' | 'fertilizer' | 'livestock' | 'poultry' | 'fisheries' | 'weather' | 'market' | 'general';
  keywords: string[];
  relatedIds: string[];
  followUpsBn: string[];
  needsExpert?: boolean;
}

export interface GlossaryTerm {
  id: string;
  termBn: string;
  termEn: string;
  definitionBn: string;
}

export interface QuizQuestion {
  qBn: string;
  optionsBn: string[];
  answerIndex: number;
  explainBn: string;
}

export interface LearningResource extends RecordMeta {
  id: string;
  titleBn: string;
  topic: string;
  icon: string;
  minutes: number;
  summaryBn: string;
  contentBn: string[];
  quiz: QuizQuestion[];
}

export interface District {
  id: string;
  nameBn: string;
  nameEn: string;
  divisionBn: string;
  divisionEn: string;
  /** approximate district centre — used only for weather lookup and the stylised map */
  lat: number;
  lon: number;
  hazards: ('flood' | 'flash-flood' | 'salinity' | 'drought' | 'cyclone' | 'river-erosion')[];
}

export interface Upazila {
  id: string;
  districtId: string;
  nameBn: string;
  nameEn: string;
}

export interface SampleAdvisory extends RecordMeta {
  id: string;
  titleBn: string;
  bodyBn: string;
  cropIds: string[];
  seasonId: SeasonId;
  type: 'crop' | 'weather' | 'livestock' | 'fisheries';
}

/** A unified searchable document produced by the data layer. */
export interface SearchDoc {
  id: string;
  kind: 'crop' | 'disease' | 'faq' | 'fertilizer' | 'irrigation' | 'livestock' | 'poultry' | 'fisheries' | 'weather' | 'learn' | 'glossary';
  titleBn: string;
  snippetBn: string;
  href: string;
  text: string;
  keywords: string[];
  dataStatus: DataStatus;
  verifyWithIds: string[];
}
