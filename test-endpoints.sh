#!/bin/bash

BASE_URL="https://api.ticktick.com/api/v2"
ENDPOINTS=(
  "/user"
  "/profile"
  "/me"
  "/tasks"
  "/projects"
  "/folders"
  "/tags"
  "/batch"
  "/sync"
  "/state"
  "/openapi"
  "/api-docs"
  "/docs"
  "/swagger.json"
  "/openapi.json"
)

echo "Testing API endpoints at $BASE_URL"
echo "===================================="

for endpoint in "${ENDPOINTS[@]}"; do
  echo -n "Testing $endpoint... "
  response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$BASE_URL$endpoint")
  
  if [[ "$response" == "200" ]]; then
    echo "✅ 200 OK"
    head -c 200 /tmp/response.txt
    echo ""
  elif [[ "$response" == "404" ]]; then
    echo "❌ 404 Not Found"
  elif [[ "$response" == "403" ]]; then
    echo "🔒 403 Forbidden"
  elif [[ "$response" == "401" ]]; then
    echo "🔐 401 Unauthorized"
  else
    echo "⚠ $response"
    head -c 200 /tmp/response.txt
    echo ""
  fi
  
  sleep 0.5
done

echo ""
echo "Testing with POST to /signin..."
curl -s -X POST "$BASE_URL/signin" -H "Content-Type: application/json" -d '{"username":"test","password":"test"}' | head -c 200
echo ""

echo "Testing with POST to /login..."
curl -s -X POST "$BASE_URL/login" -H "Content-Type: application/json" -d '{"username":"test","password":"test"}' | head -c 200
echo ""