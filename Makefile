dev:
	docker compose up -d notes_app_node_db --wait --timeout 10
	npm run migrations
	npm run dev
test:
	docker compose up -d notes_app_node_test_db --wait --timeout 10
	POSTGRES_PORT=5433 npm run migrations
	npm run test
