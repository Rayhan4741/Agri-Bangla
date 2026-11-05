/**
 * Commodities tracked in TCB's "ঢাকা মহানগরীর নিত্য প্রয়োজনীয় পণ্যের খুচরা বাজার দর".
 * This is only a naming catalogue used to recognise rows in uploaded reports —
 * it contains no prices. Admins can map unrecognised rows by hand.
 */
export interface Commodity {
  key: string;
  nameBn: string;
  nameEn: string;
  category: 'rice' | 'flour' | 'oil' | 'pulses' | 'vegetables' | 'spices' | 'fish-meat' | 'egg-dairy' | 'other';
  unitBn: string;
  aliases: string[];
  /** cropIds in content data that this commodity relates to (for links/AI context). */
  cropIds?: string[];
}

export const COMMODITIES: Commodity[] = [
  { key: 'rice-fine', nameBn: 'চাল (সরু)', nameEn: 'Rice (fine)', category: 'rice', unitBn: 'কেজি', aliases: ['চাল সরু', 'সরু চাল', 'নাজির', 'মিনিকেট'], cropIds: ['boro-rice', 'aman-rice'] },
  { key: 'rice-medium', nameBn: 'চাল (মাঝারি)', nameEn: 'Rice (medium)', category: 'rice', unitBn: 'কেজি', aliases: ['চাল মাঝারি', 'চাল মাঝারী', 'পাইজাম', 'লতা'], cropIds: ['boro-rice', 'aman-rice'] },
  { key: 'rice-coarse', nameBn: 'চাল (মোটা)', nameEn: 'Rice (coarse)', category: 'rice', unitBn: 'কেজি', aliases: ['চাল মোটা', 'মোটা চাল', 'স্বর্ণা', 'চায়না ইরি'], cropIds: ['boro-rice', 'aman-rice', 'aus-rice'] },
  { key: 'atta-loose', nameBn: 'আটা (খোলা)', nameEn: 'Atta (loose)', category: 'flour', unitBn: 'কেজি', aliases: ['আটা সাদা খোলা', 'আটা খোলা', 'আটা সাদা'], cropIds: ['wheat'] },
  { key: 'atta-packet', nameBn: 'আটা (প্যাকেট)', nameEn: 'Atta (packet)', category: 'flour', unitBn: 'কেজি', aliases: ['আটা প্যাকেট'], cropIds: ['wheat'] },
  { key: 'maida-loose', nameBn: 'ময়দা (খোলা)', nameEn: 'Maida (loose)', category: 'flour', unitBn: 'কেজি', aliases: ['ময়দা খোলা'], cropIds: ['wheat'] },
  { key: 'maida-packet', nameBn: 'ময়দা (প্যাকেট)', nameEn: 'Maida (packet)', category: 'flour', unitBn: 'কেজি', aliases: ['ময়দা প্যাকেট'], cropIds: ['wheat'] },
  { key: 'soybean-oil-loose', nameBn: 'সয়াবিন তেল (খোলা)', nameEn: 'Soybean oil (loose)', category: 'oil', unitBn: 'লিটার', aliases: ['সয়াবিন তেল লুজ', 'সয়াবিন তেল খোলা', 'সয়াবিন লুজ'] },
  { key: 'soybean-oil-5l', nameBn: 'সয়াবিন তেল (বোতল ৫ লিটার)', nameEn: 'Soybean oil (5 L bottle)', category: 'oil', unitBn: '৫ লিটার', aliases: ['সয়াবিন তেল বোতল ৫ লিটার', 'বোতল ৫ লিটার', '৫ লিটার বোতল'] },
  { key: 'soybean-oil-1l', nameBn: 'সয়াবিন তেল (বোতল ১ লিটার)', nameEn: 'Soybean oil (1 L bottle)', category: 'oil', unitBn: 'লিটার', aliases: ['সয়াবিন তেল বোতল ১ লিটার', 'বোতল ১ লিটার', '১ লিটার বোতল'] },
  { key: 'palm-oil-loose', nameBn: 'পাম অয়েল (খোলা)', nameEn: 'Palm oil (loose)', category: 'oil', unitBn: 'লিটার', aliases: ['পাম অয়েল লুজ', 'পাম তেল', 'পাম অয়েল খোলা'] },
  { key: 'super-palm-oil', nameBn: 'সুপার পাম অয়েল', nameEn: 'Super palm oil', category: 'oil', unitBn: 'লিটার', aliases: ['সুপার পাম'] },
  { key: 'rice-bran-oil', nameBn: 'রাইস ব্রান তেল', nameEn: 'Rice bran oil', category: 'oil', unitBn: 'লিটার', aliases: ['রাইস ব্রান'] },
  { key: 'mustard-oil', nameBn: 'সরিষার তেল', nameEn: 'Mustard oil', category: 'oil', unitBn: 'লিটার', aliases: ['সরিষার তেল', 'সরিষা তেল'], cropIds: ['mustard'] },
  { key: 'lentil-large', nameBn: 'মসুর ডাল (বড় দানা)', nameEn: 'Lentil (large grain)', category: 'pulses', unitBn: 'কেজি', aliases: ['মশুর ডাল বড় দানা', 'মসুর ডাল বড় দানা', 'মশুর বড়'], cropIds: ['lentil'] },
  { key: 'lentil-medium', nameBn: 'মসুর ডাল (মাঝারি দানা)', nameEn: 'Lentil (medium grain)', category: 'pulses', unitBn: 'কেজি', aliases: ['মশুর ডাল মাঝারী দানা', 'মসুর ডাল মাঝারি দানা', 'মশুর মাঝারী'], cropIds: ['lentil'] },
  { key: 'lentil-small', nameBn: 'মসুর ডাল (ছোট দানা)', nameEn: 'Lentil (small grain)', category: 'pulses', unitBn: 'কেজি', aliases: ['মশুর ডাল ছোট দানা', 'মসুর ডাল ছোট দানা', 'মশুর ছোট'], cropIds: ['lentil'] },
  { key: 'mung-dal', nameBn: 'মুগ ডাল', nameEn: 'Mung dal', category: 'pulses', unitBn: 'কেজি', aliases: ['মুগ ডাল', 'মুগ'] },
  { key: 'anchor-dal', nameBn: 'অ্যাংকর ডাল', nameEn: 'Anchor (pea) dal', category: 'pulses', unitBn: 'কেজি', aliases: ['এ্যাংকর ডাল', 'অ্যাংকর ডাল', 'এংকর'] },
  { key: 'chickpea', nameBn: 'ছোলা', nameEn: 'Chickpea', category: 'pulses', unitBn: 'কেজি', aliases: ['ছোলা'] },
  { key: 'potato', nameBn: 'আলু', nameEn: 'Potato', category: 'vegetables', unitBn: 'কেজি', aliases: ['আলু'], cropIds: ['potato'] },
  { key: 'onion-local', nameBn: 'পেঁয়াজ (দেশি)', nameEn: 'Onion (local)', category: 'vegetables', unitBn: 'কেজি', aliases: ['পিঁয়াজ দেশী', 'পেঁয়াজ দেশি', 'পিয়াজ দেশী', 'পেয়াজ দেশি'], cropIds: ['onion'] },
  { key: 'onion-imported', nameBn: 'পেঁয়াজ (আমদানি)', nameEn: 'Onion (imported)', category: 'vegetables', unitBn: 'কেজি', aliases: ['পিঁয়াজ আমদানী', 'পেঁয়াজ আমদানি', 'পিয়াজ আমদানী'], cropIds: ['onion'] },
  { key: 'garlic-local', nameBn: 'রসুন (দেশি)', nameEn: 'Garlic (local)', category: 'spices', unitBn: 'কেজি', aliases: ['রসুন দেশী', 'রসুন দেশি'], cropIds: ['garlic'] },
  { key: 'garlic-imported', nameBn: 'রসুন (আমদানি)', nameEn: 'Garlic (imported)', category: 'spices', unitBn: 'কেজি', aliases: ['রসুন আমদানী', 'রসুন আমদানি'], cropIds: ['garlic'] },
  { key: 'dry-chilli-local', nameBn: 'শুকনা মরিচ (দেশি)', nameEn: 'Dry chilli (local)', category: 'spices', unitBn: 'কেজি', aliases: ['শুকনা মরিচ দেশী', 'শুকনা মরিচ দেশি'], cropIds: ['chilli'] },
  { key: 'dry-chilli-imported', nameBn: 'শুকনা মরিচ (আমদানি)', nameEn: 'Dry chilli (imported)', category: 'spices', unitBn: 'কেজি', aliases: ['শুকনা মরিচ আমদানী', 'শুকনা মরিচ আমদানি'] },
  { key: 'green-chilli', nameBn: 'কাঁচা মরিচ', nameEn: 'Green chilli', category: 'vegetables', unitBn: 'কেজি', aliases: ['কাঁচা মরিচ', 'কাচা মরিচ'], cropIds: ['chilli'] },
  { key: 'turmeric', nameBn: 'হলুদ', nameEn: 'Turmeric', category: 'spices', unitBn: 'কেজি', aliases: ['হলুদ'] },
  { key: 'ginger-local', nameBn: 'আদা (দেশি)', nameEn: 'Ginger (local)', category: 'spices', unitBn: 'কেজি', aliases: ['আদা দেশী', 'আদা দেশি'] },
  { key: 'ginger-imported', nameBn: 'আদা (আমদানি)', nameEn: 'Ginger (imported)', category: 'spices', unitBn: 'কেজি', aliases: ['আদা আমদানী', 'আদা আমদানি'] },
  { key: 'cumin', nameBn: 'জিরা', nameEn: 'Cumin', category: 'spices', unitBn: 'কেজি', aliases: ['জিরা'] },
  { key: 'cinnamon', nameBn: 'দারুচিনি', nameEn: 'Cinnamon', category: 'spices', unitBn: 'কেজি', aliases: ['দারুচিনি', 'দারচিনি'] },
  { key: 'clove', nameBn: 'লবঙ্গ', nameEn: 'Clove', category: 'spices', unitBn: 'কেজি', aliases: ['লবঙ্গ'] },
  { key: 'cardamom', nameBn: 'এলাচ', nameEn: 'Cardamom', category: 'spices', unitBn: 'কেজি', aliases: ['এলাচ', 'এলাচি'] },
  { key: 'coriander', nameBn: 'ধনে', nameEn: 'Coriander', category: 'spices', unitBn: 'কেজি', aliases: ['ধনে', 'ধনিয়া'] },
  { key: 'bay-leaf', nameBn: 'তেজপাতা', nameEn: 'Bay leaf', category: 'spices', unitBn: 'কেজি', aliases: ['তেজপাতা', 'তেজ পাতা'] },
  { key: 'rui-fish', nameBn: 'রুই মাছ', nameEn: 'Rui fish', category: 'fish-meat', unitBn: 'কেজি', aliases: ['রুই'] },
  { key: 'hilsa', nameBn: 'ইলিশ মাছ', nameEn: 'Hilsa', category: 'fish-meat', unitBn: 'কেজি', aliases: ['ইলিশ'] },
  { key: 'beef', nameBn: 'গরুর মাংস', nameEn: 'Beef', category: 'fish-meat', unitBn: 'কেজি', aliases: ['গরুর মাংস', 'গরু মাংস'] },
  { key: 'mutton', nameBn: 'খাসির মাংস', nameEn: 'Mutton', category: 'fish-meat', unitBn: 'কেজি', aliases: ['খাসির মাংস', 'খাসী'] },
  { key: 'chicken-broiler', nameBn: 'মুরগি (ব্রয়লার)', nameEn: 'Chicken (broiler)', category: 'fish-meat', unitBn: 'কেজি', aliases: ['মুরগী ব্রয়লার', 'মুরগি ব্রয়লার', 'ব্রয়লার'] },
  { key: 'chicken-local', nameBn: 'মুরগি (দেশি)', nameEn: 'Chicken (local)', category: 'fish-meat', unitBn: 'কেজি', aliases: ['মুরগী দেশী', 'মুরগি দেশি'] },
  { key: 'chicken-sonali', nameBn: 'মুরগি (সোনালি)', nameEn: 'Chicken (Sonali)', category: 'fish-meat', unitBn: 'কেজি', aliases: ['মুরগী সোনালী', 'সোনালী'] },
  { key: 'egg-farm', nameBn: 'ডিম (ফার্ম)', nameEn: 'Egg (farm)', category: 'egg-dairy', unitBn: 'হালি', aliases: ['ডিম ফার্ম', 'ডিম লাল', 'ফার্মের ডিম'] },
  { key: 'milk-powder', nameBn: 'গুঁড়া দুধ', nameEn: 'Milk powder', category: 'egg-dairy', unitBn: 'কেজি', aliases: ['গুঁড়া দুধ', 'গুড়া দুধ'] },
  { key: 'sugar', nameBn: 'চিনি', nameEn: 'Sugar', category: 'other', unitBn: 'কেজি', aliases: ['চিনি'] },
  { key: 'dates', nameBn: 'খেজুর', nameEn: 'Dates', category: 'other', unitBn: 'কেজি', aliases: ['খেজুর'] },
  { key: 'salt', nameBn: 'লবণ', nameEn: 'Salt', category: 'other', unitBn: 'কেজি', aliases: ['লবণ', 'লবন'] },
];

export const COMMODITY_MAP = new Map(COMMODITIES.map((c) => [c.key, c]));
