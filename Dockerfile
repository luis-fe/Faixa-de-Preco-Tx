# Usa a imagem oficial do PHP na versão 8.2 com o Apache embutido
FROM php:8.2-apache

# Define o diretório de trabalho dentro do container
WORKDIR /var/www/html/

# Copia todos os arquivos da sua pasta local para dentro do diretório do Apache no container
COPY . /var/www/html/

# 1. RESOLVE O ERRO DE MPM
# Desativa módulos conflitantes (event e worker) e garante que o prefork (exigido pelo PHP) esteja ativo
RUN a2dismod mpm_event mpm_worker || true \
    && a2enmod mpm_prefork

# 2. RESOLVE A PORTA DINÂMICA DO RAILWAY
# O Railway usa a variável de ambiente $PORT. O Apache precisa ser configurado para ler essa variável.
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# 3. PERMISSÕES DE ESCRITA
# Ajusta as permissões para o PHP conseguir criar e editar o arquivo 'dados.json'
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html