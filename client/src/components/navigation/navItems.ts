import {
  Bot,
  BookOpen,
  Calculator,
  CalendarDays,
  CloudSun,
  Fish,
  FlaskConical,
  Home,
  Landmark,
  LineChart,
  Microscope,
  PawPrint,
  Sprout,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  description: string;
  tile?: string;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'হোম', short: 'হোম', icon: Home, color: '#21864A', description: 'মূল পাতা' },
  { tile: 'AI সহায়ক', to: '/ai-assistant', label: 'কৃষকবন্ধু AI', short: 'সহায়ক', icon: Bot, color: '#E9B44C', description: 'প্রশ্ন করুন, পরামর্শ নিন' },
  { to: '/crops', label: 'ফসল', short: 'ফসল', icon: Sprout, color: '#21864A', description: 'ফসলভিত্তিক নির্দেশিকা' },
  { to: '/diseases', label: 'রোগ শনাক্ত', short: 'রোগ', icon: Microscope, color: '#C0533B', description: 'লক্ষণ ও ছবি দিয়ে খুঁজুন' },
  { to: '/weather', label: 'আবহাওয়া', short: 'আবহাওয়া', icon: CloudSun, color: '#2D7FB8', description: 'ঋতু ও ঝুঁকি পরামর্শ' },
  { to: '/market', label: 'বাজার', short: 'বাজার', icon: LineChart, color: '#9A6C14', description: 'টিসিবির দৈনিক বাজারদর ও চার্ট' },
  { to: '/fertilizer', label: 'মাটি ও সার', short: 'সার', icon: FlaskConical, color: '#7A5B3C', description: 'মাটি, সার ও সেচ' },
  { tile: 'পশুপালন', to: '/livestock', label: 'গবাদিপশু ও হাঁস-মুরগি', short: 'পশু', icon: PawPrint, color: '#8A5A3C', description: 'গরু, ছাগল, মুরগি, হাঁস' },
  { to: '/fisheries', label: 'মৎস্য চাষ', short: 'মাছ', icon: Fish, color: '#1F7A8C', description: 'পুকুর ও মাছ ব্যবস্থাপনা' },
  { to: '/calculator', label: 'হিসাব', short: 'হিসাব', icon: Calculator, color: '#123D2B', description: 'জমি, সার, খরচ ও লাভ' },
  { tile: 'ক্যালেন্ডার', to: '/calendar', label: 'কৃষি ক্যালেন্ডার', short: 'ক্যালেন্ডার', icon: CalendarDays, color: '#21864A', description: 'মাসভিত্তিক কাজ' },
  { to: '/resources', label: 'সরকারি সেবা', short: 'সেবা', icon: Landmark, color: '#123D2B', description: 'অফিস ও ওয়েবসাইট' },
  { to: '/learn', label: 'শিখুন', short: 'শিখুন', icon: BookOpen, color: '#77C66E', description: 'পাঠ ও কুইজ' },
  { tile: 'আমার খামার', to: '/profile', label: 'আমার খামার', short: 'প্রোফাইল', icon: UserRound, color: '#E9B44C', description: 'ডায়েরি, খরচ, পছন্দ' },
];

export const PRIMARY_NAV = ['/', '/ai-assistant', '/crops', '/diseases', '/weather', '/market'];
export const MOBILE_TABS = ['/', '/ai-assistant', '/crops', '/diseases'];
