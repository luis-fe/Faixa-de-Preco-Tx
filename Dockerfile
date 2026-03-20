FROM php:8.2-apache

# 1. Resolve o erro "More than one MPM loaded"
# Remove qualquer configuração conflitante e força o uso do prefork (exigido pelo PHP)
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load \
    && rm -f /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork

# 2. Configura o Apache para ouvir explicitamente na porta 8080
RUN sed -i 's/Listen 80/Listen 8080/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:8080>/g' /etc/apache2/sites-available/000-default.conf

# 3. Diretório de trabalho e cópia dos arquivos
WORKDIR /var/www/html/
COPY . /var/www/html/

# 4. Ajuste de permissões para o PHP conseguir salvar o arquivo dados.json
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 5. Expõe a porta 8080 para o Docker/Railway
EXPOSE 8080