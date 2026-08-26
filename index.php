<?php
header("Content-Type: application/json;charset=utf-8");

try {
    $pdo = new PDO(
        "mysql:host=140.143.251.204;port=3306;dbname=fall_detect;charset=utf8",
        "root",  // 建议不要用root
        "xzs20070516",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]
    );

    // 查询最新50条
    $sql = "SELECT * FROM fall_events ORDER BY id DESC LIMIT 50";
    $stmt = $pdo->query($sql);

    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // 归一化字段名，兼容不同表结构
    $normalized = array_map(function($row) {
        return [
            'id' => $row['id'] ?? $row['event_id'] ?? $row['eid'] ?? null,
            'user_id' => $row['user_id'] ?? $row['uid'] ?? $row['user'] ?? '',
            'event_time' => $row['event_time'] ?? $row['time'] ?? $row['created_at'] ?? '',
            'location' => $row['location'] ?? $row['camera'] ?? $row['location_id'] ?? '',
            'confidence' => isset($row['confidence']) ? $row['confidence'] : (isset($row['score']) ? $row['score'] : null),
            'status' => $row['status'] ?? $row['state'] ?? $row['result'] ?? ''
        ];
    }, $data);

    echo json_encode([
        "code" => 200,
        "data" => $normalized
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "code" => 500,
        "error" => $e->getMessage()
    ]);
}
?>
