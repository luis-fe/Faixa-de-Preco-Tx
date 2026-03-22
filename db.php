<?php
$host = getenv('PGHOST') ?: ($_ENV['PGHOST'] ?? ($_SERVER['PGHOST'] ?? null));
$port = getenv('PGPORT') ?: ($_ENV['PGPORT'] ?? ($_SERVER['PGPORT'] ?? '5432'));
$dbname = getenv('PGDATABASE') ?: ($_ENV['PGDATABASE'] ?? ($_SERVER['PGDATABASE'] ?? null));
$user = getenv('PGUSER') ?: ($_ENV['PGUSER'] ?? ($_SERVER['PGUSER'] ?? null));
$pass = getenv('PGPASSWORD') ?: ($_ENV['PGPASSWORD'] ?? ($_SERVER['PGPASSWORD'] ?? null));

$host = trim($host, " '\"");
$dbname = trim($dbname, " '\"");
$user = trim($user, " '\"");
$pass = trim($pass, " '\"");

if (!$host || !$dbname) {
    die("Erro: Variáveis não encontradas. Verificamos PGHOST e PGDATABASE.");
}

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $sql = '
        /* TABELA PRODUTO */
        CREATE TABLE IF NOT EXISTS "produto" (
            referencia VARCHAR PRIMARY KEY,
            descricao VARCHAR,
            colecao VARCHAR,
            linha VARCHAR,
            grupo VARCHAR,
            "classificacao" VARCHAR
        );
        ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "classificacao" VARCHAR;

        /* TABELA PLANO */
        CREATE TABLE IF NOT EXISTS "Plano" (
            plano VARCHAR PRIMARY KEY
        );

        /* TABELA PRODUTO_PLANO (Preços e Markups) */
        CREATE TABLE IF NOT EXISTS "produto_plano" (
            referencia VARCHAR,
            plano VARCHAR,
            "precoB2B" VARCHAR,
            "precoB2C" VARCHAR,
            "MkpB2B" VARCHAR,
            UNIQUE(referencia, plano)
        );
        ALTER TABLE "produto_plano" ADD COLUMN IF NOT EXISTS "precoB2C" VARCHAR;
        ALTER TABLE "produto_plano" ADD COLUMN IF NOT EXISTS "MkpB2B" VARCHAR;

        /* TABELA DE FAIXAS SALVAS */
        CREATE TABLE IF NOT EXISTS "planoFaixaPrecoLinhaGrupo"(
            plano varchar,
            linha varchar,
            grupo varchar,
            "valorEntradaB2B" varchar ,
            "valorintermediarioB2B" varchar ,
            "valorPremium" varchar,
            UNIQUE(plano, linha, grupo)
        );

        create table  IF NOT EXISTS "controleSincronizacaoExcel" (
            "dataHoraSincronizacao" varchar,
            "plano" VARCHAR PRIMARY KEY
            )
    ';
    $pdo->exec($sql);

} catch (PDOException $e) {
    die("Erro de Conexão: " . $e->getMessage());
}
?>