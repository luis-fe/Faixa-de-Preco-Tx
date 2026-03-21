<?php
// Tenta buscar de todas as formas possíveis (getenv, $_ENV e $_SERVER)
$host = getenv('PGHOST') ?: ($_ENV['PGHOST'] ?? ($_SERVER['PGHOST'] ?? null));
$port = getenv('PGPORT') ?: ($_ENV['PGPORT'] ?? ($_SERVER['PGPORT'] ?? '5432'));
$dbname = getenv('PGDATABASE') ?: ($_ENV['PGDATABASE'] ?? ($_SERVER['PGDATABASE'] ?? null));
$user = getenv('PGUSER') ?: ($_ENV['PGUSER'] ?? ($_SERVER['PGUSER'] ?? null));
$pass = getenv('PGPASSWORD') ?: ($_ENV['PGPASSWORD'] ?? ($_SERVER['PGPASSWORD'] ?? null));

// REMOVA espaços ou aspas que o Railway possa ter colocado por erro
$host = trim($host, " '\"");
$dbname = trim($dbname, " '\"");
$user = trim($user, " '\"");
$pass = trim($pass, " '\"");

if (!$host || !$dbname) {
    // Vamos exibir o que o PHP ESTÁ vendo para podermos debugar
    die("Erro: Variáveis não encontradas. Verificamos PGHOST e PGDATABASE. Verifique se o serviço do Banco está 'Linkado' ao serviço do PHP no Railway.");
}

try {
    // Montagem limpa
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // SQL de criação (mantendo o que já tínhamos)
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
        create table IF NOT EXISTS "planoFaixaPrecoLinhaGrupo"(
            plano varchar,
            linha varchar,
            grupo varchar,
            "valorEntradaB2B" varchar ,
            "valorintermediarioB2B" varchar ,
            "valorPremium" varchar
);
    ';
    $pdo->exec($sql);

} catch (PDOException $e) {
    die("Erro de Conexão: " . $e->getMessage());
}