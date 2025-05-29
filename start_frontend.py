#!/usr/bin/env python3
"""
前端服务启动脚本
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

# 配置
PORT = 3000
FRONTEND_DIR = Path(__file__).parent

# 自定义处理器，设置正确的MIME类型
class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)
    
    def end_headers(self):
        # 设置CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def start_frontend():
    """启动前端服务"""
    print(f"🌐 启动前端服务...")
    print(f"📁 静态文件目录: {FRONTEND_DIR}")
    print(f"🔗 访问地址: http://localhost:{PORT}")
    
    # 检查前端文件是否存在
    index_file = FRONTEND_DIR / "index.html"
    if not index_file.exists():
        print(f"❌ 错误: 找不到前端文件 {index_file}")
        return
    
    try:
        # 创建服务器
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"✅ 前端服务启动成功，监听端口 {PORT}")
            
            # 自动打开浏览器
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("🚀 浏览器已自动打开")
            except Exception as e:
                print(f"⚠️  无法自动打开浏览器: {e}")
                print(f"请手动访问: http://localhost:{PORT}")
            
            print("按 Ctrl+C 停止服务")
            httpd.serve_forever()
            
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ 错误: 端口 {PORT} 已被占用")
            print("请关闭其他使用该端口的程序，或修改 PORT 变量")
        else:
            print(f"❌ 启动失败: {e}")
    except KeyboardInterrupt:
        print("\n👋 前端服务已停止")

if __name__ == "__main__":
    start_frontend() 
