#!/bin/bash

PORT="8000"

P1_ID="1";
P2_ID="2";

GAME_ID=$(./create_game.sh $P1_ID $P2_ID | jq '.game_id')

echo "Player 1 join link:"
echo "http://localhost:$PORT/game.html?game_id=$GAME_ID&player_id=$P1_ID"
echo ""
echo "Player 2 join link:"
echo "http://localhost:$PORT/game.html?game_id=$GAME_ID&player_id=$P2_ID"
