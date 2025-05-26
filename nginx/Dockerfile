FROM nginx:alpine

RUN apk add --no-cache openssl

RUN mkdir -p /etc/nginx/ssl \
	&& openssl req -x509 -nodes -days 365 \
	-newkey rsa:2048 \
	-keyout /etc/nginx/ssl/cert.key \
    -out /etc/nginx/ssl/cert.crt \
	-subj "/C=FI/ST=UUSIMA/L=HLSINKI/O=42/OU=HIVE/CN=localhost"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8443

CMD ["nginx", "-g", "daemon off;"]