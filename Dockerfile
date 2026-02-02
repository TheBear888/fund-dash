# 基础镜像：官方python3.10-slim 多架构镜像（原生支持AMD64/X86_64、ARM64/v8）
# Docker会根据构建/运行的主机架构，自动拉取对应架构的镜像层，无需手动指定
FROM python:3.10-slim

# 设置工作目录（容器内，双架构通用）
WORKDIR /app

# 安装双架构通用的系统依赖：编译依赖(gcc/libc6-dev)
# Debian/Ubuntu的ARM64/AMD64源中，这些包名/依赖完全一致，无需区分架构
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*  # 强制清理apt缓存，减少镜像体积

# 复制项目依赖文件（优先复制，利用Docker构建缓存，双架构缓存通用）
COPY requirements.txt .

# 升级pip + 安装Python依赖（国内清华镜像加速，双架构pip自动适配）
# 固化gunicorn=24.1.1（你指定的版本），无需在requirements.txt中额外添加
RUN pip install --upgrade pip --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple gunicorn==24.1.1 -r requirements.txt

# 复制整个项目文件到容器工作目录
COPY . .

# 暴露服务端口：与启动命令的7861保持统一（双架构通用）
EXPOSE 7861

# 生产环境启动命令：gunicorn（稳定的WSGI服务器，双架构兼容）
# -w 4：工作进程数（适配多核心服务器，ARM/AMD均可）
# -b 0.0.0.0:5000：绑定所有网卡+7861端口（外部可访问）
# app:app：Flask应用入口（固定格式：文件名(无py):Flask实例名）
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:7861", "app:app"]

# 【备用】若不想用gunicorn，注释上面的CMD，启用下面的原生Python启动命令（双架构通用）
# CMD ["python", "app.py", "--host", "0.0.0.0", "--port", "7861"]
