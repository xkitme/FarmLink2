# 分段 48 — review 修复清单（commit HEAD~6..HEAD，10 项 G1~G10）

> 5/28 对 commit 6fad7c8f / a46d1387 / 19bf46bb / 01329be0 / f2013cef / 6ff3ad41
> （45a + 47a + 47b + 46a + 46b + 46c）跑 high-effort review，
> 共 10 项 finding。拆 48a / 48b / 48c 三批 Codex 落地。

## 一、Findings（10 项，按严重度）

| # | 文件:line | 类别 | 摘要 | 工作单 |
|---|---|---|---|---|
| G1 | `backend/src/modules/platform/user.controller.js:47` | 安全 critical | 改密不撤旧 JWT，所有设备旧 token 仍可用 | 48a |
| G2 | `app/lib/pages/publish/publish_page.dart:470` + 后端 | 数据正确性 | composer 6 type 全 POST `/life/help`，二手交易错放表，词表分裂 | 48a |
| G3 | `app/lib/pages/ai/ai_chat_page.dart:70` + 后端 | 回归 | 跟进对话变孤儿 record + detect 报告卡丢失 | 48a |
| G4 | `backend/src/modules/ai/ai.controller.js:173` | 隐私 | qaClearAll vs in-flight SSE race | 48b |
| G5 | `backend/src/modules/ai/ai.controller.js:165` | UX 错觉 | ADMIN qaRecords 看全平台但 clearAll 只删自己 | 48b |
| G6 | `app/lib/pages/publish/publish_page.dart:332` | 内存 | composer 3 个 TextEditingController 不 dispose | 48b |
| G7 | `app/lib/pages/profile/profile_page.dart:220` | UX 死路 | 同步卡 onTap 跳走，conflict / failed 无重试入口 | 48b |
| G8 | `app/lib/pages/home/home_page.dart:543` | 演示风险 | home → /ai 在空账号是空 EmptyView，多一次 FAB 点击 | 48b |
| G9 | `backend/src/modules/data/dashboard.controller.js:89` | 演示风险 | aiCallCount 非单调，删 qa 后 dashboard 数字回落 | 48b |
| G10 | `backend/src/server.js:5` | 维护性 | setDefaultEncoding 不解决乱码，注释误导 | 48c |

## 二、拆批

| 批次 | 内容 | 工期 | 工作单 |
|---|---|---|---|
| **48a** | G1 / G2 / G3 — 安全 + 数据正确性 + 用户感知最强回归 | 1 天 | [48a-P0修复.md](48a-P0修复.md) |
| **48b** | G4-G9 — 隐私/UX/内存/演示风险 6 项一并扫 | 1 天 | [48b-P1修复.md](48b-P1修复.md) |
| **48c** | G10 + 顺手清理 | 30 min | [48c-P2清理.md](48c-P2清理.md) |

## 三、Sprint 安插

review 完成时间 5/28 中午。修复插队节奏：

```
5/28 下午 - 5/29       48a（P0：要后端 schema 加 threadId 字段 + 词表白名单 + tokenVersion）
5/30                   48b（P1：6 项小修）
5/30 晚                48c（P2：5 分钟清理）
5/31 - 6/2             S1 余量：45b 拍照闭环 + 45c 大屏
6/3 - 6/10             S2（B1 + B2 + D2）
...
```

P0 三项必须先修，特别是 G2 + G3 涉及数据库脏数据会越攒越多。

## 四、不在范围内

- 已 verify 为 REFUTED 的低风险候选：
  - `/ai/chat/new?scene=` query 参数死代码（无调用方传，但路由能解析；不会崩，留给 D2 主页招牌画面工作单时若加快捷入口再用）
  - 负 id 约定（annual-report id 取负数与 qaRecord 路由冲突） —— 当前 if kind=='REPORT' 分支保护，不会路由错误；future-proof 留到 thread schema 重构时一并解决
  - `clearCache` 死前缀 `dashboard:` / `service:` —— 维护性问题，不影响运行
  - ShellPage `_index` startsWith 无 path 边界 anchor —— 未来风险，今天无碰撞

## 五、Codex 完成后动作

每个 finding 在对应工作单实施末尾追加「实施备注」并把 docs/进度总览改 ✅。
G1 关联到 GitHub issue 安全公告（如果用户决定提）；其余直接 commit。

## 六、关联

- 上次 review：[42-代码审查与修复清单.md](42-代码审查与修复清单.md)
- 协作约定：[协作约定.md](协作约定.md)
- 产品口径：[产品呈现口径.md](产品呈现口径.md)
