#!/bin/bash

ID_1=$1
ID_2=$2

if [[ $ID_1 == "" || $ID_2 == "" ]]; then
	echo "Pass player ids as arugments e.g. ./create_game 1 2"
	exit
fi

curl -s -X POST http://localhost:8888/game/new \
	 -H "Content-Type: application/json" \
	 -d '{
			"player1_id": "1",
			"player2_id": "2"
		 }'

