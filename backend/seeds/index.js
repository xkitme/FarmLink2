import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

const achievements = [
  { code: 'first_login', name: '初入墨门', description: '完成第一次登录', category: 'milestone', conditionType: 'complete', conditionValue: 0, expReward: 50, icon: '🖌' },
  { code: 'streak_3', name: '三日不辍', description: '连续打卡3天', category: 'streak', conditionType: 'streak', conditionValue: 3, expReward: 30, icon: '🔥' },
  { code: 'streak_7', name: '七日磨砺', description: '连续打卡7天', category: 'streak', conditionType: 'streak', conditionValue: 7, expReward: 80, icon: '📅' },
  { code: 'streak_30', name: '一月精进', description: '连续打卡30天', category: 'streak', conditionType: 'streak', conditionValue: 30, expReward: 300, icon: '🏆' },
  { code: 'complete_10', name: '初窥门径', description: '完成10篇学习', category: 'learning', conditionType: 'complete', conditionValue: 10, expReward: 100, icon: '📖' },
  { code: 'complete_50', name: '渐入佳境', description: '完成50篇学习', category: 'learning', conditionType: 'complete', conditionValue: 50, expReward: 500, icon: '📚' },
  { code: 'create_1', name: '初试身手', description: '发布第一件作品', category: 'create', conditionType: 'create', conditionValue: 1, expReward: 50, icon: '✍️' },
  { code: 'create_10', name: '笔耕不辍', description: '累计发布10件作品', category: 'create', conditionType: 'create', conditionValue: 10, expReward: 200, icon: '🎨' },
]

const contents = [
  {
    category: 'poetry', title: '静夜思', author: '李白', dynasty: '唐',
    body: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    translation: '床前洒满了明亮的月光，误以为是地上铺了一层白霜。抬头仰望那天上的明月，低下头来不由得思念起故乡。',
    annotation: JSON.stringify({ 床: '古代坐具，一说井栏', 疑: '好像，似乎' }),
    background: '李白于唐玄宗开元年间，旅居扬州时所作，抒发了游子思乡之情。',
    tags: JSON.stringify(['思乡', '月', '五绝', '李白']), difficulty: 1,
  },
  {
    category: 'poetry', title: '将进酒', author: '李白', dynasty: '唐',
    body: '君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。',
    translation: '你没见那黄河之水从天而降，奔腾汹涌，向东入海，不再回头。你没见那高堂之上，明镜中白发苍苍，早晨还是黑丝，傍晚已变成白雪。人生得意之时，应当纵情欢乐，不要让金杯空对月色。',
    annotation: JSON.stringify({ 高堂: '父母', 金樽: '金杯' }),
    background: '此诗约作于天宝十一年，李白与好友岑夫子、丹丘生饮酒时所作，表达了对人生短暂的感慨和及时行乐的思想。',
    tags: JSON.stringify(['豪放', '饮酒', '乐府', '李白']), difficulty: 3,
  },
  {
    category: 'poetry', title: '水调歌头·明月几时有', author: '苏轼', dynasty: '宋',
    body: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。\n转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。',
    translation: '明月从何时开始存在的？手持酒杯向青天发问。不知道天上的宫殿，今晚是哪一年。我想乘着风飞回天宫，又担心那美玉砌成的楼宇，太高的地方太寒冷。在月光下起舞，影子也跟着起舞，这样的日子在人间又有什么不好呢？\n月光转过朱红阁楼，低低地照进雕花的门窗，照到无法入眠的人。月亮对人不应有什么怨恨，为什么总在人们离别时才变得圆满？人有悲欢离合，月有阴晴圆缺，这种事自古以来就难以两全。只希望人们能平安长久，即使相隔千里，也能共赏明月。',
    annotation: JSON.stringify({ 把酒: '端着酒杯', 琼楼玉宇: '形容天上的宫殿', 婵娟: '指月亮' }),
    background: '宋神宗熙宁九年中秋，苏轼在密州任职，面对明月思念弟弟苏辙所作。',
    tags: JSON.stringify(['中秋', '月', '思念', '苏轼', '宋词']), difficulty: 3,
  },
  {
    category: 'classics', title: '论语·学而篇（节选）', author: '孔子', dynasty: '春秋',
    body: '学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？',
    translation: '学习了知识，然后按时温习，不是很愉快吗？有志同道合的朋友从远方来，不是很快乐吗？别人不了解自己，自己却不恼怒，不是君子吗？',
    annotation: JSON.stringify({ 说: '通"悦"，高兴愉快', 愠: '恼怒，怨恨' }),
    background: '《论语》由孔子弟子及再传弟子编集，记录孔子及其弟子言行。学而篇是第一篇，讲述为学之道。',
    tags: JSON.stringify(['论语', '儒家', '学习', '君子']), difficulty: 2,
  },
  {
    category: 'history', title: '卧薪尝胆', author: null, dynasty: '春秋',
    body: '越王勾践，战败后被吴国羁押，忍辱负重。回国后，他睡在柴草上，每天尝一口苦胆，时刻提醒自己不忘亡国之耻，励精图治，终于在二十年后灭掉吴国，报仇雪恨。',
    translation: '（本身为现代文）',
    annotation: JSON.stringify({ 卧薪: '睡在柴草上', 尝胆: '舔尝苦胆' }),
    background: '出自《史记·越王勾践世家》，用以形容人刻苦自励，发愤图强。',
    tags: JSON.stringify(['成语', '典故', '励志', '春秋']), difficulty: 1,
  },
  {
    category: 'season', title: '清明节气', author: null, dynasty: null,
    body: '清明，是二十四节气之一，在公历4月4日或5日。清明时节，气温升高，雨量增多，是春耕春种的大好时机。清明也是重要的祭祀节日，人们扫墓祭祖，踏青游春。',
    translation: null,
    annotation: JSON.stringify({ 清明: '含有天气晴朗、空气清新明洁之意' }),
    background: '清明节大约起源于周代，距今已有二千五百多年的历史。',
    tags: JSON.stringify(['清明', '节气', '春季', '祭祀', '踏青']), difficulty: 1,
  },
]

async function main() {
  console.log('开始初始化数据...')

  // 成就数据
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      create: { id: uuidv4(), ...ach },
      update: ach,
    })
  }
  console.log(`✓ 成就数据: ${achievements.length} 条`)

  // 文化内容
  for (const c of contents) {
    const exists = await prisma.content.findFirst({ where: { title: c.title, author: c.author } })
    if (!exists) {
      await prisma.content.create({ data: { id: uuidv4(), ...c } })
    }
  }
  console.log(`✓ 文化内容: ${contents.length} 条`)

  // 每日挑战示例
  const today = new Date().toISOString().slice(0, 10)
  await prisma.dailyChallenge.upsert({
    where: { date: today },
    create: {
      id: uuidv4(), date: today,
      question: '「床前明月光，疑是地上霜」出自哪位诗人？',
      options: JSON.stringify(['A. 杜甫', 'B. 李白', 'C. 王维', 'D. 白居易']),
      answer: 'B',
      explanation: '此诗出自唐代诗人李白的《静夜思》，是最著名的思乡诗之一。',
    },
    update: {},
  })
  console.log('✓ 每日挑战: 1 条')

  console.log('\n数据初始化完成 🎉')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
