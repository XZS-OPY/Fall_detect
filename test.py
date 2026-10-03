from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/update_fall', methods=['POST'])
def update_fall():
    data = request.json

    print("收到数据：", data)

    return jsonify({
        "success": True,
        "msg": "本地接口收到数据"
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)