/** Builds an .ics calendar file so farmers can add tasks to their phone's calendar app. */

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  date: Date; // all-day
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function ymd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function escape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** RFC 5545 lines must be folded at 75 octets; fold by characters conservatively. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 60) {
    out.push(rest.slice(0, 60));
    rest = ' ' + rest.slice(60);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(events: IcsEvent[], calName = 'কৃষিবাংলা'): string {
  const stamp = new Date();
  const dtstamp = `${ymd(stamp)}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AgriBangla//BN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escape(calName)}`];
  for (const e of events) {
    const next = new Date(e.date);
    next.setDate(next.getDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@agribangla`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      fold(`SUMMARY:${escape(e.title)}`),
      ...(e.description ? [fold(`DESCRIPTION:${escape(e.description)}`)] : []),
      'BEGIN:VALARM',
      'TRIGGER:-PT12H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(e.title)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/calendar;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
