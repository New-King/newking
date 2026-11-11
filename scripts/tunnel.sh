#!/usr/bin/env bash
# 本机开发用的知识库隧道开关：把 127.0.0.1:5432 转发到远程 Postgres。
# 用法：
#   ./scripts/tunnel.sh            # 切换：运行中就关，没运行就开
#   ./scripts/tunnel.sh start      # 启动
#   ./scripts/tunnel.sh stop       # 关闭
#   ./scripts/tunnel.sh restart    # 重启
#   ./scripts/tunnel.sh status     # 查看状态
set -u

SSH_KEY="${NEWKING_TUNNEL_KEY:-$HOME/.ssh/newking_deploy}"
SSH_HOST="${NEWKING_TUNNEL_HOST:-111.231.13.51}"
SSH_USER="${NEWKING_TUNNEL_USER:-root}"
SSH_PORT="${NEWKING_TUNNEL_PORT:-22}"
LOCAL_PORT="${NEWKING_TUNNEL_LOCAL_PORT:-5432}"
REMOTE_HOST="${NEWKING_TUNNEL_REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${NEWKING_TUNNEL_REMOTE_PORT:-5432}"
PID_FILE="${NEWKING_TUNNEL_PID:-/tmp/newking-tunnel.pid}"
LOG_FILE="${NEWKING_TUNNEL_LOG:-/tmp/newking-tunnel.log}"

port_open() { nc -z -w 1 127.0.0.1 "$LOCAL_PORT" >/dev/null 2>&1; }

listener_pid() {
  lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1
}

is_ssh_pid() {
  [ -n "${1:-}" ] && ps -p "$1" -o comm= 2>/dev/null | grep -q 'ssh'
}

pid_alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

read_pid() { [ -f "$PID_FILE" ] && cat "$PID_FILE" 2>/dev/null; }

# 优先用 pidfile；没有 pidfile 时（比如手动开的隧道）按端口找监听进程，确认是 ssh 才认
running_pid() {
  local pid
  pid="$(read_pid)"
  if pid_alive "$pid"; then echo "$pid"; return 0; fi
  pid="$(listener_pid)"
  if is_ssh_pid "$pid"; then echo "$pid"; return 0; fi
  return 1
}

show_status() {
  local pid
  if pid="$(running_pid)"; then
    echo "隧道运行中：127.0.0.1:${LOCAL_PORT} → ${SSH_HOST}:${REMOTE_PORT}（PID ${pid}）"
    return 0
  fi
  if port_open; then
    echo "端口 ${LOCAL_PORT} 被非 ssh 进程占用（可能是本机 Postgres），隧道未运行"
  else
    echo "隧道未运行"
  fi
  return 1
}

start() {
  local pid
  if pid="$(running_pid)"; then
    echo "隧道已在运行（PID ${pid}），无需重复启动"
    return 0
  fi
  if port_open; then
    echo "启动失败：127.0.0.1:${LOCAL_PORT} 已被其他进程占用" >&2
    return 1
  fi
  if [ ! -f "$SSH_KEY" ]; then
    echo "启动失败：找不到 SSH key $SSH_KEY" >&2
    return 1
  fi

  : > "$LOG_FILE"
  echo "[$(date '+%F %T')] 启动 127.0.0.1:${LOCAL_PORT} → ${SSH_HOST}:${REMOTE_PORT}" >> "$LOG_FILE"
  nohup ssh -N \
    -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
    -i "$SSH_KEY" -p "$SSH_PORT" \
    -o BatchMode=yes \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking=accept-new \
    "${SSH_USER}@${SSH_HOST}" >> "$LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$PID_FILE"

  local i=0
  while [ "$i" -lt 40 ]; do
    if port_open; then
      echo "隧道已启动（PID ${pid}）：127.0.0.1:${LOCAL_PORT} → ${SSH_HOST}:${REMOTE_PORT}"
      return 0
    fi
    if ! pid_alive "$pid"; then break; fi
    sleep 0.25
    i=$((i + 1))
  done

  echo "启动失败，日志：$LOG_FILE" >&2
  tail -n 8 "$LOG_FILE" >&2 2>/dev/null
  pid_alive "$pid" && kill "$pid" 2>/dev/null
  rm -f "$PID_FILE"
  return 1
}

stop() {
  local pid
  if pid="$(running_pid)"; then
    kill "$pid" 2>/dev/null
    local i=0
    while pid_alive "$pid" && [ "$i" -lt 20 ]; do
      sleep 0.15
      i=$((i + 1))
    done
    pid_alive "$pid" && kill -9 "$pid" 2>/dev/null
    rm -f "$PID_FILE"
    echo "隧道已关闭（PID ${pid}）"
    return 0
  fi
  rm -f "$PID_FILE"
  echo "隧道本来就没在运行"
}

case "${1:-toggle}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) show_status ;;
  toggle)
    if running_pid >/dev/null; then stop; else start; fi
    ;;
  *)
    echo "用法：$0 [start|stop|restart|status]（不带参数 = 切换）" >&2
    exit 2
    ;;
esac
