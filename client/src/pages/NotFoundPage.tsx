import { Home, Search } from 'lucide-react';
import { LinkButton } from '@/components/common/ui';

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[80vh] flex-col items-center justify-center pt-24 text-center">
      <p className="text-8xl" aria-hidden>🌾</p>
      <h1 className="mt-4 text-3xl font-bold">পাতাটি খুঁজে পাওয়া যায়নি</h1>
      <p className="mt-2 max-w-md text-ink-soft">ঠিকানাটি ভুল হতে পারে বা পাতাটি সরানো হয়েছে।</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">
          <Home className="h-4 w-4" aria-hidden /> হোমে ফিরুন
        </LinkButton>
        <LinkButton to="/ai-assistant" variant="outline">
          <Search className="h-4 w-4" aria-hidden /> কৃষকবন্ধুকে জিজ্ঞাসা করুন
        </LinkButton>
      </div>
    </div>
  );
}
