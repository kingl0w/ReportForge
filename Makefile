.PHONY: dev prod down logs logs-app logs-json build clean shell test-smoke test-smoke-prod

# Development: build and start all services
dev:
	docker compose up --build

# Production: start with production overrides (detached)
prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Stop all services
down:
	docker compose down

# Tail logs from all services
logs:
	docker compose logs -f

# Tail logs from the app container only
logs-app:
	docker compose logs -f app

# Parse structured JSON logs from the app container
logs-json:
	docker compose logs app --no-log-prefix | grep '^{' | jq .

# Rebuild images without starting
build:
	docker compose build

# Remove containers, volumes, and images
clean:
	docker compose down -v --rmi local

# Shell into the running app container
shell:
	docker compose exec app sh

# Run smoke tests against localhost:3000
test-smoke:
	npx tsx scripts/smoke-test.ts

# Run smoke tests against production (set APP_URL in env or .env)
test-smoke-prod:
	APP_URL=$${APP_URL:-$$(grep '^NEXT_PUBLIC_APP_URL=' .env 2>/dev/null | cut -d= -f2-)} npx tsx scripts/smoke-test.ts
