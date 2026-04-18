#!/bin/bash
# 프로젝트 루트로 이동 후 메인 빌드 스크립트 실행
set -e
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
exec bash scripts/build-api-prod.sh
