// 随 `npm run dev` 一起拉起本地 Kokoro 中文 TTS sidecar（端口默认 11435）。
// 设计：若 tts/.venv 或模型文件缺失，则友好跳过并以 0 退出，不影响后端/管理台启动
// （后端对 TTS 不强依赖：sidecar 不在时 /ai/tts 报错，App 静默降级）。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ttsDir = join(here, '..', '..', 'tts');
const isWin = process.platform === 'win32';
const python = join(ttsDir, '.venv', isWin ? 'Scripts\\python.exe' : 'bin/python');
const model = join(ttsDir, 'kokoro-v1.0.onnx');

if (!existsSync(python) || !existsSync(model)) {
  console.log(
    '[tts] 跳过：未找到 tts/.venv 或模型文件（先按 tts/README.md 完成安装）。后端/管理台不受影响。',
  );
  process.exit(0);
}

const env = { ...process.env, TTS_PORT: process.env.TTS_PORT || '11435' };
const child = spawn(python, ['tts_server.py'], { cwd: ttsDir, env, stdio: 'inherit' });

child.on('error', (err) => {
  console.log(`[tts] 启动失败，已跳过（不影响后端）：${err.message}`);
  process.exit(0);
});
child.on('exit', (code) => process.exit(code ?? 0));

const stop = () => {
  try {
    child.kill();
  } catch {
    // 忽略
  }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
