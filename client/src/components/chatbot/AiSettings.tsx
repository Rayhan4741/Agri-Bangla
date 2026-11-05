import { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useAiConfig } from '@/hooks/useAiConfig';
import type { ProviderKind } from '@/lib/aiProvider';
import { Button } from '@/components/common/ui';

/** Settings for the optional direct-AI mode. Explains the browser-key risk before anything is enabled. */
export function AiSettings() {
  const ai = useAiConfig();
  const [keyInput, setKeyInput] = useState('');
  const [ack, setAck] = useState(ai.config.enabled);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <p className="flex items-center gap-2 font-bold">
          <ShieldAlert className="h-4 w-4" aria-hidden /> নিরাপত্তা সতর্কতা
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>এই মোডে আপনার API কী সরাসরি এই ব্রাউজার থেকে AI সেবায় পাঠানো হয়।</li>
          <li>এই ব্রাউজার ব্যবহারকারী বা নেটওয়ার্ক পরীক্ষা করতে পারে এমন যে কেউ কী-টি দেখতে পারে।</li>
          <li>কী শুধু এই ট্যাবের সেশনে থাকে—ট্যাব বন্ধ করলে মুছে যায়। শেয়ার করা কম্পিউটারে ব্যবহার করবেন না।</li>
          <li>খরচ ও ব্যবহারের সীমা আপনার AI অ্যাকাউন্টে নির্ধারিত হবে।</li>
        </ul>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span className="text-sm">আমি ঝুঁকিগুলো বুঝেছি এবং নিজের কী ব্যবহার করতে চাই।</span>
      </label>
      <fieldset disabled={!ack} className="space-y-3 disabled:opacity-50">
        <div>
          <label htmlFor="ai-provider" className="label">সেবার ধরন</label>
          <select
            id="ai-provider"
            className="field"
            value={ai.config.provider}
            onChange={(e) => {
              const provider = e.target.value as ProviderKind;
              ai.update({ provider, baseUrl: provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1' });
            }}
          >
            <option value="openai-compatible">OpenAI-সামঞ্জস্যপূর্ণ (/chat/completions)</option>
            <option value="anthropic">Anthropic (Claude) Messages API</option>
          </select>
        </div>
        <div>
          <label htmlFor="ai-base" className="label">API ঠিকানা (Base URL)</label>
          <input id="ai-base" className="field font-en text-sm" value={ai.config.baseUrl} onChange={(e) => ai.update({ baseUrl: e.target.value })} inputMode="url" />
        </div>
        <div>
          <label htmlFor="ai-model" className="label">মডেলের নাম</label>
          <input id="ai-model" className="field font-en text-sm" value={ai.config.model} onChange={(e) => ai.update({ model: e.target.value })} placeholder={ai.config.provider === 'anthropic' ? 'যেমন: claude-sonnet-5-5' : 'আপনার সেবার মডেলের নাম'} />
        </div>
        <div>
          <label htmlFor="ai-key" className="label">API কী (শুধু এই সেশনে থাকবে)</label>
          <div className="flex gap-2">
            <input id="ai-key" type="password" autoComplete="off" className="field font-en text-sm" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={ai.hasKey ? '•••••• (সংরক্ষিত)' : 'কী পেস্ট করুন'} />
            <Button
              variant="outline"
              onClick={() => {
                ai.saveKey(keyInput);
                setKeyInput('');
              }}
            >
              <KeyRound className="h-4 w-4" aria-hidden /> রাখুন
            </Button>
          </div>
          {ai.hasKey && (
            <button type="button" className="mt-1 text-sm font-semibold text-red-700 hover:underline" onClick={() => ai.saveKey('')}>
              কী মুছে ফেলুন
            </button>
          )}
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-cream p-3">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={ai.config.enabled} onChange={(e) => ai.update({ enabled: e.target.checked })} />
          <span className="font-semibold">সরাসরি AI মোড চালু করুন</span>
        </label>
        {ai.config.enabled && !ai.ready && <p className="text-sm text-red-700">মডেলের নাম ও API কী দিলে তবেই AI মোড কাজ করবে; ততক্ষণ স্থানীয় ডেমো মোড চলবে।</p>}
      </fieldset>
    </div>
  );
}
