<?php
// Tenta pegar as credenciais do Railway (ou usa valores padrão para teste local)
$host = getenv('PGHOST') ?: 'localhost';
$port = getenv('PGPORT') ?: '5432';
$dbname = getenv('PGDATABASE') ?: 'postgres';
$user = getenv('PGUSER') ?: 'postgres';
$password = getenv('PGPASSWORD') ?: 'sua_senha_local';

try {
    // Cria a conexão com o PostgreSQL usando PDO
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    
    // Configura o PDO para jogar erros na tela caso algo dê errado (ajuda muito a debugar)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // O comando SQL que cria as tabelas APENAS se elas não existirem
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

    // Executa a query de criação
    $pdo->exec($sql);

} catch (PDOException $e) {
    // Se der erro de senha, banco inexistente, etc., ele para tudo e avisa
    die("Erro crítico - Falha ao conectar no banco de dados: " . $e->getMessage());
}
?>