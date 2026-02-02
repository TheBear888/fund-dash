from flask import Flask, render_template, jsonify
import requests
import re
import json
import time
import random

app = Flask(__name__)

# 内存缓存，减少对外部接口的冲击
CACHE = {"market": {}, "stocks": {}}


def get_headers():
    agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    ]
    return {
        "User-Agent": random.choice(agents),
        "Referer": "http://fund.eastmoney.com/",
        "Accept": "*/*"
    }


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/fund/<codes>')
def get_fund_market(codes):
    results = []
    for code in codes.split(','):
        code = code.strip()
        if not code: continue
        try:
            # 增加微小延迟，防止并发过高
            time.sleep(0.1)
            url = f"http://hq.sinajs.cn/list=f_{code}"
            resp = requests.get(url, headers={"Referer": "http://finance.sina.com.cn"}, timeout=5)
            content = resp.content.decode('gbk')
            match = re.search(r'"(.*)"', content)
            if match and match.group(1):
                p = match.group(1).split(',')
                data = {
                    "code": code,
                    "name": p[0] or "未知",
                    "gsz": p[1] or "0",
                    "jz": p[3] or "0",
                    "gszzl": p[5] or "0.00"
                }
                CACHE["market"][code] = data
                results.append(data)
        except:
            # 报错时尝试返回缓存
            results.append(CACHE["market"].get(code, {"code": code, "error": True}))
    return jsonify(results)


@app.route('/api/stocks/<code>')
def get_heavy_stocks(code):
    # 如果 1 小时内抓过，直接读缓存，绝对不要频繁抓取
    now = time.time()
    if code in CACHE["stocks"] and (now - CACHE["stocks"][code]["time"] < 3600):
        return jsonify(CACHE["stocks"][code]["data"])

    try:
        time.sleep(random.uniform(0.5, 1.2))  # 模拟人类阅读延迟
        url = f"http://fundf10.eastmoney.com/cczc_{code}.html"
        resp = requests.get(url, headers=get_headers(), timeout=5)
        resp.encoding = 'utf-8'
        html = resp.text

        names = re.findall(r'<a href="http://quote.*?">(.*?)</a>', html)
        rates = re.findall(r'<td class="alignRight">(\d+\.\d+)%</td>', html)

        data = [{"name": names[i], "rate": rates[i]} for i in range(min(10, len(names)))]
        if data:
            CACHE["stocks"][code] = {"data": data, "time": now}
            return jsonify(data)
    except:
        pass
    return jsonify([])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
