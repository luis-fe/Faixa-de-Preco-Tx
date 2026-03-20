FROM php:8.2-apache

# 1. Limpeza agressiva: Removemos qualquer módulo MPM ativado e forçamos apenas o prefork (que o PHP exige)
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load \
    && rm -f /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork

# 2. Configuração cirúrgica da porta para o Railway ler a variável $PORT
RUN sed -i 's/Listen 8080/Listen ${PORT}/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# 3. Diretório de trabalho e cópia dos arquivos
WORKDIR /var/www/html/
COPY . /var/www/html/

# 4. Permissões de escrita para o seu arquivo dados.json ser salvo
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html