import districtsJson from '@/data/districts.json';
import upazilasJson from '@/data/upazilas.json';
import type { District, Upazila } from '@/types';

export const districts = districtsJson as District[];
export const upazilas = upazilasJson as Upazila[];

export const districtsSorted = [...districts].sort((a, b) => a.nameBn.localeCompare(b.nameBn, 'bn'));

export function getDistrict(id: string | undefined | null): District | undefined {
  return id ? districts.find((d) => d.id === id) : undefined;
}

export function upazilasOf(districtId: string): Upazila[] {
  return upazilas.filter((u) => u.districtId === districtId);
}

export function getUpazila(id: string | undefined | null): Upazila | undefined {
  return id ? upazilas.find((u) => u.id === id) : undefined;
}

export const DIVISIONS = [...new Set(districts.map((d) => d.divisionBn))];

export const HAZARD_BN: Record<District['hazards'][number], string> = {
  flood: 'বন্যা',
  'flash-flood': 'আকস্মিক বন্যা (পাহাড়ি ঢল)',
  salinity: 'লবণাক্ততা',
  drought: 'খরা',
  cyclone: 'ঘূর্ণিঝড়',
  'river-erosion': 'নদীভাঙন',
};

/** Swaps in districts/upazilas from the API (in place). */
export function applyGeoBundle(files: Record<string, unknown>) {
  if (Array.isArray(files.districts) && files.districts.length) districts.splice(0, districts.length, ...(files.districts as District[]));
  if (Array.isArray(files.upazilas) && files.upazilas.length) upazilas.splice(0, upazilas.length, ...(files.upazilas as Upazila[]));
  districtsSorted.splice(0, districtsSorted.length, ...[...districts].sort((a, b) => a.nameBn.localeCompare(b.nameBn, 'bn')));
  DIVISIONS.splice(0, DIVISIONS.length, ...new Set(districts.map((d) => d.divisionBn)));
}
