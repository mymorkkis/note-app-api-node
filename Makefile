dev:
	docker compose up -d notes_app_node_db --wait --timeout 10
	npm run migrations
	npm run dev ; docker compose down notes_app_node_db

test:
	docker compose up -d notes_app_node_test_db --wait --timeout 10
	POSTGRES_PORT=5433 npm run migrations
	npm run test ; docker compose down notes_app_node_test_db

test_watch:
	docker compose up -d notes_app_node_test_db --wait --timeout 10
	POSTGRES_PORT=5433 npm run migrations
	npm run test -- --watch ; docker compose down notes_app_node_test_db
