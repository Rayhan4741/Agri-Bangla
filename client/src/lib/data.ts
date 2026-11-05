/**
 * Local data-access layer. Every page reads agricultural content through these
 * typed selectors instead of importing JSON directly, so content is never duplicated.
 */
import cropsJson from '@/data/crops.json';
import categoriesJson from '@/data/cropCategories.json';
import diseasesJson from '@/data/cropDiseases.json';
import fertilizerJson from '@/data/fertilizerGuides.json';
import irrigationJson from '@/data/irrigationGuides.json';
import livestockJson from '@/data/livestock.json';
import poultryJson from '@/data/poultry.json';
import fisheriesJson from '@/data/fisheries.json';
import weatherJson from '@/data/weatherGuides.json';
import marketJson from '@/data/marketSamples.json';
import calculatorsJson from '@/data/farmingCalculators.json';
import calendarJson from '@/data/seasonalCalendar.json';
import resourcesJson from '@/data/governmentResources.json';
import faqJson from '@/data/agriculturalFaq.json';
import glossaryJson from '@/data/glossary.json';
import learningJson from '@/data/learningResources.json';
import advisoriesJson from '@/data/sampleAdvisories.json';
import type {
  AnimalGuide,
  Crop,
  CropCategory,
  CropDisease,
  FaqItem,
  FarmingCalculatorsFile,
  FertilizerGuide,
  FisheriesGuide,
  GlossaryTerm,
  GovernmentResource,
  IrrigationGuide,
  LearningResource,
  MarketSamplesFile,
  SampleAdvisory,
  SeasonalCalendarFile,
  SeasonId,
  WeatherGuidesFile,
} from '@/types';

export const crops = cropsJson as Crop[];
export const cropCategories = categoriesJson as CropCategory[];
export const diseases = diseasesJson as CropDisease[];
export const fertilizerGuides = fertilizerJson as FertilizerGuide[];
export const irrigationGuides = irrigationJson as IrrigationGuide[];
export const livestock = livestockJson as AnimalGuide[];
export const poultry = poultryJson as AnimalGuide[];
export const fisheriesGuides = fisheriesJson as FisheriesGuide[];
export const weatherData = weatherJson as WeatherGuidesFile;
export const marketData = marketJson as MarketSamplesFile;
export const calculatorsData = calculatorsJson as FarmingCalculatorsFile;
export const calendarData = calendarJson as SeasonalCalendarFile;
export const governmentResources = resourcesJson as GovernmentResource[];
export const faqs = faqJson as FaqItem[];
export const glossary = glossaryJson as GlossaryTerm[];
export const learningResources = learningJson as LearningResource[];
export const advisories = advisoriesJson as SampleAdvisory[];

export const animals = [...livestock, ...poultry];

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const cropMap = byId(crops);
const diseaseMap = byId(diseases);
const resourceMap = byId(governmentResources);
const fertMap = byId(fertilizerGuides);
const irrMap = byId(irrigationGuides);

export const getCrop = (id?: string | null) => (id ? cropMap.get(id) : undefined);
export const getDisease = (id?: string | null) => (id ? diseaseMap.get(id) : undefined);
export const getResource = (id: string) => resourceMap.get(id);
export const getFertilizerGuide = (id: string) => fertMap.get(id);
export const getIrrigationGuide = (id: string) => irrMap.get(id);
export const getCategory = (id: string) => cropCategories.find((c) => c.id === id);

export function resourcesFor(ids: string[]): GovernmentResource[] {
  return ids.map((id) => resourceMap.get(id)).filter((r): r is GovernmentResource => !!r);
}

export function cropsInCategory(categoryId: string): Crop[] {
  return crops.filter((c) => c.category === categoryId);
}

export function cropsInSeason(season: SeasonId): Crop[] {
  return crops.filter((c) => c.seasons.includes(season));
}

export function diseasesForCrop(cropId: string): CropDisease[] {
  const crop = getCrop(cropId);
  const fromCrop = crop ? crop.diseaseIds.map((id) => diseaseMap.get(id)).filter(Boolean) : [];
  const fromDisease = diseases.filter((d) => d.cropIds.includes(cropId));
  const seen = new Set<string>();
  return [...fromCrop, ...fromDisease].filter((d): d is CropDisease => {
    if (!d || seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

export function cropsForDisease(d: CropDisease): Crop[] {
  return d.cropIds.map((id) => cropMap.get(id)).filter((c): c is Crop => !!c);
}

export const DISEASE_TYPE_BN: Record<CropDisease['type'], string> = {
  fungal: 'ছত্রাকজনিত',
  bacterial: 'ব্যাকটেরিয়াজনিত',
  viral: 'ভাইরাসজনিত',
  pest: 'পোকামাকড়',
  nutrient: 'পুষ্টির অভাব',
  physiological: 'শারীরবৃত্তীয়',
};

export const SEASON_BN: Record<SeasonId, string> = {
  rabi: 'রবি',
  'kharif-1': 'খরিফ-১',
  'kharif-2': 'খরিফ-২',
  'year-round': 'সারা বছর',
};

/** Simple href helpers so links stay consistent everywhere. */
export const hrefFor = {
  crop: (id: string) => `/crops/${id}`,
  disease: (id: string) => `/diseases?d=${id}`,
  fertilizer: (id: string) => `/fertilizer#${id}`,
  irrigation: (id: string) => `/fertilizer#${id}`,
  animal: (id: string) => `/livestock#${id}`,
  fisheries: (id: string) => `/fisheries#${id}`,
  weather: (id: string) => `/weather#${id}`,
  learn: (id: string) => `/learn#${id}`,
  faq: (id: string) => `/ai-assistant?q=${id}`,
};

/**
 * Replaces the bundled content with the live copy from the API, in place, so every
 * module that imported these arrays sees the update. Returns false when nothing changed.
 */
export function applyContentBundle(files: Record<string, unknown>): boolean {
  const swap = <T>(target: T[], src: unknown) => {
    if (Array.isArray(src) && src.length) target.splice(0, target.length, ...(src as T[]));
  };
  const assign = (target: object, src: unknown) => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return;
    for (const k of Object.keys(target)) delete (target as Record<string, unknown>)[k];
    Object.assign(target, src);
  };
  swap(crops, files.crops);
  swap(cropCategories, files.cropCategories);
  swap(diseases, files.cropDiseases);
  swap(fertilizerGuides, files.fertilizerGuides);
  swap(irrigationGuides, files.irrigationGuides);
  swap(livestock, files.livestock);
  swap(poultry, files.poultry);
  swap(fisheriesGuides, files.fisheries);
  swap(governmentResources, files.governmentResources);
  swap(faqs, files.agriculturalFaq);
  swap(glossary, files.glossary);
  swap(learningResources, files.learningResources);
  swap(advisories, files.sampleAdvisories);
  assign(weatherData, files.weatherGuides);
  assign(marketData, files.marketSamples);
  assign(calculatorsData, files.farmingCalculators);
  assign(calendarData, files.seasonalCalendar);
  animals.splice(0, animals.length, ...livestock, ...poultry);
  const rebuild = <T extends { id: string }>(m: Map<string, T>, list: T[]) => {
    m.clear();
    list.forEach((x) => m.set(x.id, x));
  };
  rebuild(cropMap, crops);
  rebuild(diseaseMap, diseases);
  rebuild(resourceMap, governmentResources);
  rebuild(fertMap, fertilizerGuides);
  rebuild(irrMap, irrigationGuides);
  return true;
}

/** The bundled content in the API's file shape (used to skip a re-render when nothing changed). */
export function currentContentFiles(): Record<string, unknown> {
  return {
    crops, cropCategories, cropDiseases: diseases, fertilizerGuides, irrigationGuides, livestock, poultry, fisheries: fisheriesGuides,
    governmentResources, agriculturalFaq: faqs, glossary, learningResources, sampleAdvisories: advisories,
    weatherGuides: weatherData, marketSamples: marketData, farmingCalculators: calculatorsData, seasonalCalendar: calendarData,
  };
}
