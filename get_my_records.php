<?php
// ============================================
// 1. CORS 配置（支持 credentials）
// ============================================

//  允许的域名 
$allowed_origins = [
    'http://person.ltd',
    'https://person.ltd',
    'http://www.person.ltd',
    'https://www.person.ltd',
    // 'http://localhost:8080',
    // 'http://localhost:3000',
    // 'http://140.143.251.204',   
    // 'https://140.143.251.204'   
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 处理 OPTIONS 预检
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// ============================================
// 2. 启动会话
// ============================================
session_start();

// ============================================
// 3. 检查登录状态
// ============================================
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'code' => 401,
        'error' => '请先登录'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'] ?? '';

// ============================================
// 4. 数据库配置
// ============================================
$servername = "140.143.251.204";
$username_db = "root";
$password_db = "xzs20070516";
$dbname = "fall_detect";

$conn = new mysqli($servername, $username_db, $password_db, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        'code' => 500,
        'error' => '数据库连接失败: ' . $conn->connect_error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============================================
// 5. 查询记录
// ============================================
$records = [];

// 检查 fall_events 表是否有 user_id 字段
$checkColumn = $conn->query("SHOW COLUMNS FROM fall_events LIKE 'user_id'");

if ($checkColumn && $checkColumn->num_rows > 0) {
    $sql = "SELECT * FROM fall_events WHERE user_id = ? ORDER BY id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
    $stmt->close();
} else {
    // 没有 user_id 字段，返回所有记录
    $sql = "SELECT * FROM fall_events ORDER BY id DESC LIMIT 20";
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }
    }
}

$conn->close();

// ============================================
// 6. 返回结果
// ============================================
echo json_encode([
    'code' => 200,
    'data' => $records,
    'total' => count($records),
    'user' => [
        'id' => $user_id,
        'username' => $username
    ]
], JSON_UNESCAPED_UNICODE);
?>