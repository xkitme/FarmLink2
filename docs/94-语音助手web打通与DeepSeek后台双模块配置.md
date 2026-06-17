# 分段 94 — 语音助手 web 端打通 + DeepSeek 后台双模块配置 + TTS 劣化诊断

> 用户在 web 端用语音助手报「当前环境暂不支持语音输入」，并要求把 AI（语音助手 / 主问答）接 DeepSeek、且在后台「加个开关让我自己选」、key 也在面板里填。本段三件事：① 修语音助手 web 不可用；② 后端 DeepSeek 接入 + 管理台双模块配置；③ 排查 TTS 变慢（结论：sidecar 实例劣化，重启即恢复）。

## 一、目标

- 语音助手在 **Android 与 web** 都能真正起识别（之前 `initialize()` 直接 false）。
- 管理台新增「语音助手配置」页：**语音助手**与**主 AI 问答**各自独立选择模型提供方（自动 / 只 DeepSeek / 只 Ollama），DeepSeek API Key 在面板填写（存 DB、脱敏回显），系统提示词可编辑，思考模式可开关，并有连接自检。保存即时生效（移动端每次请求实时读，无需重启）。
- 定位并给出 TTS「慢 + 段间停顿长」的根因与修复路径。

## 二、背景

- 语音助手用 `speech_to_text`。web 实现只在 `window.SpeechRecognition/webkitSpeechRecognition` 都不存在时才判不支持；Android 端 `initialize()` 需要麦克风权限 + Android 11+ 的识别服务可见性声明。
- DeepSeek 此前只在 `assistant.service.js` 写了代码路径，但 `.env` 无 key、`config.deepseek.apiKey` 为空 → 每次直接抛 `deepseek-api-key-missing` 落到 Ollama，等于从未生效；主问答 `/ai/chat` 完全只走 Ollama + 规则兜底。
- 运行时配置已有 `SiteSetting` 键值表（启动广告即用它），可复用存语音助手配置。

## 三、改动

### A. 语音助手 web/Android 打通
- `app/android/app/src/main/AndroidManifest.xml`：补 `RECORD_AUDIO` 权限 + `<queries>` 增加 `android.speech.RecognitionService`（Android 11+ 包可见性，缺则 `initialize()` 返回 false）。
- **web 插件未注册根因**：增量构建复用了加 `speech_to_text` 之前的旧 `web_plugin_registrant.dart`，运行时落到默认 MethodChannel → web 上 `MissingPluginException`。修法：`flutter clean` + `flutter pub get` 强制重生成注册表（`.flutter-plugins-dependencies` 已含 `speech_to_text` web 实现）。
- `app/lib/widgets/voice_assistant_layer.dart`：把被 `onError: (_) {}` / `catch (_) {}` 吞掉的真实错误抓出来显示到状态条（`_initError`），便于一眼区分 `MissingPluginException`（旧 bundle）/ `not supported`（浏览器无 API）/ 权限类。**保留**作为长期诊断。

### B. DeepSeek 接入 + 管理台双模块配置
- 新增 `backend/src/modules/ai/services/assistant-config.service.js`：`SiteSetting` 单键 `ai_assistant_config` 存 JSON。字段：`enabled`、`assistantProvider`、`chatProvider`(均 auto/deepseek/ollama)、`systemPrompt`、`temperature`、`deepseekApiKey/BaseUrl/Model`、`deepseekThinking`。`loadAssistantConfig()`（含明文 key，服务端内部）/ `getAssistantConfigView()`（key 脱敏 `sk-xxxx••••xxxx`，回 `deepseekApiKeySet` + 默认提示词）/ `saveAssistantConfig(patch)`（仅覆盖传入字段；key 空串=保持原值、`clearKey:true` 才清）。导出 `providerPlan(provider)→{useDeepSeek,useOllama}`、`DEFAULT_SYSTEM_PROMPT`。兼容老字段 `provider`→`assistantProvider`。
- 新增 `backend/src/modules/ai/services/deepseek.service.js`：统一 DeepSeek 调用（OpenAI 兼容 `/chat/completions`）。支持 `json`(强制 JSON 输出)、`thinking`(默认 false=非思考，注入 `thinking:{type:'disabled'}`)、流式 `onDelta`(SSE 解析)。**建连阶段重试**(网络失败 / 429·5xx 退避重试 3 次、4xx 不重试)、`Connection: close` 规避 undici 复用死连接。
- `assistant.service.js`：`runAssistantTurn` 改读运行时配置——`enabled=false` 返回「已关闭」；系统提示词、温度、DeepSeek 凭证来自配置；按 `assistantProvider` 决定 DeepSeek→Ollama 调用次序；`callDeepSeek` 改用 `deepseekGenerate`（删除内联 fetch 与重复的 `timeoutSignal`）。
- 主问答接 DeepSeek：`ask.service.js`(非流式) 与 `ai.controller.js`(流式 SSE) 均按 `chatProvider` 走三档兜底 **DeepSeek → Ollama → 规则引擎**；DeepSeek 失败/未配置自动回落，已吐字时不重复回落。
- 管理端点 `admin.controller.js` + `platform.routes.js`：`GET/PUT /admin/ai-assistant/config`、`POST /admin/ai-assistant/test`(用已存配置向 DeepSeek 发最小请求自检；按 `deepseekThinking` 决定是否禁思考，content 空时回退显示 reasoning 片段)。
- 管理台 `admin/src/pages/AiAssistantPage.jsx`(新) + `App.jsx` 路由 + `AdminLayout.jsx` 菜单(AI 能力→语音助手配置)：双 provider 下拉、总开关、Key(密码框/脱敏)、模型名(提示推荐 v4-flash、弃用提醒)、思考模式开关、温度、系统提示词、保存/测试连接。

### C. TTS 劣化诊断（本段不改 TTS 代码）
- 现象：朗读慢、段间停顿长。逐层实测定位：sidecar 本身正常，**长时间运行的 sidecar 实例已劣化**——同机同刻同文本(2.69s 音频)，旧实例(:11435) 7~11s(RTF≈3.3)，当前代码新起实例(:11436, `CPUExecutionProvider`) ~1.5s(RTF≈0.5)。RTF<1 时 App 既有「分段+预取」可轻松追上、停顿消失、首声 ~1.5s。
- 结论：**重启 sidecar 即恢复**（旧实例还是 `zf_xiaobei` 旧音色，进一步佐证是早于近期改动的陈旧实例）。是否加「自动保活重启」待用户重启后确认是否复发再定。

## 四、契约

- 响应/错误码不变；`enabled=false` 与模型全失败均走 `errors.offline`(60002→HTTP 503)。
- `/ai/assistant/turn`、`/ai/chat`(流式与非流式) 行为按配置切换；主问答默认 `chatProvider=ollama`(保持历史行为)，语音助手默认 `assistantProvider=auto`。
- 新管理端点均 `requireAuth + requireRole('ADMIN')`；API Key 仅服务端持有，视图接口只回脱敏值。
- DeepSeek 模型推荐 `deepseek-v4-flash`/`deepseek-v4-pro`（`deepseek-chat`/`-reasoner` 将于 2026/07/24 弃用）；思考模式默认关（非思考快约 2 倍、短指令更稳）。

## 五、验收

- 后端：全部 `node --check` 通过；`admin.controller.js` 动态 import 链通过；管理台 `npm run build` 成功。
- 端到端(对运行中的 :8000，admin/123456)：
  - 双模块配置 GET/PUT 独立持久化、Key 脱敏回显（`sk-xxxx••••xxxx`、`deepseekApiKeySet`）✓
  - DeepSeek 连接自检 10/10 200（加重试前 5 次挂 2~3 次）✓
  - 语音助手 turn 间隔 2.5s（拟真）5/5 200，模型 `deepseek-v4-flash` 非思考 ~2s / 思考 ~14s（开关有效）✓
  - `/ai/chat` 流式+非流式回归 200（Ollama 停则规则兜底，不崩）✓
- web 端：状态条已能显示真实错误，用户实测从 `MissingPluginException`(旧 bundle) 经 `flutter clean` 重建后消除（localhost 安全上下文、Chrome 系内核才有真识别引擎）。
- ⚠️ 浏览器自动化实测仍受 Playwright 环境影响，关键路径以服务端 curl/接口实测为准。

## 六、不在范围内

- 不改 TTS 代码（仅诊断；保活重启待定）。
- 不改语音助手命令白名单 / 执行逻辑 / 移动端覆盖层交互。
- 主问答未默认切 DeepSeek（保留 Ollama，按用户选择）。
- 语音助手「模型全挂的优雅兜底」（仍硬 503）暂未做，待用户确认是否需要。

## 七、实施备注

- DeepSeek `deepseek-v4-flash`/`-pro` 为推理模型：低 `max_tokens` 会被 reasoning 吃光致 `content` 空；真实调用不限 max_tokens 故正常；关思考(`thinking:{type:'disabled'}`)是正确的提速方式（`thinking:false`/`enable_thinking` 均 400 或无效）。
- 之前误推 `deepseek-chat` 是未查文档（已弃用提示），已纠正为 v4-flash。
- TTS 测量教训：git-bash 内联 `-d "{...中文...}"` 会丢中文导致空文本 500（假象），须 `--data @file`；curl/Node fetch 对 sidecar 等速，HTTP/1.0-keepalive 不是瓶颈。
