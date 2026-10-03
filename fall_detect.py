import cv2
import json
import time
import math
import threading
import requests

from datetime import datetime

print("系统启动中……")

# ================= MediaPipe =================
print("\n[MediaPipe] 加载...")

try:
    import mediapipe as mp

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


# ================= API配置 =================
API_URL = "https://person.ltd/update_fall.php"
API_TOKEN = "数据库里的真实device_token"


# ================= 限频控制 =================
last_upload_time = 0
last_status = None

def should_upload(current_status):
    global last_upload_time, last_status

    now = time.time()

    # 状态变化 → 立即上传
    if current_status != last_status:
        last_status = current_status
        last_upload_time = now
        return True

    # 每3秒心跳一次
    if now - last_upload_time > 3:
        last_upload_time = now
        return True

    return False


# ================= 异步上传 =================
def async_upload(data):
    try:
        res = requests.post(API_URL, json=data, timeout=5)

        if res.status_code == 200:
            try:
                result = res.json()
                if result.get("success"):
                    print(f"✔ 上传成功: {data['status']}")
                else:
                    print("✖ 服务器返回失败:", result)
            except:
                print("✖ 返回非JSON:", res.text)
        else:
            print("✖ HTTP错误:", res.status_code)

    except Exception as e:
        print("✖ 请求异常:", e)


def update_state(pose_data, confidence, angle, height_diff, status): 
    data = {  
        "device_token": API_TOKEN,   # ✅ 正确字段
        "location": "Camera-4",  
        "confidence": float(confidence),  
        "pose_data": pose_data,  
        "status": status  
    } 

    threading.Thread(
        target=async_upload,
        args=(data,),
        daemon=True
    ).start()
# ================= 工具函数 =================
def calculate_angle(p1, p2):
    return math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / math.pi


# ================= 摄像头 =================
print("\n[摄像头] 打开...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("摄像头打开失败")
    exit(1)

print("摄像头已启动")


# ================= 状态变量 =================
fall_start_time = None
frame_count = 0

print("\n系统运行中... 按 q 退出")

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

        shoulder = None
        hip = None

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

        # ================= 上传（限频） =================
        if should_upload(status):
            update_state(
                pose_data={
                    "shoulder": [shoulder.x, shoulder.y] if shoulder else None,
                    "hip": [hip.x, hip.y] if hip else None
                },
                confidence=confidence,
                angle=angle,
                height_diff=height_diff,
                status=status
            )

        # ================= UI =================
        cv2.putText(frame, f"Status: {status}", (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.putText(frame, f"Angle: {angle:.1f}", (50, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        cv2.imshow("Fall Detection", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
    pose.close()

    print(f"\n统计: {frame_count} 帧")
    print("程序结束")