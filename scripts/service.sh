#!/usr/bin/env bash
# LockPass 生产服务管理：start / stop / restart / status
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${LOG_FILE:-$ROOT/app.log}"
PID_FILE="${PID_FILE:-$ROOT/.service.pid}"
NPM_SCRIPT="${NPM_SCRIPT:-start}"
STOP_WAIT_SECS="${STOP_WAIT_SECS:-5}"

cd "$ROOT"

usage() {
  cat <<EOF
用法: $(basename "$0") <start|stop|restart|status>

  start    先 npm run build，再后台启动（nohup，日志写入 app.log）
  stop     停止本项目相关的全部进程（npm / sh / next-server）
  restart  先 stop，再 build 并 start
  status   查看运行状态与 PID

环境变量:
  LOG_FILE       日志路径（默认: 项目根目录/app.log）
  PID_FILE       PID 文件（默认: 项目根目录/.service.pid）
  NPM_SCRIPT     npm script 名（默认: start；可选 start:text / start:db）
  PORT           监听端口（默认 3000）
  STOP_WAIT_SECS 停止等待秒数（默认 5）
EOF
}

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_comm() {
  tr -d '\0' <"/proc/$1/comm" 2>/dev/null || true
}

read_cmdline() {
  tr '\0' ' ' <"/proc/$1/cmdline" 2>/dev/null || true
}

# 判断是否为本项目的服务相关进程（需已确认 cwd == ROOT）
is_related_process() {
  local pid="$1"
  local comm args

  [[ "$pid" == "$$" || "$pid" == "$PPID" ]] && return 1

  comm="$(read_comm "$pid")"
  args="$(read_cmdline "$pid")"
  [[ -z "$args" ]] && return 1

  # 排除管理脚本自身、以及命令行里碰巧提到相关关键字的排查命令
  [[ "$args" == *"/scripts/service.sh"* || "$args" == *"scripts/service.sh"* ]] && return 1
  [[ "$args" == *"grep "* || "$args" == *"pgrep "* ]] && return 1

  # 真正的 Next 生产服务进程
  if [[ "$comm" == next-server* || "$args" == *"next-server"* ]]; then
    return 0
  fi

  # npm 拉起的 shell 包装：sh -c 'STORAGE_TYPE=... next start'
  if [[ "$comm" == "sh" || "$comm" == "bash" ]] && [[ "$args" == *"next start"* ]]; then
    return 0
  fi

  # npm run start / start:text / start:db
  if [[ "$comm" == "npm" ]] && [[ "$args" == *"run"* ]] && [[ "$args" == *"start"* ]]; then
    return 0
  fi

  return 1
}

# 收集 cwd 为本项目目录的相关进程（避免误杀同机其他 Next 应用）
collect_related_pids() {
  local pid cwd
  local -a pids=()

  for pid in $(ps -eo pid=); do
    pid="${pid// /}"
    [[ -z "$pid" ]] && continue
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    [[ "$cwd" == "$ROOT" ]] || continue
    if is_related_process "$pid"; then
      pids+=("$pid")
    fi
  done

  printf '%s\n' "${pids[@]:-}" | awk 'NF && !seen[$0]++'
}

print_status_lines() {
  local pid cmd
  local found=0

  while read -r pid; do
    [[ -z "$pid" ]] && continue
    found=1
    cmd="$(read_cmdline "$pid")"
    echo "  PID $pid  $cmd"
  done < <(collect_related_pids)

  if [[ "$found" -eq 0 ]]; then
    echo "  (未运行)"
    return 1
  fi
  return 0
}

is_running() {
  collect_related_pids | grep -q .
}

kill_pids() {
  local sig="$1"
  shift
  local pid
  for pid in "$@"; do
    if is_pid_alive "$pid"; then
      kill "-$sig" "$pid" 2>/dev/null || true
    fi
  done
}

cmd_status() {
  echo "LockPass @ $ROOT"
  if print_status_lines; then
    echo "日志: $LOG_FILE"
    return 0
  fi
  return 1
}

cmd_stop() {
  local -a pids=()
  local pid pgid
  local -a remaining=()

  mapfile -t pids < <(collect_related_pids)

  if [[ -f "$PID_FILE" ]]; then
    pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
    if is_pid_alive "$pid"; then
      pids+=("$pid")
      # setsid 启动时按进程组一并清理
      pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]' || true)"
      if [[ -n "$pgid" && "$pgid" != "0" && "$pgid" != "1" ]]; then
        kill -TERM -- "-$pgid" 2>/dev/null || true
      fi
    fi
  fi

  mapfile -t pids < <(printf '%s\n' "${pids[@]:-}" | awk 'NF && !seen[$0]++')

  if [[ "${#pids[@]}" -eq 0 ]]; then
    echo "服务未在运行"
    rm -f "$PID_FILE"
    return 0
  fi

  echo "停止进程: ${pids[*]}"
  kill_pids TERM "${pids[@]}"

  local i=0
  while [[ "$i" -lt "$STOP_WAIT_SECS" ]]; do
    mapfile -t remaining < <(collect_related_pids)
    [[ "${#remaining[@]}" -eq 0 ]] && break
    sleep 1
    i=$((i + 1))
  done

  mapfile -t remaining < <(collect_related_pids)
  if [[ "${#remaining[@]}" -gt 0 ]]; then
    echo "强制结束: ${remaining[*]}"
    kill_pids KILL "${remaining[@]}"
    # 进程组残留
    if [[ -f "$PID_FILE" ]]; then
      pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
      pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]' || true)"
      if [[ -n "$pgid" && "$pgid" != "0" && "$pgid" != "1" ]]; then
        kill -KILL -- "-$pgid" 2>/dev/null || true
      fi
    fi
    sleep 0.5
  fi

  rm -f "$PID_FILE"

  if is_running; then
    echo "停止失败，仍有残留进程:"
    print_status_lines || true
    return 1
  fi

  echo "已停止"
}

cmd_build() {
  echo "正在构建: npm run build"
  npm run build
}

cmd_start() {
  local pid

  if is_running; then
    echo "服务已在运行:"
    print_status_lines || true
    return 1
  fi

  cmd_build

  : >"$LOG_FILE"
  # setsid：独立会话/进程组，便于 stop 时整组清理
  setsid nohup npm run "$NPM_SCRIPT" >"$LOG_FILE" 2>&1 </dev/null &
  echo $! >"$PID_FILE"

  local i=0
  while [[ "$i" -lt 30 ]]; do
    if is_running; then
      echo "已启动"
      print_status_lines || true
      echo "日志: $LOG_FILE"
      return 0
    fi
    if [[ -f "$PID_FILE" ]]; then
      pid="$(tr -d '[:space:]' <"$PID_FILE")"
      if ! is_pid_alive "$pid" && ! is_running; then
        echo "启动失败，请查看日志: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
      fi
    fi
    sleep 0.5
    i=$((i + 1))
  done

  echo "已提交后台启动，请确认状态:"
  cmd_status || true
  echo "日志: $LOG_FILE"
}

cmd_restart() {
  cmd_stop || true
  cmd_start
}

main() {
  case "${1:-}" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_restart ;;
    status) cmd_status ;;
    -h|--help|help) usage ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
