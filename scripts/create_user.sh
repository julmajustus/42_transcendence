#!/bin/bash

USER=$1
PASS=$2
EMAIL=$3

if [[ $USER == "" || $PASS == "" || $EMAIL == "" ]]; then
	echo "Pass username, password and email as arguments. ./create_game username password email"
	exit
fi

curl -k -s -X POST https://localhost:8443/api/user/register \
         -H "Content-Type: application/json" \
         -d "{
                   \"username\": \"$USER\",
                   \"password\": \"$PASS\",
                   \"email\": \"$EMAIL\"
            }"

