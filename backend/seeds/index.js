/**
 * 田园通 FarmLink — 种子数据
 * 运行：npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000)
const daysLater = (n) => new Date(now.getTime() + n * 86400000)

async function main() {
  console.log('开始写入种子数据...')

  // ── 清空（无外键约束，顺序随意） ──────────────────
  const tables = [
    'aiQaRecord', 'syncLog', 'statReport', 'annualReport',
    'expressPoint', 'folkCulture', 'loanApplication', 'loanProduct',
    'envReport', 'helpRequest', 'secondhandItem', 'tourismSpot',
    'jobInfo', 'consultation', 'clinic',
    'talentProfile', 'courseEnrollment', 'trainingCourse', 'honorRecord',
    'villageAffair', 'partyLearnLog', 'partyLesson', 'subsidyApplication',
    'policyChunk', 'policy',
    'sosRecord', 'emergencyGuide', 'insuranceClaim', 'weatherAlert', 'disasterReport',
    'operatorCert', 'machineryInsurance', 'landTransfer', 'machineryTrack',
    'machineryBooking', 'machinery',
    'logistics', 'groupBuy', 'buyer', 'traceRecord', 'order', 'product',
    'pricePrediction', 'marketPrice',
    'carbonRecord', 'pesticideInfo', 'farmCalendar', 'yieldPrediction',
    'aiDetectRecord', 'diseaseKnowledge', 'farmRecord', 'landPlot',
    'region', 'apiSwitch', 'operationLog', 'feedback', 'notification',
    'pointsLog', 'userOauth', 'user',
  ]
  for (const t of tables) await prisma[t].deleteMany()
  console.log('  已清空旧数据')

  // ── 行政区划 ──────────────────────────────────────
  await prisma.region.createMany({
    data: [
      { code: '510000',       name: '四川省',   level: 'PROVINCE', parentCode: null },
      { code: '510100',       name: '成都市',   level: 'CITY',     parentCode: '510000' },
      { code: '510131',       name: '蒲江县',   level: 'COUNTY',   parentCode: '510100' },
      { code: '510131100',    name: '寿安街道', level: 'TOWN',     parentCode: '510131' },
      { code: '510131100201', name: '松华村',   level: 'VILLAGE',  parentCode: '510131100' },
      { code: '510131100202', name: '长滩村',   level: 'VILLAGE',  parentCode: '510131100' },
    ],
  })
  const VILLAGE = '510131100201'

  // ── 用户 ──────────────────────────────────────────
  const pwd = await bcrypt.hash('123456', 10)
  const mkUser = (username, nickname, role, realName, phone) => ({
    username, nickname, role, realName, phone,
    passwordHash: pwd, regionCode: VILLAGE, villageName: '松华村', points: 0,
  })
  await prisma.user.createMany({
    data: [
      mkUser('farmer',    '张大山', 'FARMER',    '张大山', '13800000001'),
      mkUser('bigfarmer', '李建国', 'BIGFARMER', '李建国', '13800000002'),
      mkUser('village',   '王主任', 'VILLAGE',   '王建华', '13800000003'),
      mkUser('expert',    '赵农技', 'EXPERT',    '赵建军', '13800000004'),
      mkUser('merchant',  '陈收购', 'MERCHANT',  '陈志远', '13800000005'),
      mkUser('admin',     '管理员', 'ADMIN',     '系统管理员', '13800000000'),
    ],
  })
  const farmer    = await prisma.user.findUnique({ where: { username: 'farmer' } })
  const bigfarmer = await prisma.user.findUnique({ where: { username: 'bigfarmer' } })
  const merchant  = await prisma.user.findUnique({ where: { username: 'merchant' } })

  // 给农户加点积分流水
  await prisma.pointsLog.createMany({
    data: [
      { userId: farmer.id, points: 10, type: 'SIGN_IN',   remark: '每日签到' },
      { userId: farmer.id, points: 5,  type: 'LEARN',      remark: '党建学习打卡' },
      { userId: farmer.id, points: 20, type: 'VOLUNTEER',  remark: '参与村庄志愿服务' },
    ],
  })
  await prisma.user.update({ where: { id: farmer.id }, data: { points: 35 } })

  // ── API 功能开关 ──────────────────────────────────
  await prisma.apiSwitch.createMany({
    data: [
      { key: 'ai_disease_detect', name: '病虫害AI识别',   category: 'AI功能',   description: '拍照识别作物病虫害' },
      { key: 'ai_weed_detect',    name: '杂草识别',       category: 'AI功能',   description: '田间杂草拍照识别' },
      { key: 'ai_seed_detect',    name: '种子质量鉴别',   category: 'AI功能',   description: '种子发芽率/纯度评估' },
      { key: 'ai_yield_predict',  name: '产量预测',       category: 'AI功能',   description: 'LSTM 时序产量预测' },
      { key: 'ai_policy_qa',      name: '政策AI问答',     category: 'AI功能',   description: 'RAG 政策智能问答' },
      { key: 'ai_chat',           name: '通用AI对话',     category: 'AI功能',   description: '农技/法律/通用问答' },
      { key: 'ai_voice',          name: '语音识别',       category: 'AI功能',   description: '方言语音转文字' },
      { key: 'ai_grade_detect',   name: 'AI质量分级',     category: 'AI功能',   description: '农产品等级品相识别' },
      { key: 'ai_fault_diagnose', name: '农机故障诊断',   category: 'AI功能',   description: '农机故障 AI 诊断建议' },
      { key: 'ai_claim_assess',   name: '保险理赔评估',   category: 'AI功能',   description: '灾损图像 AI 评估' },
      { key: 'ai_copywriting',    name: 'AI文案生成',     category: 'AI功能',   description: '直播/包装/旅游文案生成' },
      { key: 'ai_annual_report',  name: '农事年报生成',   category: 'AI功能',   description: 'AI 生成农事年度报告' },
      { key: 'user_register',     name: '用户注册',       category: '账户',     description: '开放新用户注册' },
      { key: 'market_order',      name: '集市下单',       category: '流通销售', description: '乡村集市下单功能' },
      { key: 'machinery_booking', name: '农机预约',       category: '农机共享', description: '农机在线预约租赁' },
      { key: 'disaster_report',   name: '灾情上报',       category: '气象灾害', description: '农户灾情上报' },
      { key: 'subsidy_apply',     name: '补贴申请',       category: '惠农政策', description: '在线补贴申请' },
      { key: 'community_post',    name: '社区发布',       category: '乡村生活', description: '互助/二手/举报发布' },
      { key: 'media_upload',      name: '文件上传',       category: '平台',     description: '图片/视频上传' },
      { key: 'offline_sync',      name: '离线数据同步',   category: '平台',     description: '断网数据同步上传' },
    ],
  })

  // ── 病害知识库 ────────────────────────────────────
  await prisma.diseaseKnowledge.createMany({
    data: [
      { diseaseName: '稻飞虱',      cropType: '水稻', category: '虫害', modelLabel: 'rice_planthopper',
        symptoms: '叶片发黄、植株矮缩，严重时成片枯死（冒穿）。', cause: '高温高湿环境利于繁殖，迁飞性害虫。',
        prevention: '选用抗虫品种，合理密植，保护天敌；达标后及时用药。', medicineAdvice: '吡虫啉、噻嗪酮，按说明稀释喷雾。' },
      { diseaseName: '稻瘟病',      cropType: '水稻', category: '病害', modelLabel: 'rice_blast',
        symptoms: '叶片现菱形褐斑，穗颈变黑枯白穗。', cause: '稻瘟病菌侵染，连阴雨、偏施氮肥易发。',
        prevention: '种子消毒，配方施肥，发病初期及时防治。', medicineAdvice: '三环唑、稻瘟灵喷雾防治。' },
      { diseaseName: '小麦条锈病',  cropType: '小麦', category: '病害', modelLabel: 'wheat_stripe_rust',
        symptoms: '叶片现黄色条状夏孢子堆，沿叶脉排列。', cause: '条锈菌侵染，春季气温回升、多雨流行。',
        prevention: '选用抗病品种，适期晚播，监测预警。', medicineAdvice: '三唑酮、戊唑醇及时喷雾。' },
      { diseaseName: '玉米螟',      cropType: '玉米', category: '虫害', modelLabel: 'corn_borer',
        symptoms: '心叶被蛀成排孔，茎秆蛀空易倒折。', cause: '玉米螟幼虫钻蛀危害。',
        prevention: '处理越冬寄主，释放赤眼蜂生物防治。', medicineAdvice: '心叶期撒施颗粒剂或喷氯虫苯甲酰胺。' },
      { diseaseName: '番茄晚疫病',  cropType: '番茄', category: '病害', modelLabel: 'tomato_late_blight',
        symptoms: '叶片现水渍状暗绿斑，果实褐色硬腐。', cause: '致病疫霉侵染，低温高湿流行快。',
        prevention: '通风降湿，及时摘除病叶病果。', medicineAdvice: '烯酰吗啉、霜脲·锰锌喷雾。' },
      { diseaseName: '黄瓜霜霉病',  cropType: '黄瓜', category: '病害', modelLabel: 'cucumber_downy_mildew',
        symptoms: '叶背现多角形黄褐斑，潮湿时长灰黑霉。', cause: '霜霉菌侵染，棚内高湿易暴发。',
        prevention: '控湿通风，高温闷棚。', medicineAdvice: '霜霉威、嘧菌酯交替喷雾。' },
      { diseaseName: '柑橘黄龙病',  cropType: '柑橘', category: '病害', modelLabel: 'citrus_greening',
        symptoms: '叶片斑驳黄化，果实畸形青果红鼻子。', cause: '韧皮部杆菌，木虱传播。',
        prevention: '严格检疫，挖除病树，防治木虱。', medicineAdvice: '无有效治疗药剂，重在防虫防传播。' },
      { diseaseName: '作物缺氮症',  cropType: '通用', category: '缺素', modelLabel: 'nitrogen_deficiency',
        symptoms: '老叶先黄、植株矮小、生长缓慢。', cause: '土壤供氮不足。',
        prevention: '配方施肥，增施有机肥。', medicineAdvice: '追施尿素或喷施 1% 尿素溶液。' },
    ],
  })

  // ── 农事日历 ──────────────────────────────────────
  await prisma.farmCalendar.createMany({
    data: [
      { solarTerm: '立春', month: 2,  cropType: '水稻', activity: '育秧准备',   description: '检修农具，整理苗床，准备种子。' },
      { solarTerm: '惊蛰', month: 3,  cropType: '小麦', activity: '春灌追肥',   description: '小麦返青，及时灌水追施返青肥。' },
      { solarTerm: '清明', month: 4,  cropType: '水稻', activity: '播种育秧',   description: '气温稳定，适时播种育秧。' },
      { solarTerm: '谷雨', month: 4,  cropType: '玉米', activity: '春玉米播种', description: '土壤墒情适宜，抢墒播种春玉米。' },
      { solarTerm: '立夏', month: 5,  cropType: '水稻', activity: '插秧',       description: '秧龄适宜及时移栽，合理密植。' },
      { solarTerm: '芒种', month: 6,  cropType: '小麦', activity: '收获',       description: '小麦成熟，抢晴收割晾晒。' },
      { solarTerm: '夏至', month: 6,  cropType: '水稻', activity: '田间管理',   description: '中耕除草，防治病虫害。' },
      { solarTerm: '大暑', month: 7,  cropType: '通用', activity: '抗旱排涝',   description: '高温多雨，注意抗旱与排涝。' },
      { solarTerm: '白露', month: 9,  cropType: '水稻', activity: '灌浆管理',   description: '保持田间湿润，促进灌浆。' },
      { solarTerm: '秋分', month: 9,  cropType: '水稻', activity: '收获',       description: '稻谷成熟，适时收割。' },
      { solarTerm: '寒露', month: 10, cropType: '小麦', activity: '秋播',       description: '适墒适期播种冬小麦。' },
      { solarTerm: '霜降', month: 10, cropType: '柑橘', activity: '采收',       description: '柑橘转色成熟，分批采收。' },
    ],
  })

  // ── 农药信息库 ────────────────────────────────────
  await prisma.pesticideInfo.createMany({
    data: [
      { name: '吡虫啉',   regNo: 'PD20081234', type: '杀虫剂', targetPest: '蚜虫、飞虱', cropType: '水稻/蔬菜', safeDosage: '10%可湿粉 20-30克/亩', safeInterval: '14天', toxicity: '低毒' },
      { name: '三环唑',   regNo: 'PD20070567', type: '杀菌剂', targetPest: '稻瘟病',     cropType: '水稻',      safeDosage: '20%可湿粉 75-100克/亩', safeInterval: '21天', toxicity: '低毒' },
      { name: '戊唑醇',   regNo: 'PD20095678', type: '杀菌剂', targetPest: '锈病、白粉病', cropType: '小麦',     safeDosage: '43%悬浮剂 15-20毫升/亩', safeInterval: '28天', toxicity: '低毒' },
      { name: '氯虫苯甲酰胺', regNo: 'PD20110890', type: '杀虫剂', targetPest: '玉米螟、钻蛀害虫', cropType: '玉米', safeDosage: '5%悬浮剂 30-50毫升/亩', safeInterval: '7天', toxicity: '微毒' },
      { name: '烯酰吗啉', regNo: 'PD20102345', type: '杀菌剂', targetPest: '霜霉病、疫病', cropType: '蔬菜',     safeDosage: '50%可湿粉 30-40克/亩',  safeInterval: '5天',  toxicity: '低毒' },
    ],
  })

  // ── 农产品行情 ────────────────────────────────────
  const priceRows = []
  const products = [
    { name: '水稻', cat: '粮油', base: 2.8 }, { name: '小麦', cat: '粮油', base: 2.6 },
    { name: '玉米', cat: '粮油', base: 2.4 }, { name: '番茄', cat: '蔬菜', base: 3.5 },
    { name: '黄瓜', cat: '蔬菜', base: 3.0 }, { name: '柑橘', cat: '水果', base: 4.2 },
    { name: '猕猴桃', cat: '水果', base: 8.5 }, { name: '生猪', cat: '畜禽', base: 16.0 },
  ]
  for (const p of products) {
    for (let d = 6; d >= 0; d--) {
      priceRows.push({
        productName: p.name, category: p.cat, marketName: '蒲江县农产品批发市场',
        regionCode: '510131', unit: p.name === '生猪' ? '元/公斤' : '元/公斤',
        price: Number((p.base + (Math.random() - 0.5) * p.base * 0.15).toFixed(2)),
        priceDate: daysAgo(d),
      })
    }
  }
  await prisma.marketPrice.createMany({ data: priceRows })

  await prisma.pricePrediction.createMany({
    data: [
      { productName: '水稻', predictDate: daysLater(7),  predictedPrice: 2.95, trend: 'UP',     advice: '价格预计小幅上涨，可适当延迟出售。' },
      { productName: '番茄', predictDate: daysLater(7),  predictedPrice: 3.20, trend: 'DOWN',   advice: '近期上市量增大，建议尽快销售。' },
      { productName: '柑橘', predictDate: daysLater(7),  predictedPrice: 4.30, trend: 'STABLE', advice: '价格平稳，按计划销售即可。' },
      { productName: '生猪', predictDate: daysLater(7),  predictedPrice: 16.8, trend: 'UP',     advice: '需求回暖，价格看涨。' },
      { productName: '猕猴桃', predictDate: daysLater(7), predictedPrice: 9.20, trend: 'UP',    advice: '临近旺季，价格预计上行。' },
    ],
  })

  // ── 政策 + RAG 切片 ───────────────────────────────
  const policies = [
    { title: '2026年耕地地力保护补贴实施方案', level: '国家级', category: '种植补贴',
      summary: '对拥有耕地承包权的种地农民给予地力保护补贴，按实际种植面积发放。',
      content: '为保护耕地地力，调动农民种粮积极性，对拥有耕地承包权的种地农民发放耕地地力保护补贴。补贴对象为实际耕种者，已退耕、非农占用、长年抛荒的耕地不予补贴。补贴标准按县级人民政府确定的亩均标准执行，资金通过"一卡通"直接发放到户。农户需在村委登记种植面积，经公示无异议后发放。',
      publishOrg: '农业农村部', applyGuide: '持身份证、土地承包证到村委登记，经乡镇审核公示后由财政"一卡通"发放。' },
    { title: '农机购置与应用补贴政策', level: '国家级', category: '农机补贴',
      summary: '对购买列入补贴目录农机具的农户、合作社给予定额补贴。',
      content: '农机购置补贴对购买拖拉机、收割机、插秧机、植保无人机等列入补贴目录的农业机械给予定额补贴。补贴对象为从事农业生产的个人和农业生产经营组织。实行"自主购机、定额补贴、县级结算、直补到卡"。单台补贴额不超过该档产品价格的30%。同一年度内单个购机者补贴机具数量有上限。',
      publishOrg: '农业农村部、财政部', applyGuide: '在补贴系统注册，购机后凭发票、机具合格证向县农机部门申请。' },
    { title: '稻谷最低收购价政策', level: '国家级', category: '金融',
      summary: '国家对稻谷实行最低收购价，保障种粮农民收益。',
      content: '为保护种粮农民利益，国家继续在稻谷主产区实行最低收购价政策。当市场价格低于最低收购价时，由指定收储企业按最低收购价敞开收购农民交售的稻谷。农民售粮应到正规收储库点，凭售粮卡结算，粮款及时兑付，严禁打白条。',
      publishOrg: '国家发展改革委', applyGuide: '持售粮卡到指定收储库点交售，现场检验定等结算。' },
    { title: '高标准农田建设项目申报指南', level: '省级', category: '种植补贴',
      summary: '支持田块整治、灌排设施、田间道路等高标准农田建设。',
      content: '高标准农田建设以提升耕地质量和粮食产能为目标，支持田块整治、土壤改良、灌溉与排水、田间道路、农田输配电等建设内容。项目由村集体或合作社申报，纳入县级年度建设计划。建成后的高标准农田要落实管护责任，确保长期发挥效益。',
      publishOrg: '四川省农业农村厅', applyGuide: '由村集体或合作社向乡镇提出申请，纳入县级项目库统筹安排。' },
    { title: '脱贫人口小额信贷政策', level: '省级', category: '金融',
      summary: '为脱贫户和监测对象提供5万元以下、3年期以内免担保免抵押信贷。',
      content: '脱贫人口小额信贷面向有贷款意愿、有就业创业项目、有还款能力的脱贫户和防止返贫监测对象，提供5万元以下、3年期以内、免担保免抵押、基准利率放贷、财政贴息的信贷支持。贷款用于发展生产经营，不得用于建房、购置非生产性资产。',
      publishOrg: '四川省乡村振兴局', applyGuide: '向村委提出申请，经审核评级授信后到承办银行办理。' },
    { title: '蒲江县柑橘产业奖补办法', level: '县级', category: '种植补贴',
      summary: '对标准化柑橘园改造、绿色防控、品牌建设给予奖补。',
      content: '为推动柑橘产业提质增效，蒲江县对连片新建或改造标准化柑橘园、采用绿色防控技术、参与品牌创建的农户和主体给予奖补。标准化改造按亩给予物化补助，绿色防控示范片给予技术服务支持，获得绿色食品、有机认证的给予一次性奖励。',
      publishOrg: '蒲江县农业农村局', applyGuide: '种植季前向乡镇申报，经验收合格后兑付奖补资金。' },
  ]
  for (const p of policies) {
    const created = await prisma.policy.create({
      data: { ...p, regionCode: '510131', validFrom: daysAgo(60), validTo: daysLater(300), viewCount: Math.floor(Math.random() * 500) },
    })
    // 简单切片：按句号切，存为 RAG chunk
    const sentences = created.content.split(/(?<=。)/).filter((s) => s.trim().length > 10)
    await prisma.policyChunk.createMany({
      data: sentences.map((s, i) => ({ policyId: created.id, chunkIndex: i, chunkContent: s.trim() })),
    })
  }

  // ── 党建学习内容 ──────────────────────────────────
  await prisma.partyLesson.createMany({
    data: [
      { title: '学习中央一号文件精神', type: '文章', pointsReward: 10, content: '中央一号文件连续多年聚焦"三农"，是党中央指导农业农村工作的纲领性文件。学习要点：全面推进乡村振兴、保障粮食安全、巩固拓展脱贫攻坚成果。' },
      { title: '党史学习：脱贫攻坚的伟大胜利', type: '文章', pointsReward: 10, content: '我国如期完成新时代脱贫攻坚目标任务，现行标准下农村贫困人口全部脱贫，创造了人类减贫史上的奇迹。' },
      { title: '乡村振兴战略二十字方针', type: '文章', pointsReward: 5, content: '产业兴旺、生态宜居、乡风文明、治理有效、生活富裕——这二十字是实施乡村振兴战略的总要求。' },
      { title: '基层党组织建设要点', type: '文章', pointsReward: 5, content: '加强农村基层党组织建设，发挥村党组织领导核心作用，把村党组织建成坚强战斗堡垒。' },
      { title: '学习"千万工程"经验', type: '视频', pointsReward: 10, content: '浙江"千村示范、万村整治"工程，是改善农村人居环境、推动乡村全面振兴的成功范例。' },
    ],
  })

  // ── 商品 ──────────────────────────────────────────
  await prisma.product.createMany({
    data: [
      { sellerId: farmer.id,    title: '生态散养土鸡蛋（30枚）',  category: '畜禽', price: 45,  unit: '箱', stock: 80, soldCount: 32, description: '自家散养土鸡所产，无添加，营养健康。' },
      { sellerId: farmer.id,    title: '现摘高山猕猴桃 5斤装',     category: '水果', price: 39,  unit: '箱', stock: 120, soldCount: 56, description: '蒲江高山猕猴桃，现摘现发，香甜多汁。' },
      { sellerId: bigfarmer.id, title: '当季新米 10斤装',          category: '粮油', price: 58,  unit: '袋', stock: 200, soldCount: 88, description: '当年新稻，现碾现卖，米香浓郁。' },
      { sellerId: bigfarmer.id, title: '红心柑橘 10斤装',          category: '水果', price: 42,  unit: '箱', stock: 150, soldCount: 47, description: '蒲江红心柑橘，皮薄汁多。' },
      { sellerId: farmer.id,    title: '农家自晒红薯干',           category: '其他', price: 25,  unit: '袋', stock: 60,  soldCount: 21, description: '传统工艺日晒，软糯香甜。' },
      { sellerId: merchant.id,  title: '有机蔬菜礼盒（混装8种）',  category: '蔬菜', price: 68,  unit: '盒', stock: 40,  soldCount: 15, description: '当季有机蔬菜混装，新鲜直供。' },
    ],
  })

  // ── 收购站 ────────────────────────────────────────
  await prisma.buyer.createMany({
    data: [
      { name: '蒲江县粮食收储中心', contactName: '刘经理', phone: '028-88660001', address: '蒲江县鹤山街道粮站路1号', regionCode: '510131', products: '水稻、小麦、玉米' },
      { name: '川西果业收购点',     contactName: '杨老板', phone: '028-88660002', address: '蒲江县寿安街道果品市场', regionCode: '510131', products: '柑橘、猕猴桃' },
      { name: '绿康蔬菜专业合作社', contactName: '周社长', phone: '028-88660003', address: '蒲江县寿安街道松华村',   regionCode: '510131100201', products: '番茄、黄瓜、叶菜' },
    ],
  })

  // ── 农机 ──────────────────────────────────────────
  await prisma.machinery.createMany({
    data: [
      { ownerId: bigfarmer.id, machineName: '东方红大型拖拉机', machineType: '拖拉机', dailyPrice: 380, deposit: 1000, regionCode: VILLAGE, totalHours: 1240, rating: 4.8, description: '90马力，配套旋耕机，适合整地。' },
      { ownerId: bigfarmer.id, machineName: '久保田联合收割机', machineType: '收割机', dailyPrice: 600, deposit: 2000, regionCode: VILLAGE, totalHours: 860,  rating: 4.9, description: '水稻小麦通用，作业效率高。' },
      { ownerId: merchant.id,  machineName: '高速插秧机',       machineType: '插秧机', dailyPrice: 320, deposit: 800,  regionCode: VILLAGE, totalHours: 420,  rating: 4.6, description: '6行高速插秧，省工省时。' },
      { ownerId: merchant.id,  machineName: '植保无人机',       machineType: '植保机', dailyPrice: 260, deposit: 1500, regionCode: VILLAGE, totalHours: 310,  rating: 4.7, description: '20升载药量，喷洒均匀。' },
    ],
  })

  // ── 天气预警 ──────────────────────────────────────
  await prisma.weatherAlert.createMany({
    data: [
      { alertType: '暴雨', alertLevel: '橙', regionCode: '510131', title: '暴雨橙色预警', content: '预计未来12小时蒲江县有强降雨，累计雨量50-80毫米。', defenseGuide: '及时疏通沟渠排水，低洼田块注意排涝，加固大棚设施。', validFrom: daysAgo(0), validTo: daysLater(1) },
      { alertType: '霜冻', alertLevel: '黄', regionCode: '510131', title: '霜冻黄色预警', content: '受冷空气影响，未来两天最低气温降至2℃以下。', defenseGuide: '柑橘园熏烟防霜，蔬菜大棚加盖保温，果树主干涂白。', validFrom: daysLater(2), validTo: daysLater(4) },
      { alertType: '大风', alertLevel: '蓝', regionCode: '510131', title: '大风蓝色预警', content: '预计有5-6级偏北风，阵风7级。', defenseGuide: '加固大棚棚膜，绑扶高秆作物，妥善存放农资。', validFrom: daysAgo(0), validTo: daysLater(1) },
    ],
  })

  // ── 应急预案 ──────────────────────────────────────
  await prisma.emergencyGuide.createMany({
    data: [
      { title: '农田暴雨洪涝应急处置', disasterType: '防汛', category: '洪涝', content: '暴雨来临前后的田间排涝与抢救措施。', steps: JSON.stringify(['提前疏通排水沟渠', '低洼田块及时排涝', '退水后及时扶正洗苗', '追施速效肥促恢复', '加强病害防治']) },
      { title: '持续干旱抗旱指南',     disasterType: '防旱', category: '干旱', content: '干旱期节水灌溉与保墒措施。', steps: JSON.stringify(['优先保灌关键生育期', '采用沟灌、滴灌节水', '中耕松土减少蒸发', '覆盖秸秆保墒', '适当疏除弱苗']) },
      { title: '低温冻害防护手册',     disasterType: '防冻', category: '冻害', content: '寒潮霜冻来临的防护要点。', steps: JSON.stringify(['关注预警提前准备', '熏烟法提高近地温度', '灌水增加土壤热容', '覆盖薄膜草帘保温', '冻后及时清理受害部位']) },
      { title: '森林田间防火须知',     disasterType: '防火', category: '火灾', content: '农事用火安全与火情处置。', steps: JSON.stringify(['严禁野外违规用火', '清除田边可燃物', '发现火情立即报警', '小火可用湿物扑打', '人员安全撤离优先']) },
    ],
  })

  // ── 职业农民培训课程 ──────────────────────────────
  await prisma.trainingCourse.createMany({
    data: [
      { title: '水稻绿色高产栽培技术', category: '种植技术', instructor: '赵农技', durationMin: 45, certName: '新型职业农民培训合格证', enrollCount: 126, content: '从品种选择、育秧、田间管理到病虫害绿色防控的全程技术。' },
      { title: '柑橘标准化种植管理',   category: '种植技术', instructor: '李专家', durationMin: 60, certName: '柑橘种植技能证书',       enrollCount: 98,  content: '柑橘园建园、整形修剪、肥水管理、病虫防治标准化技术。' },
      { title: '农产品电商运营入门',   category: '经营管理', instructor: '王老师', durationMin: 50, certName: '农村电商初级证书',       enrollCount: 215, content: '网店开设、产品拍摄、直播带货、物流发货实操。' },
      { title: '农机安全操作规范',     category: '农机技术', instructor: '陈师傅', durationMin: 40, certName: '农机操作合格证',         enrollCount: 73,  content: '拖拉机、收割机的安全操作与日常维护保养。' },
      { title: '家庭农场经营与记账',   category: '经营管理', instructor: '周会计', durationMin: 35, certName: '家庭农场管理证书',       enrollCount: 64,  content: '成本核算、收支记账、利润分析与经营决策。' },
    ],
  })

  // ── 贷款产品 ──────────────────────────────────────
  await prisma.loanProduct.createMany({
    data: [
      { bankName: '中国农业银行', productName: '惠农e贷',     interestRate: 3.85, maxAmount: 300000, term: '1-3年', requirement: '从事农业生产经营，信用良好。', description: '线上申请、随借随还的纯信用农户贷款。' },
      { bankName: '农村信用社',   productName: '农户小额信用贷', interestRate: 4.35, maxAmount: 100000, term: '1年',   requirement: '本地农户，有稳定收入来源。', description: '免担保免抵押，支持春耕生产。' },
      { bankName: '中国邮政储蓄银行', productName: '产业振兴贷', interestRate: 4.05, maxAmount: 500000, term: '1-5年', requirement: '家庭农场、合作社等新型经营主体。', description: '支持规模化农业生产经营。' },
      { bankName: '四川乡村振兴局', productName: '脱贫人口小额信贷', interestRate: 0, maxAmount: 50000, term: '3年以内', requirement: '脱贫户及防返贫监测对象。', description: '免担保免抵押、财政全额贴息。' },
    ],
  })

  // ── 就业信息 ──────────────────────────────────────
  await prisma.jobInfo.createMany({
    data: [
      { title: '柑橘采摘临时工',     jobType: '本地用工', company: '川西果业合作社', location: '蒲江县寿安街道', salary: '150元/天', headcount: 20, requirement: '能吃苦，有采摘经验优先。', contactPhone: '13800001111', regionCode: '510131' },
      { title: '大棚蔬菜种植管理员', jobType: '本地用工', company: '绿康蔬菜合作社', location: '松华村',         salary: '4500元/月', headcount: 3,  requirement: '熟悉大棚蔬菜管理。',     contactPhone: '13800002222', regionCode: VILLAGE },
      { title: '农机操作手',         jobType: '本地用工', company: '建国家庭农场',   location: '蒲江县',         salary: '面议',      headcount: 2,  requirement: '持农机操作证。',         contactPhone: '13800003333', regionCode: '510131' },
      { title: '电子厂普工（成都）', jobType: '外出务工', company: '成都某电子厂',   location: '成都高新区',     salary: '5500-7000元/月', headcount: 50, requirement: '18-45岁，包吃住。',  contactPhone: '13800004444', regionCode: '510100' },
      { title: '冷链仓库分拣员',     jobType: '外出务工', company: '物流园区',       location: '成都双流',       salary: '6000元/月', headcount: 15, requirement: '能适应低温作业。',       contactPhone: '13800005555', regionCode: '510100' },
    ],
  })

  // ── 乡村旅游 ──────────────────────────────────────
  await prisma.tourismSpot.createMany({
    data: [
      { name: '松华村柑橘采摘园', spotType: '景点',   regionCode: VILLAGE, address: '松华村橘香路', price: 30, phone: '13800006666', rating: 4.7, description: '万亩柑橘园，秋冬季可入园采摘体验。', promoText: '橘黄时节，来松华村摘一筐阳光的味道。' },
      { name: '田园人家农家乐',   spotType: '农家乐', regionCode: VILLAGE, address: '松华村村口',   price: 88, phone: '13800007777', rating: 4.6, description: '地道农家菜，柴火土灶，可垂钓。', promoText: '柴火饭菜香，田园慢生活，周末来松华村歇歇脚。' },
      { name: '茶山民宿',         spotType: '民宿',   regionCode: '510131', address: '蒲江县成佳镇', price: 268, phone: '13800008888', rating: 4.8, description: '茶园环抱，观景露台，静享山居。', promoText: '推窗见茶山，夜枕虫鸣眠。' },
    ],
  })

  // ── 村卫生室 ──────────────────────────────────────
  await prisma.clinic.createMany({
    data: [
      { name: '松华村卫生室', regionCode: VILLAGE, address: '松华村便民服务中心旁', doctorName: '孙医生', phone: '028-88661001', services: '常见病诊疗、慢病随访、健康咨询、儿童预防接种' },
      { name: '寿安街道卫生院', regionCode: '510131100', address: '寿安街道健康路8号', doctorName: '马医生', phone: '028-88661002', services: '门诊、住院、急诊、中医理疗、公共卫生服务' },
    ],
  })

  // ── 乡村人才库 ────────────────────────────────────
  await prisma.talentProfile.createMany({
    data: [
      { userId: bigfarmer.id, name: '李建国', talentType: '致富带头人', skills: '柑橘规模化种植、合作社经营', regionCode: VILLAGE, description: '带领20余户农户发展柑橘产业，年产值超300万元。', contactPhone: '13800000002' },
      { name: '吴篾匠', talentType: '乡村工匠', skills: '竹编、传统农具制作', regionCode: VILLAGE, description: '从事竹编四十余年，作品被县非遗中心收藏。', contactPhone: '13800009999' },
      { name: '何技师', talentType: '农技能人', skills: '果树嫁接、病虫害诊断', regionCode: '510131', description: '县级农民技术员，常年义务为乡邻指导果树管理。', contactPhone: '13800010000' },
    ],
  })

  // ── 快递代收站 ────────────────────────────────────
  await prisma.expressPoint.createMany({
    data: [
      { name: '松华村快递服务点', regionCode: VILLAGE, address: '松华村便民服务中心', phone: '13800011111', companies: '中通、圆通、韵达、邮政', businessHours: '08:00-19:00' },
      { name: '寿安街道菜鸟驿站', regionCode: '510131100', address: '寿安街道商业街', phone: '13800012222', companies: '菜鸟、京东、顺丰、极兔', businessHours: '08:30-20:00' },
    ],
  })

  // ── 农户的地块与农事记录 ──────────────────────────
  const plot1 = await prisma.landPlot.create({
    data: { userId: farmer.id, plotName: '东头水田', areaMu: 3.5, cropType: '水稻', soilType: '壤土', regionCode: VILLAGE },
  })
  const plot2 = await prisma.landPlot.create({
    data: { userId: farmer.id, plotName: '后山橘园', areaMu: 5.0, cropType: '柑橘', soilType: '黄壤', regionCode: VILLAGE },
  })
  await prisma.farmRecord.createMany({
    data: [
      { userId: farmer.id, plotId: plot1.id, recordType: '播种', cropType: '水稻', content: '播种育秧，亩用种3公斤。', cost: 180, recordDate: daysAgo(40) },
      { userId: farmer.id, plotId: plot1.id, recordType: '施肥', cropType: '水稻', content: '追施返青肥，尿素15公斤/亩。', cost: 220, recordDate: daysAgo(25) },
      { userId: farmer.id, plotId: plot1.id, recordType: '打药', cropType: '水稻', content: '防治稻飞虱，喷施吡虫啉。', cost: 95,  recordDate: daysAgo(10) },
      { userId: farmer.id, plotId: plot2.id, recordType: '灌溉', cropType: '柑橘', content: '果实膨大期灌水一次。', cost: 60,  recordDate: daysAgo(7) },
    ],
  })
  await prisma.yieldPrediction.create({
    data: { plotId: plot1.id, cropType: '水稻', predictedYield: 1925, confidenceLow: 1750, confidenceHigh: 2100, predictDate: daysLater(45) },
  })

  // ── 灾情上报 ──────────────────────────────────────
  await prisma.disasterReport.create({
    data: { userId: farmer.id, disasterType: '暴雨', plotId: plot1.id, affectedArea: 1.2, estimatedLoss: 1800,
      description: '连续强降雨导致东头水田局部积水，秧苗倒伏。', aiLossLevel: '中', status: 'REVIEWING', regionCode: VILLAGE },
  })

  // ── 村务公开 ──────────────────────────────────────
  await prisma.villageAffair.createMany({
    data: [
      { regionCode: VILLAGE, category: '财务', title: '松华村2026年第一季度财务收支公开', content: '本季度集体收入12.6万元，支出8.3万元，结余4.3万元。明细已张榜公示。', publishOrg: '松华村村委会' },
      { regionCode: VILLAGE, category: '工程', title: '村组道路硬化工程进展公示', content: '3.2公里村组道路硬化工程已完成施工招标，预计下月开工。', publishOrg: '松华村村委会' },
      { regionCode: VILLAGE, category: '评优', title: '2026年度星级文明户评选结果公示', content: '经村民代表评议，张大山等15户被评为五星级文明户，现予公示。', publishOrg: '松华村村委会' },
    ],
  })

  // ── 文明乡风榜 ────────────────────────────────────
  await prisma.honorRecord.createMany({
    data: [
      { regionCode: VILLAGE, honoreeName: '张大山', honorType: '好人好事', deed: '主动帮助邻里抢收稻谷，连续三年义务疏通村排水沟。', votes: 86 },
      { regionCode: VILLAGE, honoreeName: '李建国', honorType: '星级文明户', deed: '带头发展产业，热心公益，家庭和睦，被评为五星级文明户。', votes: 72 },
      { regionCode: VILLAGE, honoreeName: '王秀英', honorType: '好人好事', deed: '十年如一日照顾村中孤寡老人，传递孝老爱亲正能量。', votes: 95 },
    ],
  })

  // ── 民俗文化记录 ──────────────────────────────────
  await prisma.folkCulture.createMany({
    data: [
      { userId: bigfarmer.id, title: '松华村村史溯源', cultureType: '村史', regionCode: VILLAGE, content: '松华村始建于清代，因村中古松成荫、华盖如云而得名，世代以稻作和柑橘种植为生。' },
      { title: '蒲江竹编技艺', cultureType: '非遗', regionCode: '510131', content: '蒲江竹编历史悠久，以选材精、编工细著称，2010年列入县级非物质文化遗产名录。' },
    ],
  })

  // ── 农资团购 ──────────────────────────────────────
  await prisma.groupBuy.createMany({
    data: [
      { initiatorId: bigfarmer.id, title: '复合肥春耕团购', itemName: '45%硫基复合肥', category: '化肥', unitPrice: 135, targetCount: 100, currentCount: 67, regionCode: VILLAGE, deadline: daysLater(10) },
      { initiatorId: farmer.id,    title: '水稻种子集采',   itemName: '杂交稻种（宜香优）', category: '种子', unitPrice: 48, targetCount: 50, currentCount: 23, regionCode: VILLAGE, deadline: daysLater(15) },
    ],
  })

  // ── 邻里互助 ──────────────────────────────────────
  await prisma.helpRequest.createMany({
    data: [
      { userId: farmer.id, type: '求助', title: '求助：周末缺2个采橘帮手', content: '后山橘园柑橘成熟，本周末需要2人帮忙采摘，提供午饭和工钱。', regionCode: VILLAGE, contactPhone: '13800000001' },
      { userId: bigfarmer.id, type: '提供帮助', title: '可免费提供旋耕机作业', content: '农机闲置，本村农户整地可免费帮忙，只收柴油费。', regionCode: VILLAGE, contactPhone: '13800000002' },
    ],
  })

  // ── 二手交易 ──────────────────────────────────────
  await prisma.secondhandItem.createMany({
    data: [
      { sellerId: farmer.id,    title: '九成新手扶拖拉机出售', category: '农机具', price: 3200, regionCode: VILLAGE, description: '使用两年，性能良好，因换大型机出售。' },
      { sellerId: bigfarmer.id, title: '闲置喷雾器3台',         category: '农具',   price: 80,   regionCode: VILLAGE, description: '电动喷雾器，几乎全新。' },
      { sellerId: merchant.id,  title: '二手周转筐若干',         category: '其他',   price: 5,    regionCode: VILLAGE, description: '塑料周转筐，量大从优。' },
    ],
  })

  // ── 通知 ──────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: null, type: 'ALERT',  title: '暴雨橙色预警', content: '未来12小时有强降雨，请做好田间排涝准备。' },
      { userId: null, type: 'POLICY', title: '新政策发布',   content: '《2026年耕地地力保护补贴实施方案》已发布，请及时查看。' },
      { userId: farmer.id, type: 'FARM', title: '农事提醒', content: '东头水田水稻进入分蘖期，注意田间水分管理。' },
    ],
  })

  // 统计
  const userCount = await prisma.user.count()
  const tableCount = tables.length
  console.log(`  用户 ${userCount} 个`)
  console.log(`  已写入 ${tableCount} 类业务数据`)
  console.log('种子数据写入完成 ✓')
  console.log('  测试账号：farmer / bigfarmer / village / expert / merchant / admin（密码均为 123456）')
}

main()
  .catch((e) => { console.error('种子写入失败:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
