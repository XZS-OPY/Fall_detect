<?php
// ============================================
// CORS 头 - 必须在任何输出之前
// ============================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// ============================================
// 处理 OPTIONS 预检请求 - 立即返回 200
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);  // 重要：使用 exit(0) 确保完全退出
}

// ============================================
// 数据库配置
// ============================================
$servername = "140.143.251.204";
$username = "root";
$password = "xzs20070516";
$dbname = "fall_detect";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        'code' => 500,
        'error' => '数据库连接失败: ' . $conn->connect_error
    ]);
    exit;
}

// ============================================
// 获取请求数据
// ============================================
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!$data) {
    $data = $_GET;
}

$user = trim($data['username'] ?? '');
$pass = $data['password'] ?? '';
$email = trim($data['email'] ?? '');

// ============================================
// 验证输入
// ============================================
$errors = [];

if (empty($user) || strlen($user) < 3) {
    $errors[] = '用户名至少3个字符';
}

if (empty($pass) || strlen($pass) < 6) {
    $errors[] = '密码至少6个字符';
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = '请输入有效的邮箱地址';
}

if (!empty($errors)) {
    echo json_encode([
        'code' => 400,
        'error' => implode('；', $errors)
    ]);
    $conn->close();
    exit;
}

// ============================================
// 创建 users 表（如果不存在）
// ============================================
$createTableSQL = "
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    status TINYINT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$conn->query($createTableSQL);

// ============================================
// 检查用户名或邮箱是否已存在
// ============================================
$check = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
$check->bind_param("ss", $user, $email);
$check->execute();
$result = $check->get_result();

if ($result->num_rows > 0) {
    echo json_encode([
        'code' => 400,
        'error' => '用户名或邮箱已被注册'
    ]);
    $check->close();
    $conn->close();
    exit;
}
$check->close();

// ============================================
// 加密密码并插入用户
// ============================================
$hashed_pass = password_hash($pass, PASSWORD_DEFAULT);

$sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        'code' => 500,
        'error' => 'SQL 准备失败: ' . $conn->error
    ]);
    $conn->close();
    exit;
}

$stmt->bind_param("sss", $user, $hashed_pass, $email);

if ($stmt->execute()) {
    $user_id = $conn->insert_id;
    
    // 启动会话
    session_start();
    $_SESSION['user_id'] = $user_id;
    $_SESSION['username'] = $user;
    $_SESSION['email'] = $email;
    
    echo json_encode([
        'code' => 200,
        'message' => '注册成功！',
        'data' => [
            'id' => $user_id,
            'username' => $user,
            'email' => $email,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ]);
} else {
    echo json_encode([
        'code' => 500,
        'error' => '注册失败: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>