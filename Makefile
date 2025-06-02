COMPOSE := docker compose
RESET = \033[0m
YELLOW = \033[33m

up: build start

start:
	@echo "$(YELLOW)Create and start containers$(RESET)"
	$(COMPOSE) up -d
	@echo "$(YELLOW)App running on https://localhost:8443"

build:
	@echo "$(YELLOW)Build or rebuild services$(RESET)"
	$(COMPOSE) build

logs:
	@echo "$(YELLOW)View output from containers$(RESET)"
	$(COMPOSE) logs

backend-logs:
	@echo "$(YELLOW)View output from backend container$(RESET)"
	docker logs 42_transcendence-backend-1

frontend-logs:
	@echo "$(YELLOW)View output from frontend container$(RESET)"
	docker logs 42_transcendence-frontend-1

nginx-logs:
	@echo "$(YELLOW)View output from nginx container$(RESET)"
	docker logs ft_nginx

db:
	@echo "$(YELLOW)Database$(RESET)"
	docker exec -it 42_transcendence-sqlite-1 sqlite3 database.sqlite

stop:
	@echo "$(YELLOW)Stop and remove containers, networks$(RESET)"
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm backend npm test -- --allow-incomplete-coverage

clean:
	@echo "$(YELLOW)Delete volumes$(RESET)"
	$(COMPOSE) down --volumes

fclean: clean
	@echo "$(YELLOW)Delete images$(RESET)"
	$(COMPOSE) down --rmi all
	@echo "$(YELLOW)Remove local volumes$(RESET)"
	docker volume prune -af
	@echo "$(YELLOW)Remove local data$(RESET)"
	docker system prune -af


.PHONY: up start build logs backend-logs frontend-logs nginx-logs db stop test clean fclean
