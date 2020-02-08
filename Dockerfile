FROM nginx:mainline-alpine

ADD . ./home/
RUN cp /home/nginx.conf /etc/nginx/nginx.conf
RUN chmod +x /home/start.sh
RUN apk add --update build-base libressl libressl-dev nodejs npm certbot acme.sh socat --no-cache

RUN cd /home && npm i

CMD ["sh", "/home/start.sh"]
EXPOSE 3000 80 443