# 分段 91 — TTS 分段流式播放（治「生成慢/超时」）+ GPU 加速评估（结论：不划算，回退 CPU）

> 用户反馈朗读「生成得好慢」，长回答还会「不可用」。定位：本地 Kokoro CPU 合成≈实时（RTF≈1），整段长回答既慢、又撞后端 90s 超时被掐断。用户要求「GPU + 流式 都做」。本段实施流式播放 + 启动暖机，并对 GPU 做了完整评估后回退（对本模型反而更慢）。

## 一、目标

- 长回答朗读：首句快速出声、连续播放、永不超时。
- 评估 GPU 能否大幅提速；不行则保持 CPU 且不留隐患。

## 二、背景 / 诊断

- 干净单请求实测：134 字 → 28.6s 合成（26.4s 音频，**RTF≈1.08**）。短句快（暖态 ~0.6s），长句≈实时。
- 旧 `tts_service.dart` 整段发 `/ai/tts`、等最多 90s、播整段 → 长回答（实测 303 字 107s）超过后端 90s 超时 → `DOMException TimeoutError` → App 弹「语音播报暂时不可用」。

## 三、改动

### 1. App 分段流式播放（`app/lib/core/tts_service.dart`，重写）

- 按中文句末标点（。！？；!?;）切句、过长句再按逗号/长度软切（与 sidecar 切分口径一致）。
- `speak()`：**首句阻塞合成 → 拿到即开播并返回**（调用方据此从「正在生成」切「点按停止」）；其余分段在后台 `_playQueue` 边播边合成（播当前段时预取下一段），尽量无缝衔接。
- 每段请求都是短句，单段 60s 超时远超所需 → **不再像整段那样超时**；某段失败返回空字节跳过，不打断整条朗读。
- 并发/打断：`_seq` 序号作废过期队列；`_segDone` Completer 由播放完成或 `stop()` 放行，`stop()`/新朗读会唤醒并退出旧队列。

### 2. sidecar 启动暖机（`tts/tts_server.py`）

- `serve_forever` 前先合成一小句，预热 onnx/jieba，使用户**第一次朗读**也快（否则首调含冷启 ~4s）。

### 3. GPU 评估与回退（`tts/tts_server.py`）

- 试装 `onnxruntime-gpu==1.26.0` + `nvidia-*-cu12`（CUDA 12.9 运行时），RTX 5060 Laptop(Blackwell)/驱动 CUDA 13.2 上 CUDA provider 可加载。
- **实测结论：对本 Kokoro 小模型 GPU 反而更慢** —— 暖态 134 字 **81.4s / RTF≈3.1**（CPU 28.6s/1.08），且 Blackwell 首次推理 kernel 编译**冷启 ~308s**。原因：模型含大量 Memcpy/ScatterND 节点，CUDA 拷贝与 kernel 启动开销盖过收益。
- **回退**：卸 onnxruntime-gpu 与 nvidia 包、重装纯 `onnxruntime==1.26.0`（释放 ~1.5GB）。`tts_server.py` 的 CUDA 选择改为**仅显式 `TTS_USE_GPU=1` 时尝试**（默认 CPU），并把实测结论写进注释，避免后人重踩。

## 四、契约

- `/ai/tts` 接口不变；App 改为按句多次调用（命中 `/ai/tts` 300/h 限流桶，长答约数句，余量充足）。
- venv 还原为纯 CPU onnxruntime；引擎/音色（zf_xiaoxiao，见分段 90）不变；纯离线不变。

## 五、验收

- `flutter analyze lib/core/tts_service.dart lib/pages/ai/ai_chat_page.dart` → `No issues found!`；`flutter build web` 成功。
- sidecar 重启日志：`providers=['CPUExecutionProvider']` + `warmup done`；短句端到端 `/ai/tts` 200 audio/wav。
- GPU 路径已实测（RTF≈3.1、冷启 308s）后回退，CPU 暖态短句 ~0.6s。
- ⚠️ 合成耗时随机器负载波动（开发机同时跑音乐/浏览器/代理等，繁忙时单句会到数秒）；流式架构对此鲁棒（首句出声后连续流）。朗读气泡浏览器实测待 Playwright 恢复后补。

## 六、不在范围内

- 不换 TTS 引擎；不改音色/接口/限流。
- 不做 GPU（已评估不划算）；保留 `TTS_USE_GPU=1` 入口供将来换 GPU 友好引擎时复用。
- CPU 线程数微调（onnxruntime intra-op）未做，留作后续可选优化。

## 七、实施备注

- GPU 包仅装在本机 venv（gitignored），代码层无 GPU 依赖；其他机器拉库按 `tts/README.md` 装纯 CPU onnxruntime 即可。
- 启用 GPU（如换引擎后）：`TTS_USE_GPU=1` + 在 venv 装 onnxruntime-gpu 及对应 nvidia-cu12 运行时。
