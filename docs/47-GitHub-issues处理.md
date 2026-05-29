# 分段 47 — GitHub issues 处理（总览）

> 5/27 从 `xkitme/FarmLink` 仓库 issues 列表拉到 3 条用户反馈，全部 OPEN。
> 本段把这 3 条拆成 2 份独立工作单 + 1 条并入 46b，全部交 Codex 实施。
> 完成后在 GitHub 对应 issue 下评论 closing reference + 改 close。

## 一、Issues 清单（截至 5/27）

| # | 状态 | 标题 | 作者 | 处理 |
|---|---|---|---|---|
| 1 | OPEN | 启动后端时，命令行出现乱码 | yzk225 | [47a](47a-后端启动乱码修复.md) |
| 2 | OPEN | readme 文件缺少手动启动命令 | yzk225 | [47b](47b-README手动启动命令.md) |
| 3 | OPEN | 询问 ai 时，输入框不会自动聚焦 | xkitme | 并入 [46b](46b-AI双层重构.md) Part L · 输入框 autofocus |

## 二、根因分析

### Issue #1 启动后端乱码

- **现象**：`start.bat` 启动 Node 后端，cmd / 旧版 PowerShell 输出中文 `console.log` 出现 `锟斤拷` / `烫烫烫` 类乱码
- **根因**：Windows cmd / PowerShell 5 默认代码页是 GBK (CP936)；Node 源码 + console.log 是 UTF-8；编码不一致 → 乱码
- **修复**：
  - `start.bat` 在最顶 `chcp 65001 > nul`
  - `scripts/start-local.ps1` 同 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
  - `backend/src/server.js` 启动时强制 stdout/stderr UTF-8（Windows 上）
- **影响**：Codex 测试时启动后端，evaluator 看到中文不再乱码

### Issue #2 README 缺手动启动命令

- **现象**：README 第六节「快速开始」只给一键 `start.bat`，没分项手动命令；用户想分别启动后端 / 管理台 / Flutter 时无所适从
- **修复**：README 加「手动启动」一节，列出三端各自的命令
- **影响**：纯文档，不涉及代码

### Issue #3 AI 输入框不自动聚焦

- **现象**：进入 AI 页打字前需要先点输入框；连续问问题时回车后焦点也丢
- **根因**：现 `ai_page.dart` TextField 没设 `autofocus: true`，也没用 `FocusNode` 在 SSE 完成后 `requestFocus()`
- **修复**：在 46b 的 `AiChatPage` 输入栏加 `FocusNode` + 进入页自动聚焦 + 每次 send / SSE 完成后 `requestFocus()`
- **关联**：46b 推翻 44b 的单页 chat，所以在 46b 新页里加，不动旧 44b

## 三、工作单分配

| 编号 | 处理 issue | 工作单 | 工作量 |
|---|---|---|---|
| 47a | #1 | [47a-后端启动乱码修复.md](47a-后端启动乱码修复.md) | 0.5 小时 |
| 47b | #2 | [47b-README手动启动命令.md](47b-README手动启动命令.md) | 0.5 小时 |
| 46b ext | #3 | 在 46b 工作单内追加 Part L「输入框 autofocus」 | 已并入，无独立工作量 |

## 四、Sprint 安插

47a + 47b 均小修，可塞进 5/28 早上和 46a/b/c 并行做，**不动 Sprint 主线**。

| 日期 | 主线 | 顺手清账 |
|---|---|---|
| **5/28 上午** | 46a 设置中心 | **47a 后端乱码 + 47b README**（30 分钟扫掉） |
| 5/28 下午 - 5/30 | 46b / 46c | 46b 内加 autofocus（issue #3） |
| 5/31 - 6/3 | S1 余量 + 46d | — |

## 五、Codex 完成后的 GitHub 动作

每个 issue 关闭时在 GitHub 评论里贴：

```
已在 commit xxxxxxx 修复，详见 docs/47a-后端启动乱码修复.md。
```

然后 close issue。可以用：

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" issue close 1 --repo xkitme/FarmLink --comment "..."
```

Codex 实施时如果不方便操作 gh CLI，可以让 Claude 代关。

## 六、关联

- 总览：`docs/进度总览.md`
- 同时进行的 Sprint：[45-招牌场景与产品重构计划.md](45-招牌场景与产品重构计划.md) / [46-用户反馈批次.md](46-用户反馈批次.md)
- 协作约定：[协作约定.md](协作约定.md)
