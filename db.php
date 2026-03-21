<?php
// Pega as variáveis do Railway (usa os nomes padrões da plataforma)
$host = getenv('PGHOST');
$port = getenv('PGPORT') ?: '5432';
$dbname = getenv('PGDATABASE');
$user = getenv('PGUSER');
$pass = getenv('PGPASSWORD');

try {
    // A STRING DE CONEXÃO (DSN) - Corrigida para evitar o erro da imagem
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    
    // Cria a conexão
    $pdo = new PDO($dsn, $user, $pass);
    
    // Configura o erro para exceção
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Criação das tabelas (IF NOT EXISTS)
    $sql = '
        CREATE TABLE IF NOT EXISTS "produto" (
            referencia VARCHAR PRIMARY KEY,
            descricao VARCHAR,
            colecao VARCHAR,
            linha VARCHAR,
            grupo VARCHAR
        );

        CREATE TABLE IF NOT EXISTS "Plano" (
            plano VARCHAR PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS "produto_plano" (
            referencia VARCHAR,
            plano VARCHAR,
            "precoB2B" VARCHAR
        );
    ';

    $pdo->exec($sql);

} catch (PDOException $e) {
    // Se der erro, ele vai mostrar de forma clara agora
    die("Erro de Conexão: " . $e->getMessage());
}