import { toBnDigits } from './formatting';
import type { SeasonId } from '@/types';

const BANGLA_MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const RITU = ['গ্রীষ্ম', 'গ্রীষ্ম', 'বর্ষা', 'বর্ষা', 'শরৎ', 'শরৎ', 'হেমন্ত', 'হেমন্ত', 'শীত', 'শীত', 'বসন্ত', 'বসন্ত'];

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Bangla date using the revised Bangladesh calendar (2019): Boishakh 1 = 14 April,
 * Boishakh–Ashwin 31 days, Kartik–Poush–Magh 30, Falgun 29 (30 in a Gregorian leap year), Chaitra 30.
 */
export function banglaDate(d = new Date()) {
  const y = d.getFullYear();
  const startThisYear = new Date(y, 3, 14);
  const start = d >= startThisYear ? startThisYear : new Date(y - 1, 3, 14);
  const bYear = start.getFullYear() - 593;
  let days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
  const lengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeap(start.getFullYear() + 1) ? 30 : 29, 30];
  let m = 0;
  while (m < 11 && days >= lengths[m]) {
    days -= lengths[m];
    m++;
  }
  return {
    day: days + 1,
    monthIndex: m,
    monthBn: BANGLA_MONTHS[m],
    year: bYear,
    rituBn: RITU[m],
    labelBn: `${toBnDigits(days + 1)} ${BANGLA_MONTHS[m]} ${toBnDigits(bYear)}`,
  };
}

/** Cropping season for a Gregorian month (1–12). Boundaries vary by region and year. */
export function cropSeasonForMonth(month: number): SeasonId {
  if (month >= 11 || month <= 2) return 'rabi';
  if (month >= 3 && month <= 6) return 'kharif-1';
  return 'kharif-2';
}

export const SEASON_LABEL_BN: Record<SeasonId, string> = {
  rabi: 'রবি মৌসুম',
  'kharif-1': 'খরিফ-১ মৌসুম',
  'kharif-2': 'খরিফ-২ মৌসুম',
  'year-round': 'সারা বছর',
};
