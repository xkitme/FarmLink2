# Claude 跨会话交接簿

> 每个会话结束前,把"当前未提交状态 / 待办 / 坑"写到这里**最上方**(新会话在最前,带日期)。
> **新会话开工前必读本文件 + `docs/进度总览.md`。** 这是用户指定的交接入口。

---

## 2026-06-01 · 农机页重构 session

### ⚠️ 最重要:一堆改动还没 commit
当前 `main`:
- **ahead 1 未 push**:`94ae53a9` chore: .claude/settings.json 移出版本库 + gitignore(本机插件配置误提交)
- **未提交工作区改动**(等用户在 App 里验完才提交,别擅自 commit/push):
  - `app/lib/pages/machinery/machinery_page.dart`(整文件重写 + 搜索框重设计)
  - `app/lib/pages/machinery/machinery_service_page.dart`(工具墙重排)
  - `docs/进度总览.md`(加 53 行 + 当前状态)
  - `docs/53-农机共享页重构.md`(新增工作单)

### 本会话做了什么(docs/53 农机共享页重构,2 轨并行)
- **轨1 `machinery_page.dart`**:K 真搜索 + 数据驱动筛选(删了把"植保机"错写成"无人机"的 switch)/ L 地图收到 ~0.28 屏 + 「地图功能即将上线」角标 + `SliverList` 列表卡(一屏3~4张)+ 真实预约 sheet(`showDatePicker` + 天数/租金/押金预览)/ M1 发布农机入口(`POST /machinery`)
- **轨2 `machinery_service_page.dart`**:7 项工具整合成 `GridView` 工具墙,业务逻辑未动
- **搜索框重设计**(用户特别满意✅,已成输入框标准,见记忆 `feedback-input-small-radius`):圆角 999胶囊 → `R.sm`(8)+1.5px描边、去阴影、TextField 显式 `filled:false`+三border全none、灰圆 tune 钮 → 方角品牌绿「搜索」按钮
- `flutter analyze lib` 整合后全绿;后端没动(发布/预约接口本就有)

### 你待会要做啥(按顺序)
1. **用户说"有另外的问题"** —— 他会在新会话提一个**新问题**,先听他说,优先处理。
2. 用户验完农机页 → 按工作单两条中文 commit 提交(轨1/轨2 可分可合),再问要不要 push(连 94ae53a9 一起)。
3. **验收盯的脆弱点**:预约/发布 sheet 是 `Navigator.pop(context)` 后再 `toast(context,…)`,pop 后用同一 context 弹 toast 可能不显示。若 toast 没弹 → 改成 pop 前先 `final m = ScaffoldMessenger.of(context)` 捕获再用(2 行)。
4. 农机页硬刷验收:`Remove-Item app\build\web\flutter_service_worker.js` → 全编 → **无痕窗口**。验 5 点:搜"收割"能滤 / 点"植保机"chip 出植保无人机 / 地图收小+角标 / 点卡选日期预约出 toast / 发布农机刷新列表 / service 7 tile。

### 后面排队的
- **48b**(P1:G4~G9,含 G6 controller 释放、G8 首页 AI 演示风险)、**48c**(P2 清理)—— 工作单已写好未实施,建议穿插清掉再上招牌场景
- **46d** 个人资料完整编辑 + 存储管理真值 —— **还没写工作单**
- 回 **45 招牌场景**:45b → 45c → 45d → 45e → 45k(工作单都写好了,待实施)
- GitHub open issue:#6农机/#7全局/#8政策/#10乡村生活。**#6 等 docs/53 落地后再回看**(Lane A 只盖了 7 子bug 中 1 条)

---

## 长期约定 / 环境(每个会话通用)

- 根目录 `D:\dgitc_project\InkFlow`;Flutter `C:\dev\flutter\bin\flutter.bat`;Flutter 工程在 `app/`(analyze 要 `cd app`)
- 后端 :8000 / 管理台 :5173 / 移动web :5000;启动 `scripts/start-local.ps1`
- **commit 一律中文** + 结尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`;前缀 feat/fix/docs/chore 保留;**视觉/重写改动等用户点头再 commit**
- 设计系统 Agro-Modernist Tech:主绿 `AppColors.primary`(0xFF0D631B)/大地棕/麦金/背景 `background`;圆角 `R.sm=8/md=16/lg=32`;阴影 `ambientShadow`(柔棕,禁纯黑);公共件 `FarmAppBar(showBack)`/`AppCard`/`SectionTitle`/`StatusChip`。**禁** generic 渐变/半透明白浮层/脉冲光。**输入框要利落方正小圆角**。
- 导航:5 一级 tab `/home /ai /publish /messages /profile`;底栏只在精确等于这 5 路径显示;`showModalBottomSheet` 必带 `useRootNavigator:true`;tab 用 `context.go`、详情入口 `context.push`、back `canPop?pop:go(fallback)`
- 协作:Claude 出 `docs/NN-*.md` 工作单/审查;实施可派并行 agent(**按文件归属切轨,别让两个 agent 改同一文件**)或交 Codex;完成回填工作单「实施备注」+ 进度总览改 ✅

## 用户性格(重要)
- 直、急、会骂;说"review 什么"= 你光读源码没真运行 → **改完一定实地点过或叫他验**,别声称"能用"
- 给方向时通常已有结论,别问太多三选一,直接干
- 审美在线:讨厌大圆角胶囊、generic 渐变、半透明白浮层、脉冲光
- 闲聊/歌词能力要在线("dont break my heart 再次温柔"是歌词不是指令)
