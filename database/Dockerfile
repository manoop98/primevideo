# ---------------------------------------------------------------
#  Image 3 of 3: MySQL with our schema + seed data baked in
#  Any .sql file in /docker-entrypoint-initdb.d/ runs ONCE,
#  the first time the container starts with an empty data dir.
# ---------------------------------------------------------------
FROM mysql:8.0

COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

EXPOSE 3306
