const LEGAL_TOPICS = [
  {
    keys: ['土地', '承包', '流转', '耕地', '宅基地'],
    advice: '土地承包经营权受法律保护，土地流转建议签订书面合同，明确面积、期限、价款、用途和违约责任，并向村集体备案。发生纠纷时，可先由村调解委员会调解，再申请土地承包仲裁或依法起诉。',
  },
  {
    keys: ['工资', '欠薪', '劳务', '打工', '务工', '工钱'],
    advice: '被拖欠工资时，应保存考勤、聊天记录、欠条、转账记录等证据，先协商，协商不成可向劳动保障监察机构投诉或申请劳动仲裁。',
  },
  {
    keys: ['农资', '假种子', '假化肥', '假农药', '合同', '买卖'],
    advice: '购买农资要保留发票、包装、批号和样品。怀疑假冒伪劣时，可向农业执法或市场监管部门投诉，并依法主张损失赔偿。',
  },
  {
    keys: ['征地', '征收', '补偿', '拆迁'],
    advice: '土地征收应依法公告并给予公平合理补偿，包括土地补偿费、安置补助费、地上附着物和青苗补偿费。对补偿有异议，可申请行政复议或提起行政诉讼。',
  },
]

function sourceLines(references) {
  if (!references.length) return ''
  return references.map((r, i) => `${i + 1}. ${r.title}：${r.content}`).join('\n')
}

export function systemPrompt(scene) {
  const common = '你是数字乡村助农平台的智能助手。回答要通俗、稳妥、可执行；不知道时说明依据不足，不编造政策编号、药剂剂量或法律结论。'
  const map = {
    POLICY: `${common} 你熟悉惠农政策、补贴申请和基层政务。回答时优先引用给定政策片段，并提醒以当地农业农村部门最终口径为准。`,
    AGRI: `${common} 你熟悉作物种植、病虫害防治、农药安全和农事管理。涉及用药时提醒按标签、登记作物和安全间隔期执行。`,
    LEGAL: `${common} 你提供农村常见法律问题的方向性建议，不替代律师意见。回答时提醒保存证据并咨询当地司法所或 12348。`,
    DISASTER: `${common} 你熟悉农业灾害应急。回答时优先给出人身安全、田间处置、灾情上报和保险理赔步骤。`,
    LIFE: `${common} 你熟悉乡村生活服务、就业、贷款、培训、养老和便民事项。回答要简洁可落地。`,
    EDU: `${common} 你是留守儿童学习辅导助手。只给思路和步骤，避免直接替孩子完成全部作业。`,
  }
  return map[String(scene || '').toUpperCase()] || common
}

export function buildPrompt({ scene, question, references }) {
  return [
    '请根据下面的平台知识库片段回答农户问题。',
    '如果片段不足以回答，请基于通用农业服务常识给出保守建议，并说明需要线下核实。',
    '',
    '---平台知识库片段---',
    sourceLines(references) || '暂无直接片段',
    '',
    '---农户问题---',
    question,
    '',
    '请输出：直接回答、办理/处理步骤、注意事项、引用来源。',
  ].join('\n')
}

export function fallbackAnswer({ scene, question, references }) {
  const normalized = String(scene || 'GENERAL').toUpperCase()
  if (normalized === 'LEGAL') {
    const hit = LEGAL_TOPICS.find((topic) => topic.keys.some((key) => question.includes(key)))
    return [
      hit ? hit.advice : '这个问题需要结合具体材料判断。建议先把合同、票据、聊天记录、照片等证据整理好，再咨询当地司法所或专业律师。',
      '可拨打 12348 公共法律服务热线，或到乡镇司法所申请法律援助。',
      references.length ? `\n参考资料：\n${sourceLines(references)}` : '',
    ].filter(Boolean).join('\n')
  }

  if (references.length) {
    const intro = {
      POLICY: '根据惠农政策库，先为你整理这些要点：',
      AGRI: '根据农技知识库，建议这样处理：',
      DISASTER: '根据应急预案，建议按这些步骤处理：',
      LIFE: '根据乡村服务信息，整理如下：',
      EDU: '可以按这个思路来理解：',
      GENERAL: '根据平台知识库，整理如下：',
    }[normalized] || '根据平台知识库，整理如下：'
    return `${intro}\n${sourceLines(references)}\n\n建议：先按上述要点核对自身情况；涉及补贴、理赔、法律或用药的事项，请再向村委、农技员或主管部门确认。`
  }

  const generic = {
    POLICY: '当前未检索到直接政策条款。建议换一个更具体的问法，例如补贴名称、作物类型、所在地区；也可以向村委或乡镇农业农村部门确认。',
    AGRI: '当前未检索到直接农技条目。建议补充作物、症状、发生时间、田间照片和近期施肥用药情况，便于进一步判断。',
    DISASTER: '当前未检索到对应应急预案。建议优先保障人身安全，拍照留证，联系村委或乡镇农业服务站，并保留保险理赔材料。',
    LIFE: '当前未检索到直接服务信息。建议补充所在村镇、服务类型和联系方式，便于匹配乡村服务资源。',
  }[normalized] || '当前未检索到直接资料。可以换个更具体的说法，我会继续帮你查找。'
  return generic
}
