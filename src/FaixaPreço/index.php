<?php
session_start();

// Se já estiver logado, manda direto pro Kanban
if (isset($_SESSION['logado']) && $_SESSION['logado'] === true) {
    header("Location: kanban.php");
    exit;
}

$erro = "";

// Lógica que processa o formulário quando o botão é clicado
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = $_POST['usuario'] ?? '';
    $senha = $_POST['senha'] ?? '';

    // Verifica as credenciais
    if ($usuario === 'teste.teste' && $senha === '123') {
        $_SESSION['logado'] = true;
        header("Location: kanban.php");
        exit;
    } else {
        $erro = "Usuário ou senha incorretos!";
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Kanban</title>
    <style>
        :root {
            --green-primary: #2E7D32;
            --green-light: #E8F5E9;
            --green-medium: #4CAF50;
            --white: #FFFFFF;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--green-light);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .login-box {
            background-color: var(--white);
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            border-top: 5px solid var(--green-primary);
            width: 100%;
            max-width: 350px;
            text-align: center;
        }
        .login-box h2 {
            color: var(--green-primary);
            margin-top: 0;
            margin-bottom: 20px;
        }
        input {
            width: 100%;
            padding: 12px;
            margin-bottom: 15px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 16px;
        }
        input:focus {
            outline: none;
            border-color: var(--green-medium);
        }
        button {
            width: 100%;
            background-color: var(--green-primary);
            color: var(--white);
            border: none;
            padding: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: 0.3s;
        }
        button:hover {
            background-color: var(--green-medium);
        }
        .erro {
            color: #d32f2f;
            background-color: #ffebee;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 14px;
            border: 1px solid #ffcdd2;
        }
    </style>
</head>
<body>

    <div class="login-box">
        <h2>Acesso ao Sistema</h2>
        
        <?php if ($erro): ?>
            <div class="erro"><?= $erro ?></div>
        <?php endif; ?>

        <form method="POST">
            <input type="text" name="usuario" placeholder="Usuário" required>
            <input type="password" name="senha" placeholder="Senha" required>
            <button type="submit">Entrar</button>
        </form>
    </div>

</body>
</html>