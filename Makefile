.PHONY: dev install docker-up docker-down build-api check

install:
	cd frontend && npm ci
	npm ci --prefix .

dev:
	npm run dev

docker-up:
	@test -f backend/.env || cp backend/.env.example backend/.env
	docker compose up --build

docker-down:
	docker compose down

build-api:
	cd backend && cargo build --release

check:
	cd backend && cargo check
