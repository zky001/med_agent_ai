#!/usr/bin/env python3
"""
一键启动医学AI Agent系统
同时启动后端API和前端服务
"""

import subprocess
import sys
import time
import threading
import os
from pathlib import Path

def start_backend():
    """启动后端服务"""
    print("🚀 启动后端API服务...")
    try:
        subprocess.run([sys.executable, "start_simple.py"], 
                      cwd=Path(__file__).parent, check=True)
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")

def start_frontend():
    """启动前端服务"""
    print("🌐 启动前端服务...")
    time.sleep(2)  # 等待后端启动
    try:
        subprocess.run([sys.executable, "start_frontend.py"], 
                      cwd=Path(__file__).parent, check=True)
    except Exception as e:
        print(f"❌ 前端服务启动失败: {e}")

def main():
    """主函数"""
    print("🔬 医学AI Agent - 一键启动")
    print("=" * 50)
    print("📋 启动计划:")
    print("  1. 后端API服务 (端口 8000)")
    print("  2. 前端Web服务 (端口 3000)")
    print("  3. 自动打开浏览器")
    print()
    
    try:
        # 在新线程中启动后端
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()
        
        # 等待一会儿再启动前端
        time.sleep(3)
        
        # 启动前端
        start_frontend()
        
    except KeyboardInterrupt:
        print("\n👋 系统启动已取消")
    except Exception as e:
        print(f"❌ 启动失败: {e}")

if __name__ == "__main__":
    main() 
