# 1. 基础镜像：官方多架构python3.10-slim，原生支持amd64/arm64/v8
FROM python:3.10-slim

# 2. 设置工作目录
WORKDIR /app

# ========== 新增：ARM环境核心适配 - 安装系统依赖 ==========
# 适配ARM64的编译/运行依赖，debian-slim镜像需先更新apt源
# 安装后清理apt缓存，避免镜像体积膨胀
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. 复制依赖文件
COPY requirements.txt .

# 4. 升级pip+安装依赖（国内清华镜像+无缓存，ARM环境同样适用）
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 5. 复制项目文件
COPY . .

# 6. 暴露端口
EXPOSE 7861

# 7. 启动命令：推荐用gunicorn（兼容你指定的24.1.1），比python app.py更稳定
# 若坚持用原命令，可保留：CMD ["python", "app.py", "--host", "0.0.0.0"]
# gunicorn参数说明：绑定0.0.0.0:5000，工作进程数4，适配多核心ARM/AMD服务器
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
