// “先想清楚”用到的文案，网站（app.js）和小红书出图（cards.js）共用这一份，改这里两边一起变。
export const NEEDS_LEVELS = ['不在乎', '有点', '很在意', '必须'];
export const NEEDS_MODES = { room: '一个人租一间（合租）', share2: '和朋友整租两房、平摊', solo: '一个人整租开间或一房' };
export const CRITERIA = [
  { k: 'price', label: '月租便宜', hint: '按你选的住法取该小区最低价，超预算越多扣分越多' },
  { k: 'commute', label: '上学方便', hint: '走到轻轨站的分钟数，加上坐到 Universiti 站的时间' },
  { k: 'facilities', label: '设施多', hint: '泳池健身房之外，还有桑拿、球场这些加分项' },
  { k: 'age', label: '楼龄新', hint: '建成年份' },
  { k: 'density', label: '楼里人少', hint: '总户数越少，电梯和泳池越不挤' },
  { k: 'daily', label: '吃饭购物方便', hint: '楼下或步行范围有没有商场、超市、大排档（粗略判断）' },
  { k: 'roommates', label: '好找室友、中国同学多', hint: 'Bangsar South 一侧中国学生最集中；在租房源多也更好拼' },
  { k: 'quiet', label: '安静', hint: '离大路远、密度低（粗略判断）' },
];
export const NEEDS_ASK = [
  ['cook', '能不能做饭：有没有厨房，允许明火吗'],
  ['furnished', '带哪些家具家电：床、衣柜、空调、冰箱、洗衣机'],
  ['bath', '有没有独立卫生间'],
  ['utilities', '水电网怎么算：包在房租里，还是按用量分摊'],
  ['term', '合同最短签多久，能不能签半年'],
  ['deposit', '押金几个月、什么时候退、扣不扣清洁费'],
  ['roommates', '现在住着几个人，室友的性别和作息'],
  ['pets', '能不能养宠物'],
  ['parking', '有没有停车位，要不要另付'],
  ['visitors', '访客和过夜有没有限制'],
];
