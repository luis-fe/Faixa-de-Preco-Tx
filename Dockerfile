FROM php:8.2-apache

WORKDIR /var/www/html/

# Copia a raiz e todas as subpastas para o servidor
COPY . /var/www/html/

# Dá permissão para o PHP gravar o dados.json dentro do src/FaixaPreco
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

ENV PORT=8080
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf
EXPOSE 8080

CMD ["/bin/bash", "-c", "a2dismod mpm_event mpm_worker 2>/dev/null || true && a2enmod mpm_prefork && apache2-foreground"]