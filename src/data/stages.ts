export type StageCopy = {
  index: string
  title: string
  body: string
  note: string
  seal?: { label: string; value: string }[]
}

export const stages: StageCopy[] = [
  {
    index: '01',
    title: '取土',
    body: '湿土还记着山里的凉。\n它软，肯留下指纹，也肯被改变。',
    note: '手上的凉意，比颜色更早说明这块土还湿着。',
  },
  {
    index: '02',
    title: '揉泥',
    body: '把土按开，又叠上。\n气泡被一点点挤出去，泥才变得听话。',
    note: '气泡若不排出，窑里会把它撑成一道伤口。',
  },
  {
    index: '03',
    title: '拉坯',
    body: '轮盘转起来。\n手掌托住中心，口沿慢慢打开。',
    note: '手要稳住，轮盘才肯把土送上来。',
  },
  {
    index: '04',
    title: '修坯',
    body: '等它半干，像皮革那样有弹性。\n削去多余的厚，留下一只圈足。',
    note: '修坯是在皮革硬度时进行。',
  },
  {
    index: '05',
    title: '干燥',
    body: '水悄悄离开坯体。\n颜色褪成浅灰褐，身子也收了一圈。',
    note: '干得太急，坯会在没人看见的时候裂开。',
  },
  {
    index: '06',
    title: '素烧',
    body: '第一把火不求成器。\n它把残余的水赶尽，坯变得哑而轻。',
    note: '素烧之后，坯才肯把釉浆吸进去。',
  },
  {
    index: '07',
    title: '施釉',
    body: '釉浆覆上干涩的表面。\n它重新变湿，只肯流动一点点。',
    note: '釉要薄。太厚的话，火会让它自己跑掉。',
  },
  {
    index: '08',
    title: '成器',
    body: '第二把火过后，光收在釉里面。\n口沿留着一圈没盖住的本胎。',
    note: '口沿那一圈露胎，是手最后离开的地方。',
    seal: [
      { label: '器名', value: '敞口' },
      { label: '泥料', value: '山下的黄泥，掺了一点白' },
      { label: '火候', value: '窑里最稳的那段热' },
      { label: '釉', value: '薄，像一层没说完的话' },
    ],
  },
]

export const galleryCopy = {
  index: '—',
  title: '火与釉的分歧',
  body: '同一只碗，火候轻轻一偏。\n颜色就走上了不同的路。',
}

export const glazes = [
  {
    id: 'celadon',
    name: '青瓷',
    color: '#7E8F86',
    rough: 0.36,
    coat: 0.48,
    line: '像雨后的苔，安静，稍微透一点光。',
  },
  {
    id: 'ash',
    name: '灰釉',
    color: '#8A8680',
    rough: 0.48,
    coat: 0.24,
    line: '灰是窑烟留下的，不跟眼睛争。',
  },
  {
    id: 'persimmon',
    name: '柿釉',
    color: '#8C4A32',
    rough: 0.32,
    coat: 0.36,
    line: '熟透的暖色，边沿比中心更深。',
  },
] as const

export type GlazeId = (typeof glazes)[number]['id']

export const glazeById = (id: GlazeId) => glazes.find((item) => item.id === id) ?? glazes[0]
