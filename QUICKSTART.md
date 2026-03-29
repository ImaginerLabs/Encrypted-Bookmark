# 🚀 快速开始

## ⚡ 5 分钟上手

### 1️⃣ 安装依赖（1 分钟）
```bash
cd /Users/alex/Desktop/Github/PrivateBookMark
npm install
```

### 2️⃣ 构建项目（30 秒）
```bash
npm run build
```

### 3️⃣ 加载到 Chrome（1 分钟）
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `/Users/alex/Desktop/Github/PrivateBookMark/dist` 目录

### 4️⃣ 测试功能（2 分钟）
1. 点击浏览器工具栏的 🔐 图标
2. 设置密码：`Test1234`
3. 点击「设置密码」
4. ✅ 看到「已解锁」界面说明成功！

## 📖 下一步

- 📄 阅读 [INSTALLATION.md](./INSTALLATION.md) 了解详细测试流程
- 💻 阅读 [DEVELOPMENT.md](./DEVELOPMENT.md) 开始开发
- 📋 查看 [TASK1_REPORT.md](./TASK1_REPORT.md) 了解完整功能

## 🔧 常用命令

```bash
# 开发模式（实时编译）
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build

# 清理重建
rm -rf dist && npm run build
```

## ❓ 遇到问题？

### 构建失败
```bash
# 清理并重装
rm -rf node_modules dist
npm install
npm run build
```

### 插件无法加载
- 确保选择的是 `dist` 目录，不是项目根目录
- 检查 Chrome 版本是否支持 Manifest V3

### 功能异常
- 按 F12 打开 DevTools 查看 Console 错误
- 访问 `chrome://extensions/` 查看插件背景页日志

## 💬 反馈

如有问题或建议，请查看项目文档或提交 Issue。

---

**祝你使用愉快！** 🎉
