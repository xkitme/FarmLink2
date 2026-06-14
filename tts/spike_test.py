"""Spike: 验证 kokoro-onnx 能否在本机合成中文语音。
成功则写出 test_zh.wav 并打印 PASS + 时长/采样率。"""
import sys, time, traceback

def main():
    try:
        from kokoro_onnx import Kokoro
        import soundfile as sf
    except Exception as e:
        print("IMPORT_FAIL:", e); traceback.print_exc(); return 2

    try:
        t0 = time.time()
        k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
        print(f"model loaded in {time.time()-t0:.1f}s")
        # 中文女声 zf_xiaobei；lang=zh 走中文 g2p(misaki[zh])
        text = "田园通，您好。今天天气晴朗，适合下地干活。"
        t1 = time.time()
        samples, sr = k.create(text, voice="zf_xiaobei", speed=1.0, lang="zh")
        dur = len(samples) / sr
        print(f"synth in {time.time()-t1:.1f}s  audio={dur:.2f}s  sr={sr}")
        sf.write("test_zh.wav", samples, sr)
        print("PASS: wrote test_zh.wav")
        return 0
    except Exception as e:
        print("SYNTH_FAIL:", e); traceback.print_exc(); return 3

sys.exit(main())
