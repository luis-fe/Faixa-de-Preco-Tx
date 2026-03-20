# Usa a imagem oficial do PHP na versão 8.2 com o Apache embutido
FROM php:8.2-apache

# Define o diretório de trabalho dentro do container
WORKDIR /var/www/html/

# Copia todos os arquivos da sua pasta local para dentro do diretório do Apache no container
COPY . /var/www/html/

# Ajusta as permissões da pasta. 
# Isso é FUNDAMENTAL para que o PHP consiga criar e salvar o arquivo 'dados.json' quando o Excel enviar o POST
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html

# Informa ao Docker que o container vai escutar na porta 80 (porta padrão web)
EXPOSE 80