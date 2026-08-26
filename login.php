<?php
// ============================================
// CORS 配置 - 必须放在最顶部
// ============================================
$allowed_origins = [
    'http://person.ltd',
    'https://person.ltd',
    'http://www.person.ltd',
    'https://www.person.ltd',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://140.143.251.204'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);  // ✅ 具体域名
    header('Access-Control-Allow-Credentials: true');   // ✅ 允许携带凭证
}

header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// ============================================
// 业务逻辑
// ============================================
session_start();

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

$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!$data) {
    $data = $_GET;
}

$user = trim($data['username'] ?? '');
$pass = $data['password'] ?? '';

if (empty($user) || empty($pass)) {
    echo json_encode([
        'code' => 400,
        'error' => '请填写用户名和密码'
    ]);
    $conn->close();
    exit;
}

$sql = "SELECT * FROM users WHERE username = ? OR email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $user, $user);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        'code' => 404,
        'error' => '用户不存在，请先注册'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$row = $result->fetch_assoc();

if (password_verify($pass, $row['password'])) {
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['username'] = $row['username'];
    $_SESSION['email'] = $row['email'];
    
    $updateSql = "UPDATE users SET last_login = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("i", $row['id']);
    $updateStmt->execute();
    $updateStmt->close();
    
    echo json_encode([
        'code' => 200,
        'message' => '登录成功！',
        'data' => [
            'id' => $row['id'],
            'username' => $row['username'],
            'email' => $row['email'],
            'last_login' => $row['last_login']
        ]
    ]);
} else {
    echo json_encode([
        'code' => 401,
        'error' => '密码错误'
    ]);
}

$stmt->close();
$conn->close();
?>