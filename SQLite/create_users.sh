#!/bin/bash

echo "Waiting for Fastify server to be ready..."
until curl -s http://localhost:8888/users | grep -q "[]" || curl -s http://localhost:8888/users | grep -q "error"; do
  echo "Waiting for server to be ready"
  sleep 2
done

echo "Fastify server is up! Creating test users..."

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "aaa",
		   "email": "aaa@example.com",
		   "password": "AAA"
		 }'

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "bbb",
		   "email": "bbb@example.com",
		   "password": "BBB"
		 }'

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "ccc",
		   "email": "ccc@example.com",
		   "password": "CCC"
		 }'

echo "Test users created!"
