#!/bin/bash

ID=$1

if [[ $ID == "" ]]; then
	echo "Please pass the game id as an argument"
	exit
fi

curl -s -X GET "http://localhost:8888/game/list/${ID}"

