#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

MODE=""
ENV_NAME="local"
START_FRONTEND=1
START_BACKEND=1
START_DB=1

usage() {
  cat <<'EOF'
用法：
  ./dev-up.sh [--mock|--real] [--no-frontend] [--no-backend] [--no-db]

说明：
  - 默认启动前端(5173) + 后端(8000)。
  - mock 模式：后端不连接 MongoDB，使用 mock 路由（更快）。
  - real 模式：后端连接 MongoDB，并启用 JWT 校验等真实逻辑。
  - 环境变量文件：根目录的 .env（建议先从 .env.prod.example 复制再改）。

示例：
  # 一键启动（默认 local 环境），并选择 mock 模式
  ./dev-up.sh --mock

  # 一键启动真实模式（会尝试启动 MongoDB）
  ./dev-up.sh --real

  # 只启动后端（不启动前端）
  ./dev-up.sh --mock --no-frontend
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mock)
      MODE="mock"
      shift
      ;;
    --real)
      MODE="real"
      shift
      ;;
    --no-frontend)
      START_FRONTEND=0
      shift
      ;;
    --no-backend)
      START_BACKEND=0
      shift
      ;;
    --no-db)
      START_DB=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数：$1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "请选择启动模式：1) mock  2) real" >&2
  read -r choice
  if [[ "$choice" == "1" ]]; then
    MODE="mock"
  elif [[ "$choice" == "2" ]]; then
    MODE="real"
  else
    echo "输入无效：$choice" >&2
    exit 1
  fi
fi

ENV_FILE="$ROOT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到环境文件：$ENV_FILE" >&2
  echo "请先复制模板：cp .env.prod.example .env" >&2
  exit 1
fi

load_env() {
  local file="$1"
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

ensure_backend_venv() {
  local venv_dir="$ROOT_DIR/backend/.venv"
  if [[ ! -x "$venv_dir/bin/python" ]]; then
    echo "[后端] 未检测到 venv，开始创建：$venv_dir" >&2
    python3 -m venv "$venv_dir"
  fi

  echo "[后端] 安装/更新依赖（requirements.txt）" >&2
  # 说明：macOS/Homebrew Python 受 PEP668 影响，不能直接 pip install 到系统环境。
  # 因此统一使用 venv。
  "$venv_dir/bin/python" -m pip install -U pip >/dev/null
  "$venv_dir/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt" >/dev/null
}

check_vite_proxy() {
  local vite_cfg="$ROOT_DIR/frontend/vite.config.js"
  if [[ -f "$vite_cfg" ]]; then
    if ! grep -q "target: 'http://127.0.0.1:8000'" "$vite_cfg"; then
      echo "[前端] 警告：未检测到 Vite 代理指向 8000，请确认 $vite_cfg" >&2
    fi
  fi
}

ensure_frontend_deps() {
  if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
    echo "[前端] 首次安装依赖（npm install）" >&2
    (cd "$ROOT_DIR/frontend" && npm install)
  fi
}

ensure_db() {
  if [[ "$START_DB" -ne 1 ]]; then
    return 0
  fi
  local mongo_uri="${MONGO_URI:-mongodb://127.0.0.1:27017/studyflow}"
  echo "[数据库] 检查宿主机 MongoDB 是否就绪：$mongo_uri" >&2
  python3 - <<'PY'
import socket
import time
from urllib.parse import urlparse

import os

uri = os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/studyflow')
p = urlparse(uri)
host = p.hostname or '127.0.0.1'
port = int(p.port or 27017)

deadline = time.time() + 30
last = None
while time.time() < deadline:
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect((host, port))
        s.close()
        print('MongoDB 端口已就绪')
        raise SystemExit(0)
    except Exception as e:
        last = e
        try:
            s.close()
        except Exception:
            pass
        time.sleep(1)

print(f'MongoDB 未在 30s 内就绪：{last}')
raise SystemExit(0)
PY
  local ok=$?
  if [[ "$ok" -ne 0 ]]; then
    echo "[数据库] 未检测到本地 MongoDB（27017）。请先在宿主机启动 MongoDB：" >&2
    echo "  brew services start mongodb-community" >&2
    echo "[数据库] 启动后请重试：./dev-up.sh --real" >&2
    exit 1
  fi
}

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "" >&2
  echo "正在停止联调服务..." >&2
  if [[ -n "$FRONTEND_PID" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

load_env "$ENV_FILE"

if [[ "$MODE" == "mock" ]]; then
  export MOCK_MODE=true
else
  export MOCK_MODE=false
fi

echo "" >&2
echo "===== StudyFlow 联调启动 =====" >&2
echo "模式：$MODE" >&2
echo "环境文件：$ENV_FILE" >&2
echo "后端：http://127.0.0.1:8000" >&2
echo "前端：http://localhost:5173" >&2
echo "==============================" >&2
echo "" >&2

check_vite_proxy

if [[ "$MODE" == "real" ]]; then
  ensure_db
fi

if [[ "$START_BACKEND" -eq 1 ]]; then
  ensure_backend_venv
  echo "[后端] 启动 FastAPI（uvicorn, reload）" >&2
  (
    cd "$ROOT_DIR/backend"
    source .venv/bin/activate # 激活本地虚拟环境
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload # 启动后端服务
  ) &
  BACKEND_PID=$!
fi

if [[ "$START_FRONTEND" -eq 1 ]]; then
  ensure_frontend_deps
  echo "[前端] 启动 Vite Dev Server" >&2
  (
    cd "$ROOT_DIR/frontend"
    npm run dev
  ) &
  FRONTEND_PID=$!
fi

echo "" >&2
echo "服务已启动。按 Ctrl+C 停止。" >&2

wait
