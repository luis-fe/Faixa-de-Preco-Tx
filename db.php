<?php
// Tenta pegar as variáveis, mas limpa qualquer aspa ou espaço extra
$host = trim(getenv('PGHOST'));
$port = trim(getenv('PGPORT')) ?: '5432';
$dbname = trim(getenv('PGDATABASE'));
$user = trim(getenv('PGUSER'));
$pass = trim(getenv('PGPASSWORD'));

// Se por algum motivo o Railway não entregou as variáveis, 
// o script vai parar aqui com um aviso claro.
if (!$host || !$dbname) {
    die("Erro: Variáveis de ambiente do banco não encontradas no Railway.");
}

try {
    // Montamos a DSN de forma ultra limpa
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$pass";
    
    // Criamos a conexão passando apenas a DSN
    $pdo = new PDO($dsn);
    
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // SQL de criação das tabelas
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
    // Isso vai nos mostrar exatamente onde o texto está quebrando
    die("Erro de Conexão: " . $e->getMessage());
}