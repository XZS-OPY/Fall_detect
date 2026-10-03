<?php

header('Content-Type: application/json');

// ===== 读取请求 =====
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success"=>false, "msg"=>"JSON错误"]);
    exit;
}

// ===== 获取 token =====
$device_token = $data['device_token'] ?? '';

if (!$device_token) {
    echo json_encode(["success"=>false, "msg"=>"缺少device_token"]);
    exit;
}

// ===== 数据库连接 =====
$db = require __DIR__ . '/config/db_config.php';
$conn = new mysqli($db['host'], $db['user'], $db['pass'], $db['dbname']);
$conn->set_charset("utf8mb4");

// ===== 查 token（核心）=====
$stmt = $conn->prepare("
    SELECT d.id AS device_id, d.user_id, d.location
    FROM devices d
    WHERE d.device_token = ?
");

$stmt->bind_param("s", $device_token);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "msg" => "非法设备（token无效）"
    ]);
    exit;
}

$device = $res->fetch_assoc();

$device_id = $device['device_id'];
$user_id   = $device['user_id'];
$location  = $device['location'];

// ===== 获取数据 =====
$status = $data['status'] ?? 'UNKNOWN';
$confidence = $data['confidence'] ?? 0;

// ===== 更新设备心跳 =====
$conn->query("UPDATE devices SET last_seen = NOW() WHERE id = $device_id");

// ===== 只记录异常 =====
if ($status === "FALL" || $status === "WARNING") {

    $stmt = $conn->prepare("
        INSERT INTO fall_events (user_id, device_id, status, confidence, location, event_time)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");

    $stmt->bind_param("iisds", $user_id, $device_id, $status, $confidence, $location);
    $stmt->execute();
}

// ===== 返回成功 =====
echo json_encode([
    "success" => true,
    "msg" => "ok"
]);