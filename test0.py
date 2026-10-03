import requests

API_URL = "http://127.0.0.1:5000/api/update_fall"

data = {
    "user_id": "1",
    "status": "FALL",
    "confidence": 0.88
}

res = requests.post(API_URL, json=data)

print(res.status_code)
print(res.text)