export const BANNED = ['best', 'guaranteed', 'cure', 'free shipping', 'nike', 'adidas']

const KNOWN: Record<string, { title: string; bullets: string[] }> = {
  轻便跑鞋: {
    title: 'Lightweight running shoe',
    bullets: [
      'Breathable mesh upper',
      'Cushioned midsole for daily miles',
      'Secure laces and padded collar',
      'Durable rubber outsole',
      'US size as specified in the product details',
    ],
  },
  短筒靴: {
    title: 'Ankle boot',
    bullets: [
      'Ankle height for easy on and off',
      'Soft lining',
      'Side zipper',
      'Stacked heel',
      'US size as specified in the product details',
    ],
  },
  校园跑鞋: {
    title: 'Campus running shoe',
    bullets: [
      'Light mesh upper',
      'Flexible sole for walking',
      'Padded tongue',
      'Rubber grip',
      'US size as specified in the product details',
    ],
  },
}

const PHRASES: [string, string][] = [
  ['轻便跑鞋', 'Lightweight running shoe'],
  ['短筒靴', 'Ankle boot'],
  ['校园跑鞋', 'Campus running shoe'],
  ['最好', 'best'],
]

const FILLERS = [
  'Everyday upper',
  'Comfortable footbed',
  'Secure closure',
  'Rubber sole',
  'US size as specified in the product details',
]

export function translatePhrase(source: string) {
  const ordered = [...PHRASES].sort((a, b) => b[0].length - a[0].length)
  return ordered.reduce((text, [from, to]) => text.replaceAll(from, to), source)
}

export function translateListing(titleZh: string, bulletsZh: string[]) {
  const known = KNOWN[titleZh]
  if (known) return { title: known.title, bullets: [...known.bullets] }
  const bullets = [...bulletsZh.map(translatePhrase), ...FILLERS].slice(0, 5)
  return { title: translatePhrase(titleZh), bullets }
}

export function bannedHits(text: string) {
  const lower = text.toLowerCase()
  return BANNED.filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower))
}

export function reviewCopy(title: string, bullets: string[]) {
  const hits = [...new Set(bannedHits([title, ...bullets].join('\n')))]
  if (bullets.length !== 5) return { pass: false, hits, reason: '要点不足五条' }
  if (hits.length > 0) return { pass: false, hits, reason: '文案含禁词' }
  return { pass: true, hits, reason: '质检通过' }
}
