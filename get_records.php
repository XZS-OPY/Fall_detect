<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json; charset=utf-8');

// 优先尝试载入数据库配置（查询 fall_events 表），否则使用工作区内已有远程 DB 凭据作为回退
$configFile = __DIR__ . DIRECTORY_SEPARATOR . 'db_config.php';
$useSample = isset($_GET['sample']) && $_GET['sample'] === '1';

if (!$useSample && file_exists($configFile)) {
    require $configFile; // 应提供 $DB_CONFIG
    $db = $DB_CONFIG;
} else {
    // 回退到已知的 remote DB（与 index.php 中相同）
    $db = [
        'host' => '140.143.251.204',
        'port' => 3306,
        'user' => 'root',
        'pass' => 'xzs20070516',
        'dbname' => 'fall_detect',
    ];
}

if (!$useSample) {
    try {
        $host = $db['host'] ?? '';
        $port = $db['port'] ?? 3306;
        $user = $db['user'] ?? '';
        $pass = $db['pass'] ?? '';
        $dbname = $db['dbname'] ?? '';

        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $limit = max(1, min(1000, $limit));

        $sql = "SELECT * FROM fall_events ORDER BY id DESC LIMIT :limit";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        // 归一化字段名供前端使用
        $normalized = array_map(function($row) {
            return [
                'id' => $row['id'] ?? $row['event_id'] ?? null,
                'user_id' => $row['user_id'] ?? $row['uid'] ?? $row['user'] ?? '',
                'event_time' => $row['event_time'] ?? $row['time'] ?? $row['created_at'] ?? '',
                'location' => $row['location'] ?? $row['camera'] ?? '',
                'confidence' => isset($row['confidence']) ? $row['confidence'] : (isset($row['score']) ? $row['score'] : null),
                'status' => $row['status'] ?? $row['state'] ?? $row['result'] ?? ''
            ];
        }, $rows);

        echo json_encode(['code' => 200, 'data' => $normalized], JSON_UNESCAPED_UNICODE);
        exit;

    } catch (PDOException $e) {
        echo json_encode(['code' => 500, 'error' => 'DB error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }

} else {
    // 回退示例数据
    $data = [
        [
            'id' => 1,
            'user_id' => 'U004',
            'event_time' => date('Y-m-d H:i:s'),
            'location' => 'cam1',
            'confidence' => 0.95,
            'status' => 'fall'
        ]
    ];
    echo json_encode(['code' => 200, 'data' => $data], JSON_UNESCAPED_UNICODE);
}
