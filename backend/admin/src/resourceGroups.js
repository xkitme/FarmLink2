export const RESOURCE_GROUPS = {
  users: {
    title: '用户与角色',
    group: '平台基础',
    resources: ['user', 'notification', 'feedback'],
  },
  agri: {
    title: '农业生产数据',
    group: '农业生产',
    resources: ['landPlot', 'farmRecord', 'diseaseKnowledge', 'aiDetectRecord', 'yieldPrediction'],
  },
  market: {
    title: '流通销售数据',
    group: '流通销售',
    resources: ['marketPrice', 'product', 'order', 'traceRecord', 'buyer'],
  },
  machinery: {
    title: '农机共享数据',
    group: '农机共享',
    resources: ['machinery', 'machineryBooking', 'landTransfer'],
  },
  disaster: {
    title: '灾害应急数据',
    group: '气象灾害',
    resources: ['disasterReport', 'weatherAlert', 'emergencyGuide', 'insuranceClaim'],
  },
  policy: {
    title: '惠农政策与党建',
    group: '政策思政',
    resources: ['policy', 'partyLesson', 'villageAffair', 'honorRecord', 'trainingCourse'],
  },
  life: {
    title: '乡村生活服务',
    group: '生活服务',
    resources: ['jobInfo', 'tourismSpot', 'secondhandItem', 'helpRequest', 'envReport', 'loanProduct'],
  },
  data: {
    title: '数据管理中心',
    group: '数据管理',
    resources: ['annualReport', 'statReport', 'syncLog'],
  },
  ai: {
    title: '本地 AI 能力',
    group: 'AI 管理',
    resources: ['aiQaRecord', 'aiDetectRecord'],
  },
}
