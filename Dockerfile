FROM php:8.2-apache

# 1. Define o diretório de trabalho do servidor
WORKDIR /var/www/html/

# 2. Copia EXATAMENTE os arquivos que estão dentro da sua pasta para a raiz do servidor
# Se o Dockerfile estiver na raiz do seu projeto, usamos este caminho:
COPY src/faixaPreço/ /var/www/html/

# 3. Ajusta as permissões para o PHP conseguir receber e gravar o dados.json
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# 4. Configuração da porta 8080
ENV PORT=8080
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf
EXPOSE 8080

# 5. O PULO DO GATO: Resolve o erro de MPM do Railway no momento do boot
CMD ["/bin/bash", "-c", "a2dismod mpm_event mpm_worker 2>/dev/null || true && a2enmod mpm_prefork && apache2-foreground"]