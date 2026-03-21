<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h3>Teste de Conexão PostgreSQL</h3>";

// Verifica se as variáveis do Railway estão chegando no PHP
echo "Verificando variáveis de ambiente...<br>";
echo "Host: " . (getenv('PGHOST') ?: "NÃO ENCONTRADO") . "<br>";
echo "User: " . (getenv('PGUSER') ?: "NÃO ENCONTRADO") . "<br>";

try {
    require_once 'db.php';
    echo "<b style='color:green'>✅ Conexão estabelecida com sucesso!</b><br>";
    
    // Força a criação das tabelas manualmente aqui para testar
    $sql = 'CREATE TABLE IF NOT EXISTS "teste_conexao" (id serial PRIMARY KEY, nome varchar(50));';
    $pdo->exec($sql);
    echo "<b style='color:green'>✅ Tabela de teste criada com sucesso!</b><br>";

} catch (Exception $e) {
    echo "<b style='color:red'>❌ ERRO: " . $e->getMessage() . "</b>";
}
?>