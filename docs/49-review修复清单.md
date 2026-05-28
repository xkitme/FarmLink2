# 分段 49 — review 修复清单（commit 2983796d，48a P0 实施后审查）

> 5/28 对 48a P0 实施 commit `2983796d` 跑 high-effort review，共 10 项 finding。
> 拆 49a / 49b / 49c 三批，**49a top 3 是部署阻断级**（升级即全员被踢、历史对话假性丢失、删除假成功），必须先修再 push。

## 一、Findings（10 项，按严重度）

| # | 文件:line | 类别 | 摘要 | 工作单 |
|---|---|---|---|---|
| H1 | `backend/src/middleware/auth.js:25` | **部署阻断** | passwordChangedAt @default(now()) 让所有现有 token 升级即被踢 | 49a |
| H2 | `backend/src/modules/ai/ai.controller.js:235` | **部署阻断** | qaThreadRecords 严格 threadId 匹配，未迁移行 404 | 49a |
| H3 | `backend/src/modules/ai/ai.controller.js:270` | **部署阻断** | qaRemove deleteMany 对未迁移行 0 删假成功 | 49a |
| H4 | `app/lib/pages/publish/publish_page.dart:474` | 数据正确性 | 二手 / 闲置硬编码 price=0，UI 不收价格 | 49b |
| H5 | `app/lib/pages/publish/publish_page.dart:482` | UI 错位 | secondhand category 写英文 SHARE/SELL，list 渲染中英混杂 | 49b |
| H6 | `backend/scripts/migrate-thread-id.js:8` | 部署风险 | 迁移脚本无事务/重试/断点续传 | 49b |
| H7 | `backend/src/modules/ai/ai.controller.js:280` | 契约破坏 | DELETE /ai/qa/records/:id 语义改为「删整 thread」未升版 | 49b |
| H8 | `backend/src/modules/ai/ai.controller.js:192` | 性能 | qaRecords 内存分页（全表 findMany） | 49b |
| H9 | `app/lib/core/api_client.dart:84` | 健壮性 | SSE 解析无行缓冲，跨 chunk 切包导致 done 帧 threadId 丢失 | 49c |
| H10 | `backend/src/middleware/auth.js:32` | 安全细粒度 | 1s 容差 + 旧 token 无 pwdAt，同会话改密绕过撤销 | 49c |

## 二、拆批

| 批次 | 内容 | 工期 | 工作单 |
|---|---|---|---|
| **49a 阻断级** | H1 + H2 + H3 — 三项必须先修，**修完才能继续 push 远端** | 半天 | [49a-部署阻断修复.md](49a-部署阻断修复.md) |
| **49b 应修** | H4 + H5 + H6 + H7 + H8 — 5 项数据正确性 / 接口契约 / 性能 | 1 天 | [49b-数据与契约修复.md](49b-数据与契约修复.md) |
| **49c 应修** | H9 + H10 — SSE 健壮性 + 改密细粒度 | 半天 | [49c-健壮性修复.md](49c-健壮性修复.md) |

## 三、Sprint 安插

```
5/28 下午          49a 阻断级（半天，紧急）→ commit + push 远端
5/29               49b 数据/契约（5 项）+ 49c 健壮性（2 项）→ commit + push
5/30 - 6/2         S1 余量：45b 拍照闭环 + 45c 大屏 + 46d
6/3 - 6/20         按 plan 45 继续 S2/S3/S4
```

## 四、Codex 紧急动作（49a）

**5/28 下午立即做**：

1. **修 H1**：schema 改 `passwordChangedAt DateTime?`（去 default），或保留 default 但在 prisma push 之后**显式跑迁移脚本**把所有 user 的 passwordChangedAt 设为 `createdAt` 而非 now()
2. **修 H2 + H3**：在 `qaThreadRecords` 和 `qaRemove` 内对未迁移行加 OR 兼容（threadId IS NULL AND id == 目标 id）
3. **再次跑 migrate-thread-id 兜底（不依赖手动）**：把脚本逻辑内联到 ai.routes 启动钩子里，server boot 时执行一次 idempotent 迁移
4. commit + push

完成 49a 后回报，再启 49b/49c。

## 五、不在范围内（REFUTED 候选）

- `villageName` 缺失（pre-existing 不是 48a 引入）
- normalize 把 '提供帮助' 合并到 '互助求助'（边缘语义问题，灰度期可忽略）
- `_deleteCurrentThread` 用 widget.threadId vs _threadId 的 race（窗口极短）
- createThreadRecord create+update 非事务（SQLite 单进程低危）
- 新建会话首发后立即 context.go 重复 GET（短暂多 1 次请求）

## 六、关联

- 上次 review：[48-review修复清单.md](48-review修复清单.md)
- 上次实施：48a commit `2983796d`
- 协作约定：[协作约定.md](协作约定.md)
