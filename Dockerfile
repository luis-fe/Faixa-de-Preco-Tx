FROM php:8.2-apache

# 1. Define o diretório de trabalho e copia os arquivos
WORKDIR /var/www/html/
COPY . /var/www/html/

# 2. Ajusta as permissões para o PHP conseguir receber e gravar o dados.json
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 3. Altera silenciosamente a porta padrão do Apache de 80 para 8080
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# 4. Expõe a porta 8080
EXPOSE 8080