#!/bin/bash
# 프로젝트 루트로 이동 후 프로덕션 서버 시작
set -e
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
exec bash scripts/start-api-prod.sh
