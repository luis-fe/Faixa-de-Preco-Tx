FROM php:8.2-apache

# 1. Diretório e cópia dos arquivos
WORKDIR /var/www/html/
COPY . /var/www/html/

# 2. Permissões
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 3. Configuração da Porta 8080
ENV PORT=8080
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf
EXPOSE 8080

# 4. O PULO DO GATO: Desativa os módulos no momento exato do BOOT do Railway
CMD ["/bin/bash", "-c", "a2dismod mpm_event mpm_worker 2>/dev/null || true && a2enmod mpm_prefork && apache2-foreground"]