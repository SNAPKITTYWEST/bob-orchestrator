#!/bin/bash
# SEIT Granite Code 8B — vLLM Server (Linux / WSL2 + CUDA)
# RTX 3080 10GB: 4-bit quant keeps model to ~5GB VRAM
# Usage: bash start.sh

set -e
MODEL="ibm-granite/granite-code-8b-instruct"
PORT=8000

echo ""
echo "  SEIT SOVEREIGN STACK — GRANITE CODE ENGINE"
echo "  Watson lineage. SnapKitty guardrails."
echo "  Model:  $MODEL"
echo "  Port:   $PORT"
echo "  VRAM:   4-bit quantized for RTX 3080"
echo ""

python3 -c "import vllm" 2>/dev/null || pip install vllm bitsandbytes
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || true

echo "  Starting on 0.0.0.0:$PORT ..."

python3 -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --port $PORT \
  --host 0.0.0.0 \
  --dtype float16 \
  --quantization bitsandbytes \
  --load-format bitsandbytes \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.88 \
  --trust-remote-code \
  --served-model-name granite-code
