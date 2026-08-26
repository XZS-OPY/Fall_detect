
import cv2
import pymysql
import json
import time
import math
from datetime import datetime

print("=" * 60)
print("跌倒检测系统")
print("=" * 60)

# ========== MediaPipe 初始化 ==========
print("\n[MediaPipe] 加载...")

try:
    import mediapipe as mp

    if not hasattr(mp, "solutions"):
        raise RuntimeError("mediapipe异常(无solutions)")

    mp_pose = mp.solutions.pose
    mp_draw = mp.solutions.drawing_utils

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    print("MediaPipe 初始化成功")

except Exception as e:
    print(f"MediaPipe 加载失败: {e}")
    exit(1)

# ========== 数据库 ==========
DB_CONFIG = {
    'host': '140.143.251.204',
    'port': 3306,
    'user': 'root',
    'password': 'xzs20070516',
    'database': 'fall_detect',
    'charset': 'utf8mb4'
}

def test_database():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT NOW()")
        print("  数据库连接成功")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return False

db_available = test_database()

# ========== 摄像头 ==========
print("\n[摄像头] 打开...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("摄像头打开失败")
    exit(1)

print("摄像头已启动")

# ========== 数据库连接 ==========
conn = None
cursor = None

if db_available:
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

# ========== 工具函数 ==========
def calculate_angle(p1, p2):
    return math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / math.pi

def update_state(pose_data, confidence, angle, height_diff, status):

    if not db_available:
        return

    try:
        sql = """
        INSERT INTO fall_events
        (user_id, location, confidence, pose_data, event_time, status)
        VALUES (%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            location=VALUES(location),
            confidence=VALUES(confidence),
            pose_data=VALUES(pose_data),
            event_time=VALUES(event_time),
            status=VALUES(status)
        """

        cursor.execute(sql, (
            "1",
            "Camera-4",
            float(confidence),
            json.dumps(pose_data),
            datetime.now(),
            status
        ))

        conn.commit()
        print(f"状态更新: {status}")

    except Exception as e:
        print("数据库更新失败:", e)

# ========== 状态变量 ==========
fall_start_time = None

print("\n系统运行中... 按 q 退出")

frame_count = 0

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        status = "NORMAL"
        confidence = 0.5
        angle = 0
        height_diff = 0

        if results.pose_landmarks:

            landmarks = results.pose_landmarks.landmark

            mp_draw.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )

            if len(landmarks) > 24:
                shoulder = landmarks[11]
                hip = landmarks[23]

                angle = abs(calculate_angle(shoulder, hip))
                height_diff = abs(shoulder.y - hip.y)

                is_horizontal = angle < 30 or angle > 150
                is_low = hip.y > 0.6

                is_fall = is_horizontal and is_low and height_diff < 0.25

                confidence = min(1.0, 0.7 + (0.3 - height_diff))

                # ===== 状态判断 =====
                if is_fall:
                    status = "FALL"

                    if fall_start_time is None:
                        fall_start_time = time.time()

                    duration = time.time() - fall_start_time

                    if duration < 2:
                        status = "WARNING"

                else:
                    fall_start_time = None
                    status = "NORMAL"

        # ===== 数据库更新（每一帧）=====
        update_state(
            pose_data={
                "keypoints": [[lm.x, lm.y, lm.z] for lm in (landmarks if results.pose_landmarks else [])]
            },
            confidence=confidence,
            angle=angle,
            height_diff=height_diff,
            status=status
        )

        # ===== UI显示 =====
        cv2.putText(frame, f"Status: {status}", (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

        cv2.putText(frame, f"Angle: {angle:.1f}", (50, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)

        cv2.imshow("Fall Detection", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
    pose.close()

    if cursor:
        cursor.close()
    if conn:
        conn.close()

    print(f"\n统计: {frame_count} 帧")
    print("程序结束")