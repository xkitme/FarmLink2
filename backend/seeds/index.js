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
const dateOf = (value) => new Date(`${value}T08:00:00.000+08:00`)

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
      mkUser('farmer',    '张大叔', 'FARMER',    '张大山', '13800000001'),
      mkUser('bigfarmer', '李大姐', 'BIGFARMER', '李桂兰', '13800000002'),
      mkUser('village',   '王村委', 'VILLAGE',   '王建华', '13800000003'),
      mkUser('expert',    '赵农技', 'EXPERT',    '赵建军', '13800000004'),
      mkUser('merchant',  '陈收购', 'MERCHANT',  '陈志远', '13800000005'),
      mkUser('admin',     '管理员', 'ADMIN',     '系统管理员', '13800000000'),
    ],
  })
  const farmer    = await prisma.user.findUnique({ where: { username: 'farmer' } })
  const bigfarmer = await prisma.user.findUnique({ where: { username: 'bigfarmer' } })
  const village   = await prisma.user.findUnique({ where: { username: 'village' } })
  const merchant  = await prisma.user.findUnique({ where: { username: 'merchant' } })

  // 三位主角的积分流水：张大叔、李大姐、王村委。
  await prisma.pointsLog.createMany({
    data: [
      { userId: farmer.id, points: 10, type: 'SIGN_IN',   remark: '每日签到' },
      { userId: farmer.id, points: 5,  type: 'LEARN',      remark: '党建学习打卡' },
      { userId: farmer.id, points: 20, type: 'VOLUNTEER',  remark: '参与村庄排水沟清理' },
      { userId: farmer.id, points: 30, type: 'AGRI_RECORD', remark: '完善全年农事记录' },
      { userId: bigfarmer.id, points: 40, type: 'TRAINING', remark: '完成柑橘标准化培训' },
      { userId: bigfarmer.id, points: 36, type: 'MARKET', remark: '完成农产品溯源上架' },
      { userId: village.id, points: 50, type: 'GOVERNANCE', remark: '完成村级统计上报' },
      { userId: village.id, points: 45, type: 'VOLUNTEER', remark: '组织防汛巡田' },
    ],
  })
  await prisma.user.update({ where: { id: farmer.id }, data: { points: 65 } })
  await prisma.user.update({ where: { id: bigfarmer.id }, data: { points: 76 } })
  await prisma.user.update({ where: { id: village.id }, data: { points: 95 } })

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
      { key: 'offline_sync',      name: '数据同步',       category: '平台',     description: '待发送队列与自动重传' },
    ],
  })

  // ── 病害知识库 ────────────────────────────────────
  await prisma.diseaseKnowledge.createMany({
    data: [
      { diseaseName: '稻瘟病', cropType: '水稻', category: '病害', modelLabel: 'rice_blast', symptoms: '叶片出现梭形或菱形病斑，穗颈受害后易形成白穗。', cause: '稻瘟病菌侵染，连阴雨、田间高湿和偏施氮肥时易流行。', prevention: '选用抗病品种，种子处理，合理密植和配方施肥，发现中心病株后及时处置。', medicineAdvice: '可选登记用于水稻稻瘟病的三环唑、稻瘟灵等药剂，严格按标签用量和安全间隔期执行。' },
      { diseaseName: '水稻纹枯病', cropType: '水稻', category: '病害', modelLabel: 'rice_sheath_blight', symptoms: '叶鞘近水面处出现云纹状病斑，严重时叶片枯黄、植株倒伏。', cause: '纹枯病菌在高温高湿、郁闭田块中扩展较快。', prevention: '合理密植，避免偏施氮肥，适时晒田，及时清除病残体。', medicineAdvice: '可选登记用于水稻纹枯病的井冈霉素等药剂，按标签在发病初期施用。' },
      { diseaseName: '稻飞虱', cropType: '水稻', category: '虫害', modelLabel: 'rice_planthopper', symptoms: '若虫和成虫集中在稻丛基部吸汁，叶片发黄，严重时成片枯死形成冒穿。', cause: '迁飞性害虫在高温高湿和偏施氮肥田块中易繁殖。', prevention: '加强田间虫量监测，合理密植，保护蜘蛛等天敌，达到防治指标后再用药。', medicineAdvice: '可选登记用于水稻稻飞虱的吡虫啉、吡蚜酮等药剂，按标签轮换使用。' },
      { diseaseName: '二化螟', cropType: '水稻', category: '虫害', modelLabel: 'rice_stem_borer', symptoms: '幼虫蛀食茎秆，分蘖期出现枯心苗，抽穗期可见白穗。', cause: '螟虫幼虫钻蛀危害，田边稻桩和秸秆可成为越冬场所。', prevention: '及时处理稻桩秸秆，结合诱捕和测报掌握卵孵高峰，统一防治。', medicineAdvice: '可选登记用于水稻螟虫的氯虫苯甲酰胺等药剂，在适宜时期按标签施用。' },
      { diseaseName: '稻曲病', cropType: '水稻', category: '病害', modelLabel: 'rice_false_smut', symptoms: '稻穗部分颖壳内形成黄绿色至墨绿色稻曲球，影响结实和品质。', cause: '稻曲病菌侵染，抽穗扬花期多雨和偏施氮肥时易发生。', prevention: '选用抗病品种，合理施肥，避免后期偏氮，及时清理病穗。', medicineAdvice: '在当地植保指导下选用登记药剂，于破口抽穗前后按标签防治。' },
      { diseaseName: '水稻白叶枯病', cropType: '水稻', category: '病害', modelLabel: 'rice_bacterial_blight', symptoms: '叶尖或叶缘出现黄绿色水渍状条斑，随后扩展成灰白色枯斑。', cause: '细菌性病害可随种子、病残体和灌溉水传播，暴雨大风后易加重。', prevention: '选用抗病品种和健康种子，避免串灌漫灌，暴雨后及时排水。', medicineAdvice: '发现病株后咨询当地植保人员，按登记标签选择细菌性病害防治药剂。' },
      { diseaseName: '玉米大斑病', cropType: '玉米', category: '病害', modelLabel: 'corn_northern_leaf_blight', symptoms: '叶片出现长梭形灰褐色大斑，严重时多个病斑连片导致叶片早枯。', cause: '病菌随病残体越冬，温凉高湿和连作田块易发。', prevention: '选用抗病品种，轮作倒茬，及时清理病残体，合理密植。', medicineAdvice: '发病初期可选登记用于玉米叶斑病的杀菌剂，严格按标签施用。' },
      { diseaseName: '玉米小斑病', cropType: '玉米', category: '病害', modelLabel: 'corn_southern_leaf_blight', symptoms: '叶片出现椭圆形或近长方形黄褐色小斑，潮湿时扩展较快。', cause: '病菌借风雨传播，高温高湿、田间郁闭时易流行。', prevention: '选择抗病品种，合理密植，雨后及时排水并清除病残体。', medicineAdvice: '发病初期按当地植保建议选用登记药剂，注意轮换作用机制。' },
      { diseaseName: '玉米螟', cropType: '玉米', category: '虫害', modelLabel: 'corn_borer', symptoms: '心叶被蛀后展开形成成排孔洞，茎秆和果穗受害后易折断或霉变。', cause: '玉米螟幼虫钻蛀危害，秸秆可成为越冬寄主。', prevention: '处理越冬秸秆，结合赤眼蜂等绿色防控措施，在心叶期加强监测。', medicineAdvice: '可选登记用于玉米螟的氯虫苯甲酰胺等药剂，按标签在适期施用。' },
      { diseaseName: '玉米粘虫', cropType: '玉米', category: '虫害', modelLabel: 'corn_armyworm', symptoms: '幼虫咬食叶片，轻者形成缺刻，暴发时短期内可将叶片吃光。', cause: '迁飞性害虫在适宜温湿度下集中繁殖。', prevention: '加强田间巡查，重点查看叶背和心叶，低龄幼虫期及时处置。', medicineAdvice: '达到防治指标后选用登记用于玉米粘虫的低风险药剂，按标签均匀喷施。' },
      { diseaseName: '玉米蚜虫', cropType: '玉米', category: '虫害', modelLabel: 'corn_aphid', symptoms: '蚜虫群集叶片和雄穗吸汁，分泌蜜露，严重时影响授粉和灌浆。', cause: '温暖干燥、田间天敌数量不足时虫口增长较快。', prevention: '保护瓢虫和草蛉等天敌，清理田边杂草，达到指标后再防治。', medicineAdvice: '可选登记用于玉米蚜虫的药剂，注意避开授粉高峰并严格按标签执行。' },
      { diseaseName: '小麦条锈病', cropType: '小麦', category: '病害', modelLabel: 'wheat_stripe_rust', symptoms: '叶片出现沿叶脉排列的黄色条状夏孢子堆，手触可沾粉。', cause: '条锈菌侵染，春季气温适宜且多雨时易扩散。', prevention: '选用抗病品种，适期播种，春季加强监测，发现中心病叶及时处置。', medicineAdvice: '可选登记用于小麦锈病的戊唑醇、丙环唑等药剂，按标签施用。' },
      { diseaseName: '小麦白粉病', cropType: '小麦', category: '病害', modelLabel: 'wheat_powdery_mildew', symptoms: '叶片和茎秆表面出现白色粉状霉层，后期可形成黑色小点。', cause: '田间郁闭、偏施氮肥和湿度较高时病害易加重。', prevention: '合理密植，配方施肥，改善通风透光，发现病斑及时处理。', medicineAdvice: '可选登记用于小麦白粉病的三唑类药剂，按标签轮换施用。' },
      { diseaseName: '小麦赤霉病', cropType: '小麦', category: '病害', modelLabel: 'wheat_fusarium_head_blight', symptoms: '穗部出现褐色水渍状病斑，部分小穗枯白，湿度大时可见粉红色霉层。', cause: '扬花期连续阴雨有利于病菌侵染。', prevention: '选择抗病品种，合理轮作，重点关注抽穗扬花期天气并适时预防。', medicineAdvice: '在抽穗扬花关键期按当地植保预报选用登记药剂，严格执行标签。' },
      { diseaseName: '小麦蚜虫', cropType: '小麦', category: '虫害', modelLabel: 'wheat_aphid', symptoms: '蚜虫群集在叶片和穗部吸汁，严重时叶片发黄、籽粒灌浆不足。', cause: '温暖干燥条件有利于蚜虫繁殖，也可能传播病毒。', prevention: '保护天敌，加强抽穗灌浆期虫量监测，达到指标后及时防治。', medicineAdvice: '可选登记用于小麦蚜虫的吡虫啉等药剂，按标签控制用量和安全间隔期。' },
      { diseaseName: '小麦纹枯病', cropType: '小麦', category: '病害', modelLabel: 'wheat_sharp_eyespot', symptoms: '茎基部出现褐色云纹状病斑，严重时形成枯白穗并易倒伏。', cause: '土壤和病残体带菌，连作、播量过大和田间郁闭易加重。', prevention: '轮作倒茬，合理播量，清沟排湿，返青期加强检查。', medicineAdvice: '按当地植保建议选用登记用于小麦纹枯病的药剂，在适期施用。' },
      { diseaseName: '番茄晚疫病', cropType: '番茄', category: '病害', modelLabel: 'tomato_late_blight', symptoms: '叶片出现水渍状暗绿色病斑，潮湿时叶背有白霉，果实可形成褐色硬腐斑。', cause: '致病疫霉在低温高湿、通风不良条件下扩展迅速。', prevention: '加强通风降湿，避免叶面长时间结露，及时摘除病叶病果。', medicineAdvice: '可选登记用于番茄晚疫病的烯酰吗啉等药剂，按标签交替使用。' },
      { diseaseName: '番茄早疫病', cropType: '番茄', category: '病害', modelLabel: 'tomato_early_blight', symptoms: '下部叶片先出现具有同心轮纹的褐色病斑，严重时叶片黄化脱落。', cause: '病菌随病残体传播，植株衰弱、连作和高湿条件下易发。', prevention: '轮作换茬，清除病残体，避免大水漫灌，保持植株健壮。', medicineAdvice: '发病初期可选登记用于番茄早疫病的代森锰锌等药剂，按标签施用。' },
      { diseaseName: '番茄病毒病', cropType: '番茄', category: '病害', modelLabel: 'tomato_virus', symptoms: '叶片花叶、卷曲或黄化，植株矮化，果实可能出现畸形。', cause: '病毒可由带毒苗、蚜虫和粉虱传播，高温干旱时常较重。', prevention: '使用健康种苗，及时防治传毒昆虫，拔除重病株并做好工具消毒。', medicineAdvice: '病毒病无特效治疗药剂，重点是健康种苗和媒介昆虫绿色防控。' },
      { diseaseName: '番茄脐腐病', cropType: '番茄', category: '缺素', modelLabel: 'tomato_blossom_end_rot', symptoms: '幼果脐部出现水渍状斑，随后扩大为黑褐色凹陷坏死斑。', cause: '果实膨大期水分供应不均或根系吸收钙受阻导致生理性缺钙。', prevention: '保持土壤水分均匀，避免一次性大量施肥，保护根系并合理补钙。', medicineAdvice: '属于生理性问题，优先改善水肥管理；叶面补钙应按肥料标签执行。' },
      { diseaseName: '番茄缺镁症', cropType: '番茄', category: '缺素', modelLabel: 'tomato_magnesium_deficiency', symptoms: '番茄下部老叶叶脉间发黄，叶脉仍保持绿色，严重时叶缘坏死。', cause: '土壤镁供应不足或钾、钙施用失衡影响镁吸收。', prevention: '结合土壤检测平衡施肥，避免偏施钾肥，保持适宜土壤酸碱度。', medicineAdvice: '确认缺镁后按肥料标签补充含镁肥料，避免未经诊断盲目加量。' },
      { diseaseName: '黄瓜霜霉病', cropType: '黄瓜', category: '病害', modelLabel: 'cucumber_downy_mildew', symptoms: '叶片出现受叶脉限制的多角形黄斑，叶背潮湿时可见灰黑色霉层。', cause: '棚内湿度高、叶面结露和通风不良有利于病害发生。', prevention: '通风降湿，膜下灌水，及时摘除病叶，避免叶面长时间潮湿。', medicineAdvice: '可选登记用于黄瓜霜霉病的烯酰吗啉、嘧菌酯等药剂，按标签轮换施用。' },
      { diseaseName: '黄瓜白粉病', cropType: '黄瓜', category: '病害', modelLabel: 'cucumber_powdery_mildew', symptoms: '叶面出现白色粉状小斑，逐步连片，严重时叶片早衰。', cause: '温暖、通风不良和植株生长过密时易发生。', prevention: '合理密植，改善通风透光，及时摘除病叶，避免偏施氮肥。', medicineAdvice: '发病初期选用登记用于黄瓜白粉病的药剂，按标签交替使用。' },
      { diseaseName: '黄瓜蚜虫', cropType: '黄瓜', category: '虫害', modelLabel: 'cucumber_aphid', symptoms: '嫩叶卷曲、发黄，叶背可见群集蚜虫和蜜露，常伴随病毒传播风险。', cause: '蚜虫刺吸危害并传播病毒，棚室环境中繁殖较快。', prevention: '设置防虫网和黄板，清理杂草，保护天敌，及时控制虫源。', medicineAdvice: '可选登记用于黄瓜蚜虫的低风险药剂，按标签并注意轮换用药。' },
      { diseaseName: '辣椒炭疽病', cropType: '辣椒', category: '病害', modelLabel: 'pepper_anthracnose', symptoms: '果实出现水渍状圆形病斑，后期凹陷并形成轮纹状小黑点。', cause: '病菌随种子和病残体传播，高温多雨时易流行。', prevention: '使用健康种子，轮作换茬，及时清除病果，改善田间排水。', medicineAdvice: '发病初期选用登记用于辣椒炭疽病的杀菌剂，按标签轮换施用。' },
      { diseaseName: '辣椒疫病', cropType: '辣椒', category: '病害', modelLabel: 'pepper_phytophthora_blight', symptoms: '茎基部水渍状缢缩，植株迅速萎蔫，果实也可出现暗绿色腐烂。', cause: '疫霉菌随水传播，积水和连作田块发生较重。', prevention: '高畦栽培，清沟排水，轮作换茬，发现病株及时清除。', medicineAdvice: '可选登记用于辣椒疫病的药剂，在发病初期按标签灌根或喷施。' },
      { diseaseName: '白菜软腐病', cropType: '白菜', category: '病害', modelLabel: 'cabbage_soft_rot', symptoms: '叶柄或菜心出现水渍状软腐，伴随明显异味，受害组织易塌陷。', cause: '细菌从伤口侵入，高温高湿、虫伤和积水会加重病害。', prevention: '避免机械伤口，防治害虫，雨后排水，及时清除病株并带出田外。', medicineAdvice: '以田间卫生和排水为主，必要时按登记标签选用细菌性病害防治药剂。' },
      { diseaseName: '十字花科根结线虫', cropType: '白菜/萝卜', category: '虫害', modelLabel: 'brassica_root_knot_nematode', symptoms: '根部形成大小不一的根结，植株生长缓慢，晴天中午易萎蔫。', cause: '根结线虫在连作土壤中积累，通过带虫土壤、种苗和灌溉水传播。', prevention: '实行轮作，使用健康种苗，清除病根，结合土壤处理降低虫源。', medicineAdvice: '需要用药时仅选登记用于相应作物的线虫防治药剂，并按标签执行。' },
      { diseaseName: '柑橘黄龙病', cropType: '柑橘', category: '病害', modelLabel: 'citrus_greening', symptoms: '叶片斑驳黄化，果实小而畸形，常出现青果红鼻子，树势逐渐衰退。', cause: '病原由柑橘木虱传播，也可随带病苗木扩散。', prevention: '严格检疫，使用无病苗木，及时清除病树并持续防治木虱。', medicineAdvice: '目前无有效治疗药剂，重点是清除病树、控制木虱和使用健康苗木。' },
      { diseaseName: '柑橘木虱', cropType: '柑橘', category: '虫害', modelLabel: 'citrus_psyllid', symptoms: '嫩梢上可见成虫和若虫吸汁，嫩叶卷曲，若虫分泌白色蜡丝。', cause: '柑橘木虱繁殖危害并传播黄龙病，抽梢期虫口上升明显。', prevention: '统一放梢，及时抹除零星嫩梢，监测新梢虫量，结合黄板和天敌控制。', medicineAdvice: '达到指标后选用登记用于柑橘木虱的药剂，按标签轮换使用。' },
      { diseaseName: '柑橘红蜘蛛', cropType: '柑橘', category: '虫害', modelLabel: 'citrus_red_mite', symptoms: '叶面出现灰白色失绿小点，严重时叶片失去光泽并提前脱落。', cause: '叶螨刺吸危害，干旱少雨和滥用广谱杀虫剂可能导致暴发。', prevention: '巡查叶背虫口，保护捕食螨，改善果园通风，达到指标后再用药。', medicineAdvice: '可选登记用于柑橘红蜘蛛的螺螨酯等药剂，注意轮换并按标签执行。' },
      { diseaseName: '柑橘溃疡病', cropType: '柑橘', category: '病害', modelLabel: 'citrus_canker', symptoms: '叶片、枝梢和果实出现木栓化隆起病斑，病斑周围常有黄色晕圈。', cause: '细菌性病害经风雨和伤口传播，台风、暴雨和潜叶蛾危害后易加重。', prevention: '使用无病苗木，修剪病枝，防治潜叶蛾，风雨前后加强预防。', medicineAdvice: '按当地植保建议选用登记用于柑橘溃疡病的铜制剂等药剂。' },
      { diseaseName: '柑橘炭疽病', cropType: '柑橘', category: '病害', modelLabel: 'citrus_anthracnose', symptoms: '叶片、枝梢或果实出现褐色病斑，树势弱时枯梢和落果增加。', cause: '病菌在病残体上越冬，果园郁闭、树势衰弱和连续阴雨时易发。', prevention: '合理修剪，清除病枝病果，平衡施肥，雨季改善排水。', medicineAdvice: '发病初期选用登记用于柑橘炭疽病的药剂，按标签轮换施用。' },
      { diseaseName: '苹果腐烂病', cropType: '苹果', category: '病害', modelLabel: 'apple_valsa_canker', symptoms: '主干和枝条皮层出现红褐色水渍状病斑，后期失水凹陷并开裂。', cause: '病菌多从伤口侵入，冻害、树势衰弱和修剪伤口管理不当易加重。', prevention: '增强树势，保护剪锯口，刮除病组织后做好工具消毒和伤口保护。', medicineAdvice: '病斑处理应由技术人员指导，使用登记药剂并严格遵守标签。' },
      { diseaseName: '苹果红蜘蛛', cropType: '苹果', category: '虫害', modelLabel: 'apple_red_mite', symptoms: '叶片出现失绿斑点，严重时叶片灰白、早落，影响果实膨大和花芽形成。', cause: '叶螨在高温干旱条件下繁殖快，果园天敌不足时易发生。', prevention: '早春清园，监测叶背虫量，保护天敌，避免长期单一用药。', medicineAdvice: '达到防治指标后选用登记用于苹果叶螨的药剂，按标签轮换使用。' },
      { diseaseName: '苹果轮纹病', cropType: '苹果', category: '病害', modelLabel: 'apple_ring_rot', symptoms: '果实出现褐色同心轮纹状病斑，贮藏期也可继续腐烂。', cause: '病菌可在枝干病斑和病果上存活，风雨传播后侵染果实。', prevention: '清理病果病枝，合理修剪，减少枝干病斑，采收时避免果实受伤。', medicineAdvice: '根据当地病害监测选用登记药剂，在关键时期按标签预防。' },
      { diseaseName: '葡萄霜霉病', cropType: '葡萄', category: '病害', modelLabel: 'grape_downy_mildew', symptoms: '叶面出现油渍状淡黄色斑，潮湿时叶背可见白色霉层，果穗也会受害。', cause: '连续降雨、田间高湿和叶面结露有利于病害发生。', prevention: '及时绑蔓整枝，保持通风透光，雨后排水，清除病叶病果。', medicineAdvice: '可选登记用于葡萄霜霉病的烯酰吗啉等药剂，按标签轮换使用。' },
      { diseaseName: '葡萄白腐病', cropType: '葡萄', category: '病害', modelLabel: 'grape_white_rot', symptoms: '果粒出现水渍状褐斑，逐渐腐烂皱缩，后期形成灰白色小粒点。', cause: '病菌在土壤和病残体中存活，高温多雨和果实受伤后易发。', prevention: '改善架面通风，及时排水，清除病果，减少机械伤和虫伤。', medicineAdvice: '发病初期按当地植保建议选用登记药剂，严格执行安全间隔期。' },
      { diseaseName: '葡萄白粉病', cropType: '葡萄', category: '病害', modelLabel: 'grape_powdery_mildew', symptoms: '叶片、嫩梢和果粒表面覆盖白色粉状霉层，果粒受害后易开裂。', cause: '田间郁闭、通风差和适宜温度有利于病菌扩展。', prevention: '整枝控梢，改善通风透光，清除病残体，避免偏施氮肥。', medicineAdvice: '选用登记用于葡萄白粉病的药剂，按标签轮换使用。' },
      { diseaseName: '桃蚜', cropType: '桃', category: '虫害', modelLabel: 'peach_aphid', symptoms: '嫩叶被害后卷曲皱缩，叶背可见蚜虫和蜜露，影响新梢生长。', cause: '蚜虫在嫩梢期快速繁殖，并可迁移危害其他作物。', prevention: '冬季清园，春季巡查嫩梢，保护天敌，及时剪除严重受害梢。', medicineAdvice: '达到防治指标后选择登记用于桃蚜的药剂，按标签执行。' },
      { diseaseName: '桃疮痂病', cropType: '桃', category: '病害', modelLabel: 'peach_scab', symptoms: '果面出现暗绿色至黑褐色小斑，后期病斑可连片并引起果皮开裂。', cause: '病菌在病枝上越冬，春季风雨传播后侵染果实。', prevention: '修剪病枝，改善通风，及时清理病果，雨季加强巡查。', medicineAdvice: '按当地植保建议在关键期选用登记用于桃疮痂病的药剂。' },
      { diseaseName: '大豆根腐病', cropType: '大豆', category: '病害', modelLabel: 'soybean_root_rot', symptoms: '根部和茎基部褐变腐烂，植株矮小、叶片黄化，严重时枯死。', cause: '土传病原在连作、低洼积水和土壤板结条件下易加重。', prevention: '轮作倒茬，深沟排水，选用健康种子，避免播种过深。', medicineAdvice: '以轮作和排水为主，种子处理和药剂选择应按登记标签执行。' },
      { diseaseName: '大豆食心虫', cropType: '大豆', category: '虫害', modelLabel: 'soybean_pod_borer', symptoms: '幼虫蛀入豆荚取食豆粒，荚内可见虫粪，影响产量和商品性。', cause: '成虫产卵后幼虫钻蛀豆荚，隐蔽危害。', prevention: '加强成虫发生期监测，适时收获，清除田间残株。', medicineAdvice: '在卵孵盛期按当地测报选用登记药剂，严格按标签施用。' },
      { diseaseName: '大豆蚜虫', cropType: '大豆', category: '虫害', modelLabel: 'soybean_aphid', symptoms: '蚜虫群集嫩叶和茎秆吸汁，叶片卷曲发黄，严重时影响结荚。', cause: '温暖少雨条件下虫口上升较快，也可能传播病毒。', prevention: '保护天敌，田间巡查嫩梢和叶背，达到指标后再防治。', medicineAdvice: '选择登记用于大豆蚜虫的药剂，按标签控制用量和安全间隔期。' },
      { diseaseName: '大豆缺铁黄化症', cropType: '大豆', category: '缺素', modelLabel: 'soybean_iron_deficiency', symptoms: '新叶叶脉间黄化而叶脉保持绿色，严重时新叶近白色并生长受阻。', cause: '偏碱土壤或根系吸收受阻导致铁有效性降低。', prevention: '改善土壤条件，避免积水，结合土壤检测选择适宜品种和补铁方式。', medicineAdvice: '确认缺铁后按肥料标签使用含铁叶面肥，避免盲目过量施用。' },
      { diseaseName: '油菜菌核病', cropType: '油菜', category: '病害', modelLabel: 'rapeseed_sclerotinia', symptoms: '茎秆出现水渍状浅褐斑，后期变白并中空，内部可见黑色菌核。', cause: '菌核在土壤中存活，花期湿度大和田间郁闭时易发生。', prevention: '轮作倒茬，合理密植，开沟排湿，及时清除病残体。', medicineAdvice: '在花期结合当地测报选用登记用于油菜菌核病的药剂，按标签施用。' },
      { diseaseName: '油菜霜霉病', cropType: '油菜', category: '病害', modelLabel: 'rapeseed_downy_mildew', symptoms: '叶面出现淡黄色不规则斑，叶背可见白色霉层，幼苗受害后生长受阻。', cause: '低温高湿和田间排水不良有利于病害扩展。', prevention: '合理密植，清沟排湿，及时清理病叶，避免偏施氮肥。', medicineAdvice: '发病初期按当地植保建议选用登记药剂，并严格遵守标签。' },
      { diseaseName: '油菜蚜虫', cropType: '油菜', category: '虫害', modelLabel: 'rapeseed_aphid', symptoms: '蚜虫群集嫩梢、花序和角果吸汁，造成卷曲、黄化并影响结实。', cause: '温暖干燥时蚜虫繁殖快，也可能传播病毒。', prevention: '保护天敌，重点巡查花序和嫩梢，达到指标后及时防治。', medicineAdvice: '可选登记用于油菜蚜虫的低风险药剂，避开授粉昆虫活跃期并按标签执行。' },
      { diseaseName: '作物缺氮症', cropType: '通用', category: '缺素', modelLabel: 'nitrogen_deficiency', symptoms: '植株生长缓慢，老叶先均匀发黄，严重时下部叶片早衰。', cause: '土壤供氮不足、根系受损或降雨淋失导致氮素吸收不足。', prevention: '结合土壤检测和作物长势配方施肥，增加有机质，避免一次性过量追肥。', medicineAdvice: '确认缺氮后少量分次追施含氮肥料，具体用量按肥料标签和农技指导执行。' },
      { diseaseName: '作物缺磷症', cropType: '通用', category: '缺素', modelLabel: 'phosphorus_deficiency', symptoms: '植株矮小，根系发育弱，叶色暗绿，部分作物叶片或茎秆出现紫红色。', cause: '土壤有效磷不足、低温或土壤酸碱度不适导致吸收受阻。', prevention: '结合测土结果施用磷肥，改善土壤条件，避免盲目加量。', medicineAdvice: '优先根据土壤检测补充磷肥，施肥量和施用方式按农技指导执行。' },
      { diseaseName: '作物缺钾症', cropType: '通用', category: '缺素', modelLabel: 'potassium_deficiency', symptoms: '老叶叶缘先发黄，随后出现焦枯斑，植株抗逆性下降。', cause: '土壤钾供应不足或根系活力差，影响钾素吸收。', prevention: '平衡施肥，补充有机质，避免长期偏施氮肥。', medicineAdvice: '确认缺钾后按测土结果补充钾肥，避免与其他肥料失衡。' },
      { diseaseName: '作物缺钙症', cropType: '通用', category: '缺素', modelLabel: 'calcium_deficiency', symptoms: '新叶畸形、叶尖坏死，果菜类可出现脐腐，根尖生长受阻。', cause: '土壤水分波动、盐分过高或根系吸收受阻导致钙运输不足。', prevention: '保持水分均匀，改善根系环境，平衡施肥。', medicineAdvice: '确认缺钙后按肥料标签补充钙肥，优先解决水分和根系问题。' },
      { diseaseName: '作物缺硼症', cropType: '通用', category: '缺素', modelLabel: 'boron_deficiency', symptoms: '生长点受阻，花而不实，部分作物根茎或果实出现开裂。', cause: '土壤有效硼不足，干旱或土壤酸碱度不适影响吸收。', prevention: '结合土壤检测少量补硼，保持适宜水分，严防过量。', medicineAdvice: '硼肥过量易产生肥害，仅在确认缺硼后按标签和农技指导小量施用。' },
      { diseaseName: '作物缺铁症', cropType: '通用', category: '缺素', modelLabel: 'iron_deficiency', symptoms: '新叶叶脉间黄化而叶脉仍绿，严重时嫩叶近白色。', cause: '偏碱土壤或根系环境不良导致铁有效性降低。', prevention: '改善土壤酸碱度和排水条件，保护根系。', medicineAdvice: '确认缺铁后按肥料标签补充含铁肥料，必要时咨询当地农技人员。' },
      { diseaseName: '苹果黑星病', cropType: '苹果', category: '病害', modelLabel: 'apple_scab', symptoms: '叶片出现橄榄褐色绒状斑，果面形成黑褐色木栓化病斑，严重时叶片畸形早落。', cause: '黑星病菌在病叶和病芽中越冬，春季低温多雨、树冠郁闭时侵染加重。', prevention: '冬季清除落叶和病梢，合理修剪改善通风，雨季前加强果园巡查。', medicineAdvice: '可选登记用于苹果黑星病的药剂，按标签和当地农技指导在关键期轮换施用。' },
      { diseaseName: '苹果白粉病', cropType: '苹果', category: '病害', modelLabel: 'apple_powdery_mildew', symptoms: '嫩叶、嫩梢和花序表面覆有白色粉层，叶片卷曲变窄，幼果受害后易形成锈斑。', cause: '白粉病菌可在病芽内越冬，春季温暖干燥、通风不良和偏施氮肥时易发。', prevention: '剪除病梢病芽，控制旺长，保持树冠通风透光，避免氮肥过量。', medicineAdvice: '发病初期选用登记用于苹果白粉病的药剂，严格按标签剂量和安全间隔期执行。' },
      { diseaseName: '苹果褐斑病', cropType: '苹果', category: '病害', modelLabel: 'apple_brown_spot', symptoms: '叶片出现褐色圆形或不规则斑，中央灰褐并可见小黑点，严重时大量早期落叶。', cause: '病菌随落叶越冬，高温多雨、树势偏弱和果园郁闭时扩展较快。', prevention: '清扫落叶集中处理，平衡施肥增强树势，修剪改善通风并降低叶面湿度。', medicineAdvice: '按当地植保建议选用登记用于苹果褐斑病或叶斑病的药剂，按标签轮换使用。' },
      { diseaseName: '香蕉黑斑病', cropType: '香蕉', category: '病害', modelLabel: 'banana_black_spot', symptoms: '叶片先出现细小褐色条斑，后扩展为黑褐色坏死斑，病重时叶片干枯影响抽蕾和果实膨大。', cause: '香蕉黑斑病菌借风雨传播，高温高湿、蕉园郁闭和排水不良时易流行。', prevention: '及时割除重病叶，合理留叶和排水，改善园内通风并减少病残体积累。', medicineAdvice: '可选登记用于香蕉叶斑类病害的药剂，按标签和农技指导交替施用。' },
      { diseaseName: '香蕉炭疽病', cropType: '香蕉', category: '病害', modelLabel: 'banana_anthracnose', symptoms: '果指表面出现褐色凹陷斑，湿度大时病斑上可见橙红色黏孢团，采后易腐烂扩展。', cause: '炭疽病菌可潜伏侵染果实，采收和运输伤口、贮运高湿会加重发病。', prevention: '减少果实机械伤，及时清除病残果，采收后保持通风降湿并规范分级包装。', medicineAdvice: '采前采后用药应选择香蕉登记药剂，并严格按标签、安全间隔期和农技指导执行。' },
      { diseaseName: '香蕉叶斑病', cropType: '香蕉', category: '病害', modelLabel: 'banana_sigatoka', symptoms: '叶面出现黄绿色小斑后转为褐色条斑，多个病斑连片会造成叶片早衰干枯。', cause: '叶斑病菌在高温多雨、露水重和蕉园通风差时反复侵染。', prevention: '合理密植，清除下部病叶，开沟排水，保持足够功能叶并降低田间湿度。', medicineAdvice: '发病初期按标签选用登记用于香蕉叶斑病的药剂，注意不同作用机制轮换。' },
      { diseaseName: '番茄灰霉病', cropType: '番茄', category: '病害', modelLabel: 'tomato_gray_mold', symptoms: '花、叶和果实出现水渍状褐斑，潮湿时病部覆盖灰色霉层，幼果常从花蒂处腐烂。', cause: '灰霉病菌在低温高湿、棚室通风差和伤口多时侵染迅速。', prevention: '加强通风降湿，及时摘除病花病果，浇水后排湿，避免植株表面长时间结露。', medicineAdvice: '可选登记用于番茄灰霉病的药剂，按标签在发病初期轮换施用。' },
      { diseaseName: '番茄叶霉病', cropType: '番茄', category: '病害', modelLabel: 'tomato_leaf_mold', symptoms: '叶面出现淡黄色不规则斑，叶背对应处产生橄榄褐色霉层，严重时叶片卷曲干枯。', cause: '叶霉病菌喜高湿环境，棚室密闭、叶面结露和种植过密时易发生。', prevention: '选用抗病品种，合理密植，通风降湿，及时摘除下部病叶。', medicineAdvice: '发病初期选用登记用于番茄叶霉病的药剂，严格按标签和农技指导使用。' },
      { diseaseName: '黄瓜炭疽病', cropType: '黄瓜', category: '病害', modelLabel: 'cucumber_anthracnose', symptoms: '叶片出现近圆形黄褐色病斑，果实病斑凹陷并可见粉红色黏质孢子堆。', cause: '炭疽病菌可随种子和病残体传播，高温高湿、连作和伤口多时易流行。', prevention: '使用健康种子，轮作换茬，及时清除病叶病果，棚内注意排湿。', medicineAdvice: '可选登记用于黄瓜炭疽病的药剂，按标签在发病初期均匀喷施并轮换用药。' },
      { diseaseName: '黄瓜细菌性角斑病', cropType: '黄瓜', category: '病害', modelLabel: 'cucumber_angular_leaf_spot', symptoms: '叶片出现受叶脉限制的水渍状多角形斑，干后易穿孔，瓜条可产生水渍状小斑。', cause: '细菌可随种子、病残体和水滴传播，低温高湿、喷灌和田间操作伤口会加重。', prevention: '选用健康种子，避免带露操作和大水喷灌，清除病残体并加强通风排湿。', medicineAdvice: '需要用药时选用登记用于黄瓜细菌性病害的药剂，按标签和农技指导施用。' },
      { diseaseName: '草莓灰霉病', cropType: '草莓', category: '病害', modelLabel: 'strawberry_gray_mold', symptoms: '花瓣、果面出现褐色软腐斑，湿度大时覆盖灰色霉层，成熟果受害后腐烂很快。', cause: '灰霉病菌在低温高湿和花果期郁闭环境中易侵染，残花和伤口可成为侵入点。', prevention: '控制棚内湿度，及时摘除残花病果，垫果或覆膜减少果实接触潮湿地面。', medicineAdvice: '花果期用药应选登记用于草莓灰霉病的药剂，按标签控制用量和安全间隔期。' },
      { diseaseName: '草莓白粉病', cropType: '草莓', category: '病害', modelLabel: 'strawberry_powdery_mildew', symptoms: '叶背和果面出现白色粉状霉层，叶缘上卷，果实受害后着色不良并影响商品性。', cause: '白粉病菌在温暖、干湿交替和通风不良的棚室中容易扩展。', prevention: '改善通风透光，控制棚内湿度和氮肥用量，及时摘除重病叶。', medicineAdvice: '发病初期选用登记用于草莓白粉病的药剂，按标签轮换施用并注意采收间隔。' },
      { diseaseName: '马铃薯晚疫病', cropType: '马铃薯', category: '病害', modelLabel: 'potato_late_blight', symptoms: '叶片出现暗绿色水渍状斑，潮湿时叶背病斑边缘有白霉，块茎可形成褐色腐烂。', cause: '致病疫霉在低温高湿、连阴雨和田间积水条件下传播迅速。', prevention: '选用健康种薯，合理轮作和培土排水，发现中心病株后及时清除并加强监测。', medicineAdvice: '按当地测报选用登记用于马铃薯晚疫病的药剂，严格按标签在关键期预防或防治。' },
      { diseaseName: '马铃薯早疫病', cropType: '马铃薯', category: '病害', modelLabel: 'potato_early_blight', symptoms: '下部老叶先出现褐色同心轮纹斑，病斑周围常黄化，严重时叶片早枯。', cause: '病菌在病残体和土壤中存活，植株衰弱、干湿交替和连作田块易发。', prevention: '轮作倒茬，清除病残体，平衡施肥保持植株健壮，避免田间长期高湿。', medicineAdvice: '发病初期选用登记用于马铃薯早疫病的药剂，按标签剂量和农技指导轮换使用。' },
    ],
  })

  // ── 农事日历 ──────────────────────────────────────
  await prisma.farmCalendar.createMany({
    data: [
      { solarTerm: '小寒', month: 1, cropType: '小麦', activity: '越冬巡田', description: '检查苗情和墒情，防止低洼田积水，冻害后根据长势分类管理。' },
      { solarTerm: '大寒', month: 1, cropType: '柑橘', activity: '清园防冻', description: '清除病枝病果，树干涂白，寒潮前做好覆盖、灌水等防冻准备。' },
      { solarTerm: '大寒', month: 1, cropType: '蔬菜', activity: '棚室保温', description: '加固棚膜，夜间覆盖保温，晴天中午适度通风，降低高湿病害风险。' },
      { solarTerm: '立春', month: 2, cropType: '水稻', activity: '育秧准备', description: '检修农具，整理苗床，准备健康种子和育秧物资。' },
      { solarTerm: '雨水', month: 2, cropType: '油菜', activity: '蕾薹期管理', description: '清沟排湿，观察菌核病和蚜虫，结合苗情合理追肥。' },
      { solarTerm: '雨水', month: 2, cropType: '柑橘', activity: '春季修剪', description: '剪除病弱枝和交叉枝，清理果园残体，为春梢生长改善通风透光。' },
      { solarTerm: '惊蛰', month: 3, cropType: '小麦', activity: '返青拔节管理', description: '根据墒情和苗情安排春灌追肥，巡查条锈病、纹枯病和蚜虫。' },
      { solarTerm: '春分', month: 3, cropType: '番茄', activity: '定植缓苗', description: '棚室定植后及时浇缓苗水，通风控湿，检查苗株长势和根系状态。' },
      { solarTerm: '春分', month: 3, cropType: '玉米', activity: '春播备耕', description: '整地保墒，准备良种和播种机具，依据当地气温和墒情适期播种。' },
      { solarTerm: '清明', month: 4, cropType: '水稻', activity: '播种育秧', description: '气温稳定后适时播种育秧，注意苗床温湿度和秧苗病害巡查。' },
      { solarTerm: '谷雨', month: 4, cropType: '玉米', activity: '春玉米播种', description: '土壤墒情适宜时抢墒播种，合理密植并关注苗期地下害虫。' },
      { solarTerm: '谷雨', month: 4, cropType: '柑橘', activity: '花期保果', description: '关注花量和树势，合理疏花疏果，做好木虱、红蜘蛛等虫情监测。' },
      { solarTerm: '立夏', month: 5, cropType: '水稻', activity: '移栽返青', description: '秧龄适宜时及时移栽，保持浅水活棵，返青后按苗情安排分蘖管理。' },
      { solarTerm: '小满', month: 5, cropType: '小麦', activity: '灌浆防病', description: '关注赤霉病、白粉病和蚜虫，雨后及时排水，保持叶片功能。' },
      { solarTerm: '小满', month: 5, cropType: '葡萄', activity: '整枝控梢', description: '绑蔓、抹芽和疏穗，改善架面通风，巡查霜霉病和白粉病。' },
      { solarTerm: '芒种', month: 6, cropType: '小麦', activity: '抢晴收获', description: '成熟后及时收割晾晒，控制入库水分，避免雨淋和霉变。' },
      { solarTerm: '夏至', month: 6, cropType: '水稻', activity: '分蘖田管', description: '合理晒田控蘖，巡查稻飞虱、螟虫和纹枯病，达到指标后防治。' },
      { solarTerm: '夏至', month: 6, cropType: '番茄', activity: '采收与水肥管理', description: '分批采收成熟果，保持水分均匀，避免脐腐和裂果。' },
      { solarTerm: '小暑', month: 7, cropType: '水稻', activity: '拔节孕穗管理', description: '根据田间长势调控水层，防范高温热害，持续监测螟虫和稻瘟病。' },
      { solarTerm: '大暑', month: 7, cropType: '蔬菜', activity: '抗旱排涝', description: '高温强降雨交替时及时灌溉和排水，减少根系受损，做好遮阴通风。' },
      { solarTerm: '大暑', month: 7, cropType: '柑橘', activity: '夏梢与虫害管理', description: '巡查木虱、红蜘蛛和溃疡病，清除病梢，保持果园排水畅通。' },
      { solarTerm: '立秋', month: 8, cropType: '水稻', activity: '抽穗扬花管理', description: '关注稻瘟病和稻曲病风险，高温天气合理灌水降温，避免断水过早。' },
      { solarTerm: '处暑', month: 8, cropType: '玉米', activity: '灌浆与防倒伏', description: '保持适宜墒情，检查穗部虫害和茎秆倒伏风险，成熟后适期收获。' },
      { solarTerm: '处暑', month: 8, cropType: '苹果', activity: '果园巡查', description: '巡查轮纹病和叶螨，清除落果病果，合理修剪保持通风。' },
      { solarTerm: '白露', month: 9, cropType: '水稻', activity: '灌浆成熟管理', description: '保持干湿交替，促进灌浆，结合天气预报安排成熟期收获。' },
      { solarTerm: '秋分', month: 9, cropType: '油菜', activity: '秋播备耕', description: '整地开沟，准备健康种子，根据当地茬口和墒情适期播种。' },
      { solarTerm: '秋分', month: 9, cropType: '葡萄', activity: '采后管理', description: '采后清理病残果，补充树体营养，保持架面通风并做好秋季修剪准备。' },
      { solarTerm: '寒露', month: 10, cropType: '小麦', activity: '秋播', description: '适墒适期播种冬小麦，控制播量，播后检查出苗和沟系。' },
      { solarTerm: '霜降', month: 10, cropType: '柑橘', activity: '采收准备', description: '根据成熟度分批采收，避免机械伤，采后及时分级和通风储运。' },
      { solarTerm: '霜降', month: 10, cropType: '蔬菜', activity: '秋冬茬管理', description: '适时移栽叶菜和设施蔬菜，关注低温高湿条件下的病害。' },
      { solarTerm: '立冬', month: 11, cropType: '小麦', activity: '苗情检查', description: '查看出苗均匀度和缺苗断垄情况，及时补苗并清沟排湿。' },
      { solarTerm: '小雪', month: 11, cropType: '柑橘', activity: '分批采收与清园', description: '成熟果分批采收，清理病果枯枝，做好冬季防冻和树势恢复。' },
      { solarTerm: '小雪', month: 11, cropType: '油菜', activity: '冬前壮苗', description: '检查苗情，清沟排湿，巡查蚜虫和霜霉病，培育壮苗越冬。' },
      { solarTerm: '大雪', month: 12, cropType: '小麦', activity: '防冻保苗', description: '寒潮前关注墒情，避免田间积水，冻后按苗情分类采取恢复措施。' },
      { solarTerm: '冬至', month: 12, cropType: '果树', activity: '冬季修剪', description: '落叶果树适度修剪，清理病枝落叶，工具消毒后再转株操作。' },
      { solarTerm: '冬至', month: 12, cropType: '通用', activity: '农资盘点与储藏', description: '检查种子、肥料和农药储藏条件，分类存放并核对标签和有效期。' },
    ],
  })

  // ── 农药信息库 ────────────────────────────────────
  await prisma.pesticideInfo.createMany({
    data: [
      { name: '吡虫啉', type: '杀虫剂', targetPest: '蚜虫、飞虱、粉虱', cropType: '水稻/蔬菜/果树', safeDosage: '剂型和含量不同，按产品标签登记作物、防治对象和用量执行。', safeInterval: '按产品标签执行', toxicity: '低毒或微毒，以标签为准' },
      { name: '啶虫脒', type: '杀虫剂', targetPest: '蚜虫、粉虱、蓟马', cropType: '蔬菜/果树', safeDosage: '按登记作物对应产品标签用量喷雾，避免随意提高浓度。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '阿维菌素', type: '杀虫剂', targetPest: '叶螨、潜叶蛾、小菜蛾', cropType: '蔬菜/果树', safeDosage: '不同作物和剂型差异较大，仅按登记标签稀释使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '螺螨酯', type: '杀虫剂', targetPest: '红蜘蛛、叶螨', cropType: '柑橘/苹果等果树', safeDosage: '按产品标签登记作物和稀释倍数均匀喷雾。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '噻虫嗪', type: '杀虫剂', targetPest: '蚜虫、飞虱、粉虱', cropType: '水稻/蔬菜/果树', safeDosage: '按标签登记作物、剂型和施用方式执行。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '氯虫苯甲酰胺', type: '杀虫剂', targetPest: '二化螟、玉米螟、钻蛀害虫', cropType: '水稻/玉米/蔬菜', safeDosage: '按登记标签在适宜虫龄和作物生育期使用。', safeInterval: '按产品标签执行', toxicity: '微毒，以标签为准' },
      { name: '甲氨基阿维菌素苯甲酸盐', type: '杀虫剂', targetPest: '鳞翅目幼虫、小菜蛾、粘虫', cropType: '蔬菜/玉米', safeDosage: '达到防治指标后按登记标签用量喷雾。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '高效氯氟氰菊酯', type: '杀虫剂', targetPest: '蚜虫、食心虫、鳞翅目幼虫', cropType: '粮食作物/蔬菜/果树', safeDosage: '仅选登记用于目标作物的产品，按标签用量执行。', safeInterval: '按产品标签执行', toxicity: '中等毒或低毒，以标签为准' },
      { name: '吡蚜酮', type: '杀虫剂', targetPest: '稻飞虱、蚜虫', cropType: '水稻/蔬菜', safeDosage: '按登记标签掌握防治适期和每亩用量。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '噻嗪酮', type: '杀虫剂', targetPest: '飞虱、介壳虫、粉虱', cropType: '水稻/果树/蔬菜', safeDosage: '对目标虫态按登记标签施用，避免超范围使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '氟啶虫酰胺', type: '杀虫剂', targetPest: '蚜虫、粉虱', cropType: '蔬菜/果树', safeDosage: '按产品标签登记作物和推荐用量喷雾。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '联苯肼酯', type: '杀虫剂', targetPest: '红蜘蛛、叶螨', cropType: '果树/蔬菜', safeDosage: '按登记标签稀释喷雾，注意与不同作用机制药剂轮换。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '苯醚甲环唑', type: '杀菌剂', targetPest: '炭疽病、白粉病、叶斑病', cropType: '蔬菜/果树', safeDosage: '按登记作物对应标签用量在发病初期使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '嘧菌酯', type: '杀菌剂', targetPest: '霜霉病、白粉病、叶斑病', cropType: '蔬菜/果树', safeDosage: '按标签登记作物和推荐用量使用，注意轮换作用机制。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '代森锰锌', type: '杀菌剂', targetPest: '早疫病、炭疽病、霜霉病', cropType: '蔬菜/果树', safeDosage: '保护性杀菌剂，按登记标签在发病前或初期均匀喷雾。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '烯酰吗啉', type: '杀菌剂', targetPest: '霜霉病、疫病', cropType: '蔬菜/葡萄', safeDosage: '按登记标签在发病初期使用，并与不同作用机制药剂轮换。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '井冈霉素', type: '杀菌剂', targetPest: '水稻纹枯病', cropType: '水稻', safeDosage: '按产品标签登记剂型、含量和每亩用量施用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '三环唑', type: '杀菌剂', targetPest: '稻瘟病', cropType: '水稻', safeDosage: '按登记标签在稻瘟病防治适期使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '戊唑醇', type: '杀菌剂', targetPest: '锈病、白粉病、赤霉病', cropType: '小麦/果树', safeDosage: '不同作物和剂型用量不同，按登记标签执行。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '丙环唑', type: '杀菌剂', targetPest: '锈病、白粉病、纹枯病', cropType: '小麦/水稻', safeDosage: '按登记标签在病害发生初期或关键预防期使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '多菌灵', type: '杀菌剂', targetPest: '部分真菌性病害', cropType: '粮食作物/果树', safeDosage: '仅在产品标签登记范围内使用，注意抗药性管理。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '春雷霉素', type: '杀菌剂', targetPest: '部分细菌性病害、稻瘟病', cropType: '水稻/蔬菜', safeDosage: '按登记标签选择适用作物、防治对象和用量。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '氢氧化铜', type: '杀菌剂', targetPest: '溃疡病、角斑病等细菌性病害', cropType: '果树/蔬菜', safeDosage: '铜制剂应按标签使用，避免高温期或敏感作物上随意混配。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '霜脲氰·锰锌', type: '杀菌剂', targetPest: '霜霉病、晚疫病', cropType: '蔬菜/葡萄', safeDosage: '按组合制剂标签登记作物、含量和用量执行。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '咪鲜胺', type: '杀菌剂', targetPest: '炭疽病、部分采后病害', cropType: '果树/蔬菜', safeDosage: '按登记标签和当地植保指导使用，严禁擅自扩大作物范围。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '噻菌铜', type: '杀菌剂', targetPest: '部分细菌性病害', cropType: '蔬菜/果树', safeDosage: '按登记标签用于对应作物和病害，注意药害风险。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '草甘膦', type: '除草剂', targetPest: '非耕地或果园定向除草', cropType: '按登记标签', safeDosage: '严格按标签定向喷施，避免药液漂移到作物绿色组织。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '草铵膦', type: '除草剂', targetPest: '杂草', cropType: '按登记标签', safeDosage: '严格按标签定向喷施，做好防漂移措施。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '烟嘧磺隆', type: '除草剂', targetPest: '玉米田一年生杂草', cropType: '玉米', safeDosage: '仅按登记标签在适宜玉米品种和生育期使用。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '二甲戊灵', type: '除草剂', targetPest: '一年生禾本科和部分阔叶杂草', cropType: '按登记标签', safeDosage: '按登记标签选择适用作物和土壤处理方式。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '精喹禾灵', type: '除草剂', targetPest: '一年生禾本科杂草', cropType: '阔叶作物，按登记标签', safeDosage: '按标签登记作物和杂草叶龄使用，避免飘移到禾本科作物。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
      { name: '乙草胺', type: '除草剂', targetPest: '一年生禾本科和部分小粒种子阔叶杂草', cropType: '按登记标签', safeDosage: '按标签选择适用作物、土壤墒情和施用方式。', safeInterval: '按产品标签执行', toxicity: '低毒，以标签为准' },
    ],
  })

  // ── 农产品行情 ────────────────────────────────────
  const priceRows = []
  const products = [
    { name: '稻谷', cat: '粮油', base: 2.8 }, { name: '小麦', cat: '粮油', base: 2.6 },
    { name: '玉米', cat: '粮油', base: 2.4 }, { name: '油菜籽', cat: '粮油', base: 6.2 },
    { name: '番茄', cat: '蔬菜', base: 3.5 }, { name: '黄瓜', cat: '蔬菜', base: 3.0 },
    { name: '辣椒', cat: '蔬菜', base: 5.8 }, { name: '茄子', cat: '蔬菜', base: 4.2 },
    { name: '白菜', cat: '蔬菜', base: 2.0 }, { name: '萝卜', cat: '蔬菜', base: 1.8 },
    { name: '柑橘', cat: '水果', base: 4.2 }, { name: '猕猴桃', cat: '水果', base: 8.5 },
    { name: '草莓', cat: '水果', base: 16.0 }, { name: '葡萄', cat: '水果', base: 10.0 },
    { name: '苹果', cat: '水果', base: 7.0 }, { name: '生猪', cat: '畜禽', base: 16.0 },
    { name: '鸡蛋', cat: '畜禽', base: 10.5 }, { name: '肉鸡', cat: '畜禽', base: 15.0 },
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
    { title: '农机报废更新补贴办理指南', level: '国家级', category: '农机补贴',
      summary: '支持符合条件的老旧农业机械报废更新，推动农机安全生产和节能减排。',
      content: '对达到报废条件并按规定交售拆解的拖拉机、联合收割机等农业机械，可按照当年度农机报废更新补贴政策申请补贴。申请人应确认机具类别、牌证和来源真实有效，将机具交由具备资质的回收拆解单位处理。补贴范围、标准和受理期限以当地农业农村部门公布的年度实施细则为准。不得以虚假机具、重复申报等方式套取资金。',
      publishOrg: '农业农村部、财政部', applyGuide: '携带身份证明、机具来源材料和回收拆解证明，按当地农机部门年度通知办理。' },
    { title: '农机社会化服务主体能力提升奖补', level: '县级', category: '农机补贴',
      summary: '支持农机合作社和社会化服务主体提升粮油生产关键环节作业能力。',
      content: '围绕耕整、播栽、植保、收获和烘干等粮油生产关键环节，鼓励农机合作社、家庭农场和社会化服务主体提升服务能力。符合条件的主体可按当地项目申报指南提交服务台账、机具清单、作业面积和安全生产制度。项目实行自愿申报、审核公示和验收兑付，具体支持环节和奖补标准以县级年度项目通知为准。',
      publishOrg: '蒲江县农业农村局', applyGuide: '向乡镇农业服务中心提交主体资质、作业台账和项目申报表。' },
    { title: '乡村振兴创业担保贷款申请指南', level: '省级', category: '金融信贷',
      summary: '为符合条件的返乡创业人员和涉农经营主体提供创业担保贷款申请指引。',
      content: '返乡创业人员、农村自主创业人员和符合条件的小微涉农主体，可向当地公共就业服务机构或经办银行咨询创业担保贷款。申请时通常需要提供身份证明、创业项目材料、经营情况和还款能力说明。贷款额度、期限、利率、担保方式和贴息政策以当地当年度公告及银行审核结果为准。申请人应根据实际经营需要合理负债，不得将贷款挪作非经营用途。',
      publishOrg: '四川省人力资源和社会保障厅', applyGuide: '先向乡镇便民服务中心或经办银行咨询资格，再按清单提交材料。' },
    { title: '新型农业经营主体融资对接指南', level: '县级', category: '金融信贷',
      summary: '帮助家庭农场、合作社准备真实经营材料并对接适配信贷产品。',
      content: '家庭农场、农民合作社等经营主体申请涉农贷款时，应如实准备营业执照或主体登记材料、土地经营证明、生产计划、销售合同、收支流水和信用情况。银行会根据经营规模、现金流、风险控制和还款来源进行综合审核。平台提供产品查询和材料清单提示，不承诺审批结果，不代替银行授信。融资前应测算还款压力并保留必要流动资金。',
      publishOrg: '蒲江县金融服务中心', applyGuide: '整理经营台账后预约经办银行，按银行要求补充材料并完成面谈。' },
    { title: '农村义务教育学生资助政策指南', level: '国家级', category: '教育',
      summary: '介绍义务教育阶段家庭经济困难学生生活补助和学校申请流程。',
      content: '义务教育阶段学生按规定免除学杂费并免费提供国家课程教科书。家庭经济困难寄宿生和符合条件的非寄宿生，可按照当地学生资助政策申请生活补助。学校应公开申请条件、材料清单、评审和公示流程，保护学生隐私。资助对象和补助标准以教育部门当年度通知为准，家长可向就读学校学生资助负责人咨询。',
      publishOrg: '教育部', applyGuide: '向就读学校提交申请表和家庭情况材料，经学校评审、公示后按规定发放。' },
    { title: '雨露计划职业教育补助申请提示', level: '省级', category: '教育',
      summary: '为符合条件的脱贫家庭和监测对象学生提供职业教育补助办理提示。',
      content: '符合当地政策条件的脱贫家庭和防止返贫监测对象家庭学生，在接受中高等职业教育期间，可咨询雨露计划等职业教育补助。申请人应核对本人学籍、家庭身份和就读情况，按乡镇通知提交材料。补助对象、学段范围、申报批次和发放标准以当地乡村振兴部门当年度公告为准，切勿相信收费代办。',
      publishOrg: '四川省农业农村厅', applyGuide: '向村委或乡镇便民服务中心咨询当年度批次，按清单提交学籍和身份材料。' },
    { title: '城乡居民基本医疗保险参保缴费指南', level: '县级', category: '医疗养老',
      summary: '说明城乡居民医保参保登记、缴费和待遇咨询的基本流程。',
      content: '城乡居民基本医疗保险通常按年度参保缴费。首次参保、信息变更或缴费异常时，可携带身份证件到乡镇便民服务中心或医保经办窗口咨询，也可使用当地公布的线上渠道办理。缴费标准、集中缴费期和待遇等待期以当地医保部门当年度公告为准。就医前应确认参保状态，住院和门诊报销范围以医保政策和定点机构结算结果为准。',
      publishOrg: '蒲江县医疗保障局', applyGuide: '先查询本人参保状态，再按医保部门公布的线上或线下渠道办理缴费。' },
    { title: '城乡居民基本养老保险办理指南', level: '县级', category: '医疗养老',
      summary: '介绍居民养老保险参保登记、缴费档次和待遇资格认证办理要点。',
      content: '城乡居民基本养老保险面向符合条件的城乡居民。参保人可根据当地规定选择缴费档次，按年度缴费；达到待遇领取条件后按规定办理领取手续。待遇领取人员应关注资格认证通知，谨防冒充工作人员的诈骗电话。缴费档次、补贴标准、补缴情形和认证方式以当地人社部门公告为准。',
      publishOrg: '蒲江县人力资源和社会保障局', applyGuide: '携带身份证件到乡镇便民服务中心咨询参保登记、缴费和待遇认证。' },
    { title: '家庭农场培育与示范创建指南', level: '省级', category: '产业奖补',
      summary: '支持管理规范、经营稳定的家庭农场提升生产经营能力。',
      content: '家庭农场应围绕适度规模经营建立生产、投入品使用、销售和财务台账。符合当地培育项目条件的家庭农场，可申报示范创建、技术培训、品牌建设或设施提升等支持。项目申报实行公开通知、自愿申请、审核公示和验收管理，具体支持方向和奖补标准以当地年度项目指南为准。申报材料应真实完整，并保留原始票据和实施记录。',
      publishOrg: '四川省农业农村厅', applyGuide: '关注县农业农村局项目通知，按要求提交主体登记、经营台账和实施方案。' },
    { title: '农产品产地冷藏保鲜设施建设申报提示', level: '县级', category: '产业奖补',
      summary: '为符合条件的涉农主体建设产地冷藏保鲜设施提供申报提示。',
      content: '围绕蔬菜、水果等鲜活农产品减损增效，符合条件的家庭农场、合作社等主体可关注产地冷藏保鲜设施建设项目。申报前应合理测算库容、用电、场地和运营成本，依法办理必要手续。支持对象、建设内容、补助方式和验收要求以农业农村部门当年度通知为准。未经审核不得将补助承诺作为投资决策依据。',
      publishOrg: '蒲江县农业农村局', applyGuide: '向乡镇农业服务中心咨询年度项目，提交场地、主体资质和建设方案。' },
    { title: '农业生产防灾救灾资金申报提示', level: '省级', category: '灾害救助',
      summary: '指导受灾农户和经营主体及时报灾、留证并关注救助政策。',
      content: '发生洪涝、干旱、低温冻害、风雹或重大病虫害后，农户应在确保人员安全的前提下及时记录受灾时间、地点、作物、生育期、面积和损失情况，并向村委或乡镇报告。涉及农业保险的，应同步联系承保机构查勘。防灾救灾资金支持范围、对象、申报流程和补助标准由当地根据灾情和上级资金安排确定，不能替代保险理赔。',
      publishOrg: '四川省农业农村厅', applyGuide: '及时向村委报灾并留存照片、地块和损失记录，按乡镇通知补充材料。' },
    { title: '受灾困难群众临时救助办理指南', level: '县级', category: '灾害救助',
      summary: '说明因灾导致基本生活困难时申请临时救助的基本路径。',
      content: '因洪涝、火灾等突发事件造成基本生活暂时困难的家庭或个人，可向乡镇人民政府、街道办事处或民政部门咨询临时救助。申请时应如实说明家庭情况、受灾经过和当前困难，并按要求提供必要材料。救助方式、金额和审核程序根据困难程度和当地规定确定。遇到紧急情况应先保障人员安全并拨打应急电话。',
      publishOrg: '蒲江县民政局', applyGuide: '向乡镇便民服务中心民政窗口说明困难情况，按清单提交申请材料。' },
  ]
  const policyByTitle = new Map()
  for (const p of policies) {
    const created = await prisma.policy.create({
      data: { ...p, regionCode: '510131', validFrom: daysAgo(60), validTo: daysLater(300), viewCount: Math.floor(Math.random() * 500) },
    })
    policyByTitle.set(created.title, created)
    // 简单切片：按句号切，存为 RAG chunk
    const sentences = created.content.split(/(?<=。)/).filter((s) => s.trim().length > 10)
    await prisma.policyChunk.createMany({
      data: sentences.map((s, i) => ({ policyId: created.id, chunkIndex: i, chunkContent: s.trim() })),
    })
  }

  await prisma.subsidyApplication.createMany({
    data: [
      { userId: farmer.id, policyId: policyByTitle.get('2026年耕地地力保护补贴实施方案').id, status: 'APPROVED', reviewRemark: '东头水田面积核验通过，待统一拨付。', materials: '["/uploads/demo/zhang-land-contract.pdf"]', createdAt: dateOf('2026-04-12') },
      { userId: bigfarmer.id, policyId: policyByTitle.get('蒲江县柑橘产业奖补办法').id, status: 'REVIEWING', reviewRemark: '已进入乡镇初审，需补充绿色防控台账。', materials: '["/uploads/demo/li-green-control.pdf"]', createdAt: dateOf('2026-05-10') },
      { userId: village.id, policyId: policyByTitle.get('高标准农田建设项目申报指南').id, status: 'SUBMITTED', reviewRemark: '松华村示范片材料已提交。', materials: '["/uploads/demo/songhua-farmland-plan.pdf"]', createdAt: dateOf('2026-03-26') },
    ],
  })

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
      { sellerId: farmer.id,    title: '张大叔松华香米 10斤装',    category: '粮油', price: 58,  unit: '袋', stock: 180, soldCount: 96, traceCode: 'TRACE-SH-2026-RICE-ZDS', regionCode: VILLAGE, description: '东头水田当季新稻，现碾现卖，米香浓郁。' },
      { sellerId: farmer.id,    title: '张大叔后山红心柑橘 10斤装', category: '水果', price: 46,  unit: '箱', stock: 130, soldCount: 54, traceCode: 'TRACE-SH-2026-CITRUS-ZDS', regionCode: VILLAGE, description: '后山橘园分批采收，皮薄汁多，甜酸平衡。' },
      { sellerId: bigfarmer.id, title: '李大姐阳光番茄 5斤装',      category: '蔬菜', price: 32,  unit: '箱', stock: 160, soldCount: 78, traceCode: 'TRACE-SH-2026-TOMATO-LGL', regionCode: VILLAGE, description: '桂兰蔬菜棚标准化种植，果形饱满，适合家庭鲜食。' },
      { sellerId: bigfarmer.id, title: '李大姐有机蔬菜礼盒',        category: '蔬菜', price: 68,  unit: '盒', stock: 60,  soldCount: 42, traceCode: 'TRACE-SH-2026-VEG-LGL', regionCode: VILLAGE, description: '当季8种蔬菜混装，田间采摘后统一分级包装。' },
      { sellerId: farmer.id,    title: '农家自晒红薯干',            category: '其他', price: 25,  unit: '袋', stock: 60,  soldCount: 21, regionCode: VILLAGE, description: '传统工艺日晒，软糯香甜。' },
      { sellerId: merchant.id,  title: '生态散养土鸡蛋（30枚）',    category: '畜禽', price: 45,  unit: '箱', stock: 80,  soldCount: 32, regionCode: VILLAGE, description: '自家散养土鸡所产，无添加，营养健康。' },
    ],
  })

  const storyProducts = await prisma.product.findMany({
    where: { traceCode: { in: ['TRACE-SH-2026-RICE-ZDS', 'TRACE-SH-2026-CITRUS-ZDS', 'TRACE-SH-2026-TOMATO-LGL', 'TRACE-SH-2026-VEG-LGL'] } },
  })
  const productByTrace = Object.fromEntries(storyProducts.map((p) => [p.traceCode, p]))

  await prisma.order.createMany({
    data: [
      { orderNo: 'FL202605180001', buyerId: merchant.id, sellerId: farmer.id, productId: productByTrace['TRACE-SH-2026-RICE-ZDS'].id, quantity: 12, totalAmount: 696, status: 'DONE', logisticsNo: 'SF2605180001', remark: '村集市首批香米订单', createdAt: dateOf('2026-05-18') },
      { orderNo: 'FL202605200002', buyerId: farmer.id, sellerId: bigfarmer.id, productId: productByTrace['TRACE-SH-2026-TOMATO-LGL'].id, quantity: 2, totalAmount: 64, status: 'PAID', logisticsNo: 'YT2605200002', remark: '张大叔为农忙午餐采购', createdAt: dateOf('2026-05-20') },
      { orderNo: 'FL202605220003', buyerId: merchant.id, sellerId: bigfarmer.id, productId: productByTrace['TRACE-SH-2026-VEG-LGL'].id, quantity: 8, totalAmount: 544, status: 'SHIPPED', logisticsNo: 'JD2605220003', remark: '县城社区团购备货', createdAt: dateOf('2026-05-22') },
    ],
  })

  await prisma.traceRecord.createMany({
    data: [
      { traceCode: 'TRACE-SH-2026-RICE-ZDS', productId: productByTrace['TRACE-SH-2026-RICE-ZDS'].id, stage: '播种', operator: '张大山', description: '东头水田完成育秧，亩用种3公斤。', recordTime: dateOf('2026-03-08') },
      { traceCode: 'TRACE-SH-2026-RICE-ZDS', productId: productByTrace['TRACE-SH-2026-RICE-ZDS'].id, stage: '田管', operator: '张大山', description: '分蘖期复查稻飞虱，按农技建议完成二次巡田。', recordTime: dateOf('2026-05-27') },
      { traceCode: 'TRACE-SH-2026-RICE-ZDS', productId: productByTrace['TRACE-SH-2026-RICE-ZDS'].id, stage: '包装', operator: '陈志远', description: '小批量碾米、称重、贴溯源码。', recordTime: dateOf('2026-05-18') },
      { traceCode: 'TRACE-SH-2026-TOMATO-LGL', productId: productByTrace['TRACE-SH-2026-TOMATO-LGL'].id, stage: '定植', operator: '李桂兰', description: '阳光番茄定植，株距45厘米。', recordTime: dateOf('2026-03-03') },
      { traceCode: 'TRACE-SH-2026-TOMATO-LGL', productId: productByTrace['TRACE-SH-2026-TOMATO-LGL'].id, stage: '分级', operator: '李桂兰', description: '按果径、色泽、硬度完成三档分级。', recordTime: dateOf('2026-05-19') },
      { traceCode: 'TRACE-SH-2026-VEG-LGL', productId: productByTrace['TRACE-SH-2026-VEG-LGL'].id, stage: '采收', operator: '李桂兰', description: '礼盒蔬菜当天采收，当天入库。', recordTime: dateOf('2026-05-22') },
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
      { title: '农田暴雨洪涝应急处置', disasterType: '防汛', category: '洪涝', content: '暴雨预警发布后应先保障人员安全，再检查沟渠、泵站和低洼田块。退水后根据作物受淹时间及时扶苗、洗苗、补苗，防止根系缺氧和病害扩散。', steps: JSON.stringify(['提前疏通排水沟渠', '低洼田块及时排涝', '人员不要冒险进入深水区', '退水后扶正洗苗并分类补救', '加强病害巡查并记录灾情']) },
      { title: '持续干旱抗旱指南', disasterType: '防旱', category: '干旱', content: '持续干旱时要优先保障作物关键生育期用水，采用滴灌、沟灌、覆盖保墒等节水措施。灌溉安排应服从当地水源调度，避免争水和深夜单人作业。', steps: JSON.stringify(['关注旱情和水源调度通知', '优先保灌关键生育期', '采用滴灌或沟灌减少浪费', '中耕和覆盖减少蒸发', '记录受旱面积和补灌情况']) },
      { title: '低温冻害防护手册', disasterType: '防冻', category: '冻害', content: '寒潮霜冻来临前，果树和设施蔬菜应提前做好覆盖、灌水、棚膜加固等准备。冻害后不要立即重剪，应先观察恢复情况，再分类处理受害枝叶。', steps: JSON.stringify(['关注低温预警提前准备', '检查棚膜并增加保温覆盖', '果园结合墒情适度灌水', '冻后先观察再修剪受害部位', '记录受害面积和作物长势']) },
      { title: '森林田间防火须知', disasterType: '防火', category: '火灾', content: '秸秆、果园枯枝和田边杂草在干燥大风天气下容易引发火情。严禁违规野外用火，发现火情立即报警并按现场指挥疏散，人员安全始终优先。', steps: JSON.stringify(['严禁野外违规用火', '清除田边可燃物', '发现火情立即报警', '不要进入浓烟和陡坡危险区域', '听从现场指挥安全撤离']) },
      { title: '冰雹来袭前后设施农业处置', disasterType: '防雹', category: '风雹', content: '收到冰雹预警后，应在保证人员安全的前提下加固棚膜、卷帘和支架，转移露天农资。冰雹结束后先排查触电、坍塌风险，再记录棚膜、植株和果实损伤。', steps: JSON.stringify(['关注短临预警', '停止高处作业并转移人员', '加固大棚和卷帘设施', '灾后排查坍塌与触电风险', '拍照留证并联系保险机构']) },
      { title: '大风天气农田与大棚防护', disasterType: '防风', category: '风灾', content: '大风天气容易造成大棚受损、高秆作物倒伏和果树折枝。预警期间应停止高处作业，固定棚膜和农机具，必要时提前采收成熟果实。', steps: JSON.stringify(['停止高处和临时搭架作业', '压紧棚膜并检查地锚', '绑扶高秆作物和幼树', '转移易被吹落的农资', '风后巡查倒伏和线路安全']) },
      { title: '高温热害田间管理提示', disasterType: '防高温', category: '高温', content: '持续高温会影响水稻扬花、蔬菜坐果和棚室作物生长。应避开正午高温作业，合理安排灌溉、遮阴和通风，并关注作业人员中暑风险。', steps: JSON.stringify(['查看高温预警和作物生育期', '避开正午安排田间劳动', '关键时期合理补水或灌水降温', '棚室加强遮阴和通风', '出现中暑症状立即转移就医']) },
      { title: '水稻重大病虫害应急防控', disasterType: '病虫害', category: '水稻', content: '发现稻飞虱、螟虫、稻瘟病等集中发生时，应先核实病虫种类和发生程度，再依据当地植保测报开展统防统治。不要在未确认防治对象时随意混配农药。', steps: JSON.stringify(['巡田确认病虫种类和面积', '向农技人员报告发生程度', '依据测报和防治指标统一处置', '严格按农药标签施用', '防治后复查并记录效果']) },
      { title: '果园重大病虫害应急处置', disasterType: '病虫害', category: '果树', content: '果园出现柑橘木虱、红蜘蛛、溃疡病或其他集中危害时，应及时隔离病株、清理病残体并联系农技人员确认。涉及检疫性病害时，应服从当地植保部门处置要求。', steps: JSON.stringify(['标记异常植株和受害区域', '拍照记录症状和发生范围', '清理病残体并做好工具消毒', '按植保指导开展统防统治', '持续复查新梢和邻近果园']) },
      { title: '暴雨后蔬菜大棚恢复指南', disasterType: '防汛', category: '设施蔬菜', content: '大棚受淹后，应先切断危险电源并确认棚体稳定，再排水、通风和清理受损植株。不要急于一次性大量施肥，根系恢复后再逐步安排水肥。', steps: JSON.stringify(['切断危险电源并检查棚体', '尽快排除棚内积水', '通风降湿清理病残株', '根系恢复后少量分次补肥', '巡查软腐和疫病风险']) },
      { title: '道路中断与农产品滞销应急安排', disasterType: '综合应急', category: '物流', content: '暴雨、冰雪或滑坡导致道路中断时，应先保障人员安全，暂停冒险运输。对蔬菜、水果等易腐产品，应及时联系村委、收购站和冷藏设施，分类储运并记录损失。', steps: JSON.stringify(['确认道路和天气预警', '暂停危险路段运输', '联系村委和物流站点协调路线', '优先处理易腐农产品', '记录滞销数量和损失情况']) },
      { title: '农业保险灾后报案与留证', disasterType: '灾后处置', category: '保险理赔', content: '灾害发生后应在保证安全的前提下及时拍摄受灾地块、作物和设施，记录时间、地点、面积和损失情况，并尽快联系承保机构报案。不得伪造或重复申报损失。', steps: JSON.stringify(['优先保证人员安全', '拍摄全景和局部受灾照片', '记录地块、作物、生育期和面积', '联系承保机构报案查勘', '保留处置记录和必要票据']) },
      { title: '雷雨天气田间作业安全提示', disasterType: '防雷', category: '雷电', content: '雷雨天气应立即停止田间喷药、灌溉检修和高处作业，远离高大树木、电杆、水面和金属设施。不要在空旷地带停留，待天气稳定后再恢复作业。', steps: JSON.stringify(['关注雷电预警', '立即停止田间和高处作业', '远离孤立高物和水面', '进入安全建筑物暂避', '雨后检查线路和设施再复工']) },
      { title: '山地滑坡泥石流避险提示', disasterType: '地质灾害', category: '滑坡泥石流', content: '连续强降雨期间，临坡临沟果园和道路要警惕滑坡、落石和泥石流。发现裂缝、异常响动或浑水突增时应立即撤离，不要冒险抢收或围观。', steps: JSON.stringify(['留意地质灾害预警', '避开临坡临沟危险区域', '发现异常立即向高处和安全地带撤离', '及时报告村委和应急部门', '未经确认不要返回危险区域']) },
      { title: '灾后饮水与环境卫生提示', disasterType: '灾后处置', category: '生活安全', content: '洪涝灾后要注意饮水和环境卫生，不饮用来源不明或被污染的水，不食用被洪水浸泡变质的食物。出现发热、腹泻等症状应及时就医。', steps: JSON.stringify(['饮用安全水或煮沸后的水', '清理环境并规范处理垃圾', '不食用变质和被污染食品', '做好个人防护避免伤口感染', '身体不适及时到医疗机构就诊']) },
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
      { title: '蔬菜病虫害绿色防控', category: '种植技术', instructor: '赵农技', durationMin: 55, certName: '蔬菜绿色防控培训证书', enrollCount: 88, content: '讲解番茄、黄瓜、辣椒等蔬菜常见病虫害识别，强调通风控湿、轮作、健康种苗和按农药标签安全用药。' },
      { title: '农产品短视频与直播销售实操', category: '电商培训', instructor: '王老师', durationMin: 70, certName: '农村电商实操证书', enrollCount: 142, content: '学习产品卖点整理、拍摄剪辑、直播排品、售后沟通和依法合规宣传，避免夸大功效和虚假承诺。' },
      { title: '返乡就业与技能培训报名指南', category: '就业服务', instructor: '就业服务专员', durationMin: 30, certName: '就业服务学习证明', enrollCount: 95, content: '介绍本地用工、外出务工、招聘信息核验、劳动合同、工资支付和技能培训报名流程。求职时不要缴纳不明费用，遇到异常及时咨询公共就业服务机构。' },
      { title: '城乡居民医保参保缴费办理', category: '医疗服务', instructor: '医保服务专员', durationMin: 25, certName: '便民服务学习证明', enrollCount: 180, content: '介绍城乡居民基本医疗保险参保登记、年度缴费、参保状态查询和就医结算咨询路径。缴费标准和集中缴费期以当地医保部门当年度通知为准。' },
      { title: '居民养老保险与待遇认证办理', category: '养老服务', instructor: '人社服务专员', durationMin: 25, certName: '便民服务学习证明', enrollCount: 156, content: '介绍城乡居民基本养老保险参保登记、年度缴费、缴费档次查询和待遇资格认证。办理时认准人社部门公开渠道，警惕冒充工作人员的诈骗电话。' },
      { title: '乡村快递寄取与农产品发货', category: '生活服务', instructor: '快递服务站', durationMin: 20, certName: '物流服务学习证明', enrollCount: 108, content: '介绍快递代收站取件、寄件、包装、运费查询和生鲜农产品发货注意事项。寄递前核对收件信息，易腐产品应选择适宜包装和时效服务。' },
      { title: '水电气与通信费用线上缴费', category: '生活服务', instructor: '便民服务专员', durationMin: 20, certName: '数字生活学习证明', enrollCount: 165, content: '介绍水费、电费、燃气费和通信费查询缴费的常见线上与线下渠道。缴费前核对户号和金额，不向陌生二维码转账，异常情况联系官方客服或便民服务中心。' },
      { title: '灾害报案与农业保险理赔基础', category: '防灾减灾', instructor: '农险服务专员', durationMin: 35, certName: '防灾减灾学习证明', enrollCount: 76, content: '讲解暴雨、冰雹、冻害等灾害发生后的人员安全、报灾、拍照留证、保险报案和材料整理。救助政策与保险理赔应分别按对应流程办理。' },
      { title: '农药标签识读与安全使用', category: '农资安全', instructor: '赵农技', durationMin: 45, certName: '农药安全使用培训证书', enrollCount: 132, content: '学习识别农药登记作物、防治对象、用量、施用方法、安全间隔期和防护要求。不得擅自扩大作物范围、提高浓度或随意混配。' },
      { title: '智能手机便民服务入门', category: '数字技能', instructor: '志愿服务队', durationMin: 30, certName: '数字生活学习证明', enrollCount: 210, content: '面向老年人讲解政务查询、医保养老咨询、快递查询、生活缴费和防诈骗常识。涉及资金操作时先核对官方渠道，必要时请家人或便民服务中心协助。' },
    ],
  })

  // ── 贷款产品 ──────────────────────────────────────
  await prisma.loanProduct.createMany({
    data: [
      { bankName: '中国农业银行', productName: '惠农e贷',     interestRate: 3.85, maxAmount: 300000, term: '1-3年', requirement: '从事农业生产经营，信用良好。', description: '线上申请、随借随还的纯信用农户贷款。' },
      { bankName: '农村信用社',   productName: '农户小额信用贷', interestRate: 4.35, maxAmount: 100000, term: '1年',   requirement: '本地农户，有稳定收入来源。', description: '免担保免抵押，支持春耕生产。' },
      { bankName: '中国邮政储蓄银行', productName: '产业振兴贷', interestRate: 4.05, maxAmount: 500000, term: '1-5年', requirement: '家庭农场、合作社等新型经营主体。', description: '支持规模化农业生产经营。' },
      { bankName: '四川乡村振兴局', productName: '脱贫人口小额信贷', interestRate: 0, maxAmount: 50000, term: '3年以内', requirement: '脱贫户及防返贫监测对象。', description: '免担保免抵押、财政全额贴息。' },
      { bankName: '中国农业银行', productName: '农担贷', interestRate: 4.1, maxAmount: 1000000, term: '1-3年', requirement: '具备真实农业经营项目，符合银行和农业融资担保机构审核要求。', description: '面向适度规模经营主体的涉农融资产品，具体利率和担保条件以审核结果为准。' },
      { bankName: '中国邮政储蓄银行', productName: '极速贷涉农版', interestRate: 4.2, maxAmount: 300000, term: '1-3年', requirement: '从事农业生产经营，信用记录良好，具备稳定还款来源。', description: '支持农户线上咨询和申请，最终额度、利率以银行授信审批为准。' },
      { bankName: '四川农商银行', productName: '蜀信e·小额农贷', interestRate: 4.15, maxAmount: 200000, term: '1-3年', requirement: '本地农户或涉农经营者，经营情况真实，信用良好。', description: '用于种植、养殖和农产品经营周转，实际条件以当地农商银行审核为准。' },
      { bankName: '四川农商银行', productName: '家庭农场经营贷', interestRate: 4.3, maxAmount: 800000, term: '1-3年', requirement: '家庭农场经营稳定，具备生产经营台账和明确还款来源。', description: '支持家庭农场扩大生产、购买农资和补充流动资金。' },
      { bankName: '中国农业银行', productName: '农机购置经营贷', interestRate: 4.25, maxAmount: 500000, term: '1-5年', requirement: '有真实农机购置或社会化服务需求，具备相应经营能力。', description: '支持符合条件的农机购置和作业服务经营，具体方案以银行审核为准。' },
      { bankName: '中国邮政储蓄银行', productName: '合作社流动资金贷', interestRate: 4.35, maxAmount: 1000000, term: '1-3年', requirement: '合作社运营规范，成员和经营台账完整，具备稳定销售渠道。', description: '满足合作社农资采购、收储和销售周转需要。' },
      { bankName: '四川农商银行', productName: '农产品收购周转贷', interestRate: 4.4, maxAmount: 800000, term: '1年以内', requirement: '有真实收购业务、订单或交易流水，具备风险控制和还款能力。', description: '用于农产品季节性收购资金周转，严禁挪作非经营用途。' },
      { bankName: '中国农业银行', productName: '设施农业提升贷', interestRate: 4.3, maxAmount: 600000, term: '1-5年', requirement: '有大棚、冷藏保鲜或节水灌溉等真实建设需求，具备经营计划。', description: '支持设施农业改造升级，额度和期限由银行根据项目审核确定。' },
      { bankName: '中国邮政储蓄银行', productName: '返乡创业贷', interestRate: 4.1, maxAmount: 300000, term: '1-3年', requirement: '返乡创业项目真实可行，符合当地创业担保贷款或银行产品条件。', description: '支持返乡人员开展农产品加工、电商和乡村服务等创业项目。' },
      { bankName: '四川农商银行', productName: '柑橘产业链贷款', interestRate: 4.2, maxAmount: 500000, term: '1-3年', requirement: '从事柑橘种植、收储或销售，具备真实经营台账和销售渠道。', description: '服务本地柑橘产业链经营周转，最终授信以银行审批为准。' },
      { bankName: '中国农业银行', productName: '乡村旅游经营贷', interestRate: 4.45, maxAmount: 500000, term: '1-5年', requirement: '乡村旅游经营主体手续合规，经营计划和还款来源清晰。', description: '用于农家乐、民宿等乡村旅游经营提升，实际方案以银行审核为准。' },
    ],
  })

  // ── 就业信息 ──────────────────────────────────────
  await prisma.jobInfo.createMany({
    data: [
      { title: '柑橘采摘临时工',     jobType: '本地用工', company: '川西果业合作社', location: '蒲江县寿安街道', salary: '150元/天', headcount: 20, requirement: '能吃苦，有采摘经验优先。', contactPhone: '13800001111', regionCode: '510131' },
      { title: '大棚蔬菜种植管理员', jobType: '本地用工', company: '绿康蔬菜合作社', location: '松华村',         salary: '4500元/月', headcount: 3,  requirement: '熟悉大棚蔬菜管理。',     contactPhone: '13800002222', regionCode: VILLAGE },
      { title: '农机操作手',         jobType: '本地用工', company: '桂兰家庭农场',   location: '蒲江县',         salary: '面议',      headcount: 2,  requirement: '持农机操作证。',         contactPhone: '13800003333', regionCode: '510131' },
      { title: '电子厂普工（成都）', jobType: '外出务工', company: '成都某电子厂',   location: '成都高新区',     salary: '5500-7000元/月', headcount: 50, requirement: '18-45岁，包吃住。',  contactPhone: '13800004444', regionCode: '510100' },
      { title: '冷链仓库分拣员',     jobType: '外出务工', company: '物流园区',       location: '成都双流',       salary: '6000元/月', headcount: 15, requirement: '能适应低温作业。',       contactPhone: '13800005555', regionCode: '510100' },
      { title: '水稻育秧与插秧季节工', jobType: '本地用工', company: '松华村农机合作社', location: '蒲江县寿安街道', salary: '160元/天', headcount: 12, requirement: '身体健康，服从田间安排，有水稻生产经验优先。', contactPhone: '13800006601', regionCode: '510131' },
      { title: '农产品包装与质检员', jobType: '本地用工', company: '蒲江优鲜农产品中心', location: '蒲江县', salary: '3800-4800元/月', headcount: 8, requirement: '工作细致，能够完成分级、称重和包装记录。', contactPhone: '13800006602', regionCode: '510131' },
      { title: '柑橘果园田管员', jobType: '本地用工', company: '川西果业合作社', location: '蒲江县寿安街道', salary: '4200-5200元/月', headcount: 4, requirement: '了解修剪、施肥和病虫害巡查，有果园经验优先。', contactPhone: '13800006603', regionCode: '510131' },
      { title: '农村电商客服', jobType: '本地用工', company: '松华村电商服务站', location: '松华村', salary: '3200-4200元/月', headcount: 3, requirement: '会使用智能手机和电脑，沟通耐心，能够处理订单和售后。', contactPhone: '13800006604', regionCode: VILLAGE },
      { title: '生鲜配送司机', jobType: '本地用工', company: '蒲江冷链配送中心', location: '蒲江县', salary: '5000-6500元/月', headcount: 5, requirement: '持有效驾驶证，熟悉本地道路，遵守冷链配送流程。', contactPhone: '13800006605', regionCode: '510131' },
      { title: '乡村旅游民宿管家', jobType: '本地用工', company: '茶山民宿', location: '蒲江县成佳镇', salary: '3800-5000元/月', headcount: 2, requirement: '服务意识强，能够接待游客并维护客房卫生。', contactPhone: '13800006606', regionCode: '510131' },
      { title: '农机维修学徒', jobType: '本地用工', company: '寿安农机服务站', location: '蒲江县寿安街道', salary: '3000-4500元/月', headcount: 2, requirement: '愿意学习农机保养和维修，遵守安全操作规范。', contactPhone: '13800006607', regionCode: '510131' },
      { title: '食品加工厂操作工（成都）', jobType: '外出务工', company: '成都农产品加工园', location: '成都新津', salary: '4800-6200元/月', headcount: 25, requirement: '按班次工作，入职前完成健康检查和安全培训。', contactPhone: '13800006608', regionCode: '510100' },
      { title: '物业绿化养护员（成都）', jobType: '外出务工', company: '成都园林服务公司', location: '成都温江', salary: '4200-5200元/月', headcount: 10, requirement: '有园艺或植保经验优先，能够完成日常绿化养护。', contactPhone: '13800006609', regionCode: '510100' },
      { title: '养老服务护理员培训后就业', jobType: '技能就业', company: '蒲江县就业服务中心', location: '蒲江县', salary: '培训后对接岗位', headcount: 30, requirement: '有意从事养老服务，报名后参加基础护理和安全培训。', contactPhone: '13800006610', regionCode: '510131' },
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
      { userId: bigfarmer.id, name: '李桂兰', talentType: '致富带头人', skills: '设施蔬菜种植、合作社经营、农产品分级', regionCode: VILLAGE, description: '带领20余户农户发展设施蔬菜和标准化种植，年产值超300万元。', contactPhone: '13800000002' },
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

  // ── 三位主角的地块与全年农事时间线 ──────────────────
  const zhangRicePlot = await prisma.landPlot.create({
    data: { userId: farmer.id, plotName: '东头水田', areaMu: 3.5, cropType: '水稻', soilType: '壤土', regionCode: VILLAGE, boundaryGeojson: '{"type":"Polygon","coordinates":[[[103.52,30.22],[103.525,30.22],[103.525,30.224],[103.52,30.224],[103.52,30.22]]]}' },
  })
  const zhangCitrusPlot = await prisma.landPlot.create({
    data: { userId: farmer.id, plotName: '后山橘园', areaMu: 5.0, cropType: '柑橘', soilType: '黄壤', regionCode: VILLAGE, boundaryGeojson: '{"type":"Polygon","coordinates":[[[103.528,30.226],[103.534,30.226],[103.534,30.231],[103.528,30.231],[103.528,30.226]]]}' },
  })
  const liTomatoPlot = await prisma.landPlot.create({
    data: { userId: bigfarmer.id, plotName: '桂兰蔬菜棚', areaMu: 12.0, cropType: '番茄', soilType: '沙壤土', regionCode: VILLAGE, boundaryGeojson: '{"type":"Polygon","coordinates":[[[103.538,30.218],[103.546,30.218],[103.546,30.225],[103.538,30.225],[103.538,30.218]]]}' },
  })
  const liRicePlot = await prisma.landPlot.create({
    data: { userId: bigfarmer.id, plotName: '桂兰示范稻田', areaMu: 18.5, cropType: '水稻', soilType: '壤土', regionCode: VILLAGE },
  })
  const villageDemoPlot = await prisma.landPlot.create({
    data: { userId: village.id, plotName: '松华高标准农田示范片', areaMu: 26.0, cropType: '水稻', soilType: '壤土', regionCode: VILLAGE },
  })

  await prisma.farmRecord.createMany({
    data: [
      { userId: farmer.id, plotId: zhangCitrusPlot.id, recordType: '修剪', cropType: '柑橘', content: '后山橘园完成冬剪，清理病弱枝并粉碎还田。', cost: 260, recordDate: dateOf('2026-01-12') },
      { userId: farmer.id, plotId: zhangRicePlot.id, recordType: '播种', cropType: '水稻', content: '东头水田育秧，亩用种3公斤，准备早稻生产。', cost: 180, recordDate: dateOf('2026-03-08') },
      { userId: farmer.id, plotId: zhangCitrusPlot.id, recordType: '施肥', cropType: '柑橘', content: '追施春梢肥，有机肥120公斤，复合肥20公斤。', cost: 420, recordDate: dateOf('2026-04-02') },
      { userId: farmer.id, plotId: zhangRicePlot.id, recordType: '插秧', cropType: '水稻', content: '完成机插秧，行距规范，田面保持浅水。', cost: 360, recordDate: dateOf('2026-04-24') },
      { userId: farmer.id, plotId: zhangRicePlot.id, recordType: '打药', cropType: '水稻', content: '拍照识别稻飞虱，按建议使用吡虫啉并记录剂量。', cost: 95, recordDate: dateOf('2026-05-20') },
      { userId: farmer.id, plotId: zhangRicePlot.id, recordType: '巡田', cropType: '水稻', content: '7天复查，虫口密度下降，继续观察田间水层。', cost: 0, recordDate: dateOf('2026-05-27') },
      { userId: farmer.id, plotId: zhangRicePlot.id, recordType: '收获', cropType: '水稻', content: '计划分批收割东头水田，优先供应村集市香米订单。', cost: 520, recordDate: dateOf('2026-09-28') },
      { userId: farmer.id, plotId: zhangCitrusPlot.id, recordType: '采收', cropType: '柑橘', content: '后山橘园红心柑橘分级采收，优先打包溯源商品。', cost: 380, recordDate: dateOf('2026-11-09') },

      { userId: bigfarmer.id, plotId: liTomatoPlot.id, recordType: '消毒', cropType: '番茄', content: '桂兰蔬菜棚完成棚内清洁和土壤消毒。', cost: 650, recordDate: dateOf('2026-02-15') },
      { userId: bigfarmer.id, plotId: liTomatoPlot.id, recordType: '定植', cropType: '番茄', content: '阳光番茄定植，株距45厘米，滴灌带同步铺设。', cost: 1280, recordDate: dateOf('2026-03-03') },
      { userId: bigfarmer.id, plotId: liTomatoPlot.id, recordType: '施肥', cropType: '番茄', content: '滴灌追施水溶肥，控制氮肥比例，促进坐果。', cost: 760, recordDate: dateOf('2026-04-10') },
      { userId: bigfarmer.id, plotId: liTomatoPlot.id, recordType: '分级', cropType: '番茄', content: 'AI质量分级后分三档包装，A档供应社区团购。', cost: 120, recordDate: dateOf('2026-05-19') },
      { userId: bigfarmer.id, plotId: liRicePlot.id, recordType: '播种', cropType: '水稻', content: '示范稻田集中育秧，统一品种、统一技术规程。', cost: 860, recordDate: dateOf('2026-03-12') },
      { userId: bigfarmer.id, plotId: liRicePlot.id, recordType: '灌溉', cropType: '水稻', content: '完成第一轮浅水灌溉，配合村级渠道调度。', cost: 210, recordDate: dateOf('2026-05-16') },
      { userId: bigfarmer.id, plotId: liTomatoPlot.id, recordType: '采收', cropType: '番茄', content: '首批番茄采收，进入乡村集市和团购渠道。', cost: 340, recordDate: dateOf('2026-06-05') },

      { userId: village.id, plotId: villageDemoPlot.id, recordType: '巡查', cropType: '水稻', content: '王村委组织高标准农田示范片春耕巡查，核对沟渠和田埂。', cost: 0, recordDate: dateOf('2026-02-28') },
      { userId: village.id, plotId: villageDemoPlot.id, recordType: '管护', cropType: '水稻', content: '组织志愿队清理排水沟，降低强降雨积水风险。', cost: 300, recordDate: dateOf('2026-04-18') },
      { userId: village.id, plotId: villageDemoPlot.id, recordType: '灾后巡田', cropType: '水稻', content: '暴雨后核查示范片积水点位，形成灾情台账。', cost: 0, recordDate: dateOf('2026-05-22') },
      { userId: village.id, plotId: villageDemoPlot.id, recordType: '统计上报', cropType: '水稻', content: '汇总松华村种植面积、预计产量和农户收入数据。', cost: 0, recordDate: dateOf('2026-09-02') },
    ],
  })

  await prisma.yieldPrediction.createMany({
    data: [
      { plotId: zhangRicePlot.id, cropType: '水稻', predictedYield: 1925, confidenceLow: 1750, confidenceHigh: 2100, predictDate: dateOf('2026-06-30') },
      { plotId: zhangCitrusPlot.id, cropType: '柑橘', predictedYield: 4800, confidenceLow: 4300, confidenceHigh: 5250, predictDate: dateOf('2026-09-15') },
      { plotId: liTomatoPlot.id, cropType: '番茄', predictedYield: 13600, confidenceLow: 12400, confidenceHigh: 14800, predictDate: dateOf('2026-06-20') },
      { plotId: villageDemoPlot.id, cropType: '水稻', predictedYield: 14300, confidenceLow: 13200, confidenceHigh: 15400, predictDate: dateOf('2026-08-25') },
    ],
  })

  await prisma.aiDetectRecord.createMany({
    data: [
      { userId: farmer.id, detectType: 'DISEASE', imageUrl: '/uploads/demo/rice-planthopper.jpg', resultLabel: 'rice_planthopper', confidence: 91.6, adviceText: '建议按低毒药剂推荐剂量喷雾，7天后复查虫口密度。', feedback: 1, createdAt: dateOf('2026-05-20') },
      { userId: farmer.id, detectType: 'DISEASE', imageUrl: '/uploads/demo/citrus-leaf.jpg', resultLabel: 'nitrogen_deficiency', confidence: 86.4, adviceText: '建议补充叶面肥并复查新梢叶色。', feedback: 1, createdAt: dateOf('2026-04-03') },
      { userId: bigfarmer.id, detectType: 'GRADE', imageUrl: '/uploads/demo/tomato-grade.jpg', resultLabel: 'A_GRADE', confidence: 93.2, adviceText: 'A档果建议进入礼盒渠道，B档进入社区团购。', feedback: 1, createdAt: dateOf('2026-05-19') },
      { userId: village.id, detectType: 'DISASTER', imageUrl: '/uploads/demo/rain-field.jpg', resultLabel: 'waterlogging_medium', confidence: 88.8, adviceText: '建议优先排涝低洼田块，并同步保险员核验。', feedback: 1, createdAt: dateOf('2026-05-22') },
    ],
  })

  // ── 灾情上报 ──────────────────────────────────────
  await prisma.disasterReport.createMany({
    data: [
      { userId: farmer.id, disasterType: '暴雨', plotId: zhangRicePlot.id, affectedArea: 1.2, estimatedLoss: 1800, description: '连续强降雨导致东头水田局部积水，秧苗倒伏。', aiLossLevel: '中', status: 'REVIEWING', regionCode: VILLAGE, createdAt: dateOf('2026-05-22') },
      { userId: bigfarmer.id, disasterType: '冰雹', plotId: liTomatoPlot.id, affectedArea: 0.8, estimatedLoss: 2600, description: '短时冰雹造成部分棚膜破损，番茄叶片受伤。', aiLossLevel: '中', status: 'PROCESSED', regionCode: VILLAGE, createdAt: dateOf('2026-04-29') },
      { userId: village.id, disasterType: '暴雨', plotId: villageDemoPlot.id, affectedArea: 2.4, estimatedLoss: 4200, description: '示范片低洼处短时积水，已组织排涝和补苗。', aiLossLevel: '中', status: 'PROCESSED', regionCode: VILLAGE, createdAt: dateOf('2026-05-22') },
    ],
  })

  const zhangDisaster = await prisma.disasterReport.findFirst({ where: { userId: farmer.id, disasterType: '暴雨' }, orderBy: { createdAt: 'desc' } })
  const liDisaster = await prisma.disasterReport.findFirst({ where: { userId: bigfarmer.id, disasterType: '冰雹' }, orderBy: { createdAt: 'desc' } })
  await prisma.insuranceClaim.createMany({
    data: [
      { userId: farmer.id, disasterReportId: zhangDisaster.id, claimType: '水稻种植险', estimatedAmount: 1500, aiAssessLevel: '中', assessDetail: '积水面积约1.2亩，建议人工复核后进入理赔流程。', status: 'ASSESSING', insurerContact: '蒲江农险服务站 李专员', createdAt: dateOf('2026-05-23') },
      { userId: bigfarmer.id, disasterReportId: liDisaster.id, claimType: '设施农业险', estimatedAmount: 2200, aiAssessLevel: '中', assessDetail: '棚膜破损和叶片损伤已拍照留档。', status: 'APPROVED', insurerContact: '蒲江农险服务站 李专员', createdAt: dateOf('2026-04-30') },
    ],
  })

  await prisma.annualReport.createMany({
    data: [
      { userId: farmer.id, year: 2026, totalIncome: 1240, totalCost: 2215, generatedByAi: true, summary: '张大叔的东头水田与后山橘园已形成水稻、柑橘两条经营线。', reportContent: '2026 年已记录农事 8 次，重点完成水稻育秧、插秧、病虫害识别处置和柑橘春季管理。平台建议继续补齐采收、销售与复查记录。', createdAt: dateOf('2026-05-27') },
      { userId: bigfarmer.id, year: 2026, totalIncome: 6080, totalCost: 4220, generatedByAi: true, summary: '李大姐的蔬菜棚已接入分级、团购和溯源销售。', reportContent: '2026 年已记录农事 7 次，番茄从定植、追肥到分级采收形成完整链条。建议把棚膜维护和分级记录继续沉淀为标准作业。', createdAt: dateOf('2026-05-27') },
    ],
  })

  await prisma.statReport.createMany({
    data: [
      { regionCode: VILLAGE, reporterId: village.id, statType: '种植面积', year: 2026, period: '第一季度', status: 'CONFIRMED', dataJson: JSON.stringify({ cropType: '水稻', areaMu: 48, yieldKg: 0, farmerCount: 18, story: '春耕面积已核验，含高标准农田示范片26亩。' }), createdAt: dateOf('2026-03-31') },
      { regionCode: VILLAGE, reporterId: village.id, statType: '产销进度', year: 2026, period: '五月', status: 'SUBMITTED', dataJson: JSON.stringify({ cropType: '蔬菜', areaMu: 12, yieldKg: 1680, orderAmount: 1304, story: '李大姐蔬菜棚首批番茄进入乡村集市和社区团购。' }), createdAt: dateOf('2026-05-25') },
      { regionCode: VILLAGE, reporterId: village.id, statType: '灾情汇总', year: 2026, period: '五月', status: 'CONFIRMED', dataJson: JSON.stringify({ cropType: '综合', areaMu: 4.4, yieldKg: 0, estimatedLoss: 8400, story: '暴雨与冰雹灾情已形成台账，保险理赔正在跟进。' }), createdAt: dateOf('2026-05-26') },
    ],
  })

  await prisma.syncLog.createMany({
    data: [
      { userId: farmer.id, tableName: 'farm_record', operation: 'INSERT', localUuid: 'story-zhang-rice-review', syncStatus: 'SUCCESS', syncedAt: dateOf('2026-05-27') },
      { userId: bigfarmer.id, tableName: 'farm_record', operation: 'INSERT', localUuid: 'story-li-tomato-grade', syncStatus: 'SUCCESS', syncedAt: dateOf('2026-05-19') },
      { userId: village.id, tableName: 'disaster_report', operation: 'INSERT', localUuid: 'story-village-rain-ledger', syncStatus: 'SUCCESS', syncedAt: dateOf('2026-05-22') },
    ],
  })

  await prisma.aiQaRecord.createMany({
    data: [
      { userId: farmer.id, scene: 'AGRI', question: '水稻叶片上有小虫，应该怎么处理？', answer: '建议先按虫口密度判断是否达标防治。若确认为稻飞虱，可选低毒药剂按推荐剂量喷雾，并在7天后复查。', modelUsed: 'FarmLink AI', referencesJson: '["稻飞虱知识库","水稻绿色防控建议"]', createdAt: dateOf('2026-05-20') },
      { userId: bigfarmer.id, scene: 'MARKET', question: '番茄怎么分级卖更合适？', answer: 'A档果适合礼盒和社区团购，B档果可走集市散卖，轻微瑕疵果建议做加工或员工福利，避免压价。', modelUsed: 'FarmLink AI', referencesJson: '["AI质量分级","乡村集市订单"]', createdAt: dateOf('2026-05-19') },
      { userId: village.id, scene: 'POLICY', question: '高标准农田项目材料还缺什么？', answer: '建议补齐地块边界、受益农户清单、管护责任人和年度建设计划，提交后进入乡镇初审。', modelUsed: 'FarmLink AI', referencesJson: '["高标准农田建设项目申报指南"]', createdAt: dateOf('2026-03-26') },
    ],
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
      { regionCode: VILLAGE, honoreeName: '李桂兰', honorType: '星级文明户', deed: '带头发展设施蔬菜和分级销售，热心公益，家庭和睦，被评为五星级文明户。', votes: 72 },
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
      { userId: farmer.id, type: '招工', title: '周末缺2个采橘帮手', content: '后山橘园柑橘成熟，本周末需要2人帮忙采摘，提供午饭和工钱。', regionCode: VILLAGE, contactPhone: '13800000001' },
      { userId: bigfarmer.id, type: '互助求助', title: '可免费提供旋耕机作业', content: '农机闲置，本村农户整地可免费帮忙，只收柴油费。', regionCode: VILLAGE, contactPhone: '13800000002' },
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
