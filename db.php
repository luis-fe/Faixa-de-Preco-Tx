try {
    // Montagem limpa
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // 👇 ADICIONE ESTA LINHA AQUI (A "Opção Nuclear") 👇
    $pdo->exec('DROP TABLE IF EXISTS "planoFaixaPrecoLinhaGrupo";');

    // SQL de criação 
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
        CREATE TABLE IF NOT EXISTS "planoFaixaPrecoLinhaGrupo"(
            plano varchar,
            linha varchar,
            grupo varchar,
            "valorEntradaB2B" varchar ,
            "valorintermediarioB2B" varchar ,
            "valorPremium" varchar,
            UNIQUE(plano, linha, grupo)
        );
    ';
    $pdo->exec($sql);

} catch (PDOException $e) {
    die("Erro de Conexão: " . $e->getMessage());
}