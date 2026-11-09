# ---------------------------------------------------------------
#  Image 1 of 3: Frontend (static site + nginx reverse proxy)
# ---------------------------------------------------------------
FROM nginx:1.27-alpine

# Default backend location (can be overridden with -e or in k8s env)
ENV BACKEND_HOST=backend \
    BACKEND_PORT=5000

# nginx image renders /etc/nginx/templates/*.template -> /etc/nginx/conf.d/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Static website files
COPY index.html /usr/share/nginx/html/
COPY css        /usr/share/nginx/html/css
COPY js         /usr/share/nginx/html/js

EXPOSE 80
