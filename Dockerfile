FROM php:8.2-apache

# 1. Limpeza absoluta dos módulos MPM
# Deletamos qualquer rastro de MPM antigo e criamos o atalho manualmente APENAS para o prefork (exigido pelo PHP)
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load \
    && rm -f /etc/apache2/mods-enabled/mpm_*.conf \
    && ln -s /etc/apache2/mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load \
    && ln -s /etc/apache2/mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf

# 2. Configuração exata para a porta 8080
RUN sed -i 's/Listen 80/Listen 8080/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:8080>/g' /etc/apache2/sites-available/000-default.conf

# 3. Diretório de trabalho e cópia do seu projeto
WORKDIR /var/www/html/
COPY . /var/www/html/

# 4. Ajuste de permissões para permitir a gravação do dados.json pelo Excel
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 5. Expõe a porta para o Railway
EXPOSE 8080