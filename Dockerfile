FROM php:8.2-apache

# 1. Instala as bibliotecas do PostgreSQL no Linux e ativa no PHP
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# 2. Define o diretório de trabalho
WORKDIR /var/www/html/

# 3. Copia a raiz e todas as subpastas para o servidor
COPY . /var/www/html/

# 4. Ajusta as permissões
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 5. Configuração da porta para o Railway
ENV PORT=8080
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf
EXPOSE 8080

# 6. O Pulo do Gato (Correção de MPM do Apache)
CMD ["/bin/bash", "-c", "a2dismod mpm_event mpm_worker 2>/dev/null || true && a2enmod mpm_prefork && apache2-foreground"]