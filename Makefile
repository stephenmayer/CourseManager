# CourseManager commands. `make verify` is the merge gate.
.PHONY: install verify test lint typecheck dev clean-tree

BACKEND := cd backend &&
FRONTEND := cd frontend &&

install: frontend/node_modules/.package-lock.json
	$(BACKEND) uv sync --frozen --quiet

frontend/node_modules/.package-lock.json: frontend/package-lock.json
	$(FRONTEND) npm ci --no-audit --no-fund --loglevel=error

lint: install
	$(BACKEND) uv run ruff check . ../scripts/ci
	$(BACKEND) uv run ruff format --check . ../scripts/ci
	$(FRONTEND) npm run --silent lint

typecheck: install
	$(BACKEND) uv run mypy
	$(FRONTEND) npm run --silent typecheck

test: install
	$(BACKEND) uv run pytest
	$(FRONTEND) npm run --silent test

clean-tree:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "verify: refusing to run with uncommitted changes:"; git status --short; exit 1; \
	fi

# Lint, typecheck and tests for backend and frontend on a committed tree.
verify: clean-tree
	@$(MAKE) --no-print-directory lint typecheck test
	@$(MAKE) --no-print-directory clean-tree
	@echo "verify: PASSED at commit $$(git rev-parse HEAD) ($$(git log -1 --format=%s))"

# Backend on :8000 and frontend on :5173 (proxying /api). Override with API_PORT / WEB_PORT.
dev: install
	./scripts/dev.sh
