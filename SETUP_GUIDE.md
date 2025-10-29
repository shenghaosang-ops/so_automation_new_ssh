# 📖 详细安装使用指南

## 🎯 适用人群
- SAP 开发人员
- UI5 开发人员  
- 销售订单处理人员
- 自动化流程设计师

## 📋 系统要求

### 最低系统要求
- **操作系统**: Windows 10/11, macOS, Linux
- **内存**: 4GB RAM (推荐 8GB)
- **存储空间**: 1GB 可用空间
- **网络**: 稳定的互联网连接

### 软件要求
- **Node.js**: v16.x 或更高版本 (推荐 LTS)
- **npm**: v8.x 或更高版本
- **浏览器**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## 🔧 详细安装步骤

### Step 1: 安装 Node.js

#### Windows 用户:
1. 访问 [Node.js 官网](https://nodejs.org)
2. 下载 LTS 版本
3. 运行安装程序，按照向导安装
4. 打开命令提示符，验证安装：
   ```cmd
   node --version
   npm --version
   ```

#### macOS 用户:
```bash
# 使用 Homebrew 安装
brew install node

# 或者从官网下载 .pkg 文件安装
```

#### Linux 用户:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### Step 2: 获取源代码

#### 方法 1: 使用 Git (推荐)
```bash
# 克隆仓库
git clone https://github.com/shenghaosang-ops/so_automation_new_ssh.git

# 进入项目目录
cd so_automation_new_ssh

# 切换到 new 分支 (最新功能)
git checkout new
```

#### 方法 2: 下载 ZIP 文件
1. 访问 [GitHub 仓库](https://github.com/shenghaosang-ops/so_automation_new_ssh)
2. 点击绿色的 "Code" 按钮
3. 选择 "Download ZIP"
4. 解压到您想要的目录

### Step 3: 安装项目依赖

```bash
# 在项目根目录执行
npm install

# 如果遇到权限问题 (Windows)
npm install --no-optional

# 如果下载速度慢，可以使用国内镜像
npm install --registry https://registry.npmmirror.com
```

### Step 4: 启动应用

```bash
# 启动开发服务器
npm run start-noflp

# 等待编译完成，看到以下信息表示成功:
# Server started
# URL: http://localhost:8080
```

## 🌐 访问应用

### 本地访问
- 主页面: http://localhost:8080
- 直接访问: http://localhost:8080/index.html
- 测试页面: http://localhost:8080/test/unit/unitTests.qunit.html

### 首次使用
1. 打开浏览器访问 http://localhost:8080
2. 您会看到 "Welcome to SO Automation Suite" 页面
3. 点击任意 "Start Me..." 按钮开始使用

## 🔍 功能使用说明

### 🏠 首页 (Home)
- **功能**: 应用入口，展示完整工作流程
- **操作**: 点击四个模块中的任一 "Start Me..." 按钮

### 📊 数据获取 (Data Acquisition)
- **功能**: 数据源选择和配置
- **支持格式**: 
  - 结构化数据: 网页抓取
  - 非结构化数据: PDF 文档上传
- **操作**: 
  1. 选择数据类型
  2. 配置相关参数
  3. 点击 "Next to SO Processing"

### ⚡ SO 自动化 (SO Automation)  
- **功能**: Excel 文件上传和 AI 处理
- **支持格式**: .xlsx 文件
- **操作**:
  1. 选择 Excel 文件
  2. 点击 "Extract Excel File"
  3. 选择客户和批次大小
  4. 点击 "Start AI Automation"
  5. 查看处理结果

### ☁️ SO 上传 (SO Upload)
- **功能**: 数据验证和 ERP 系统上传
- **操作**:
  1. 检查数据字段
  2. 点击 "Check Data"
  3. 点击 "Execute Upload"
  4. 查看上传状态

### 📧 邮件通知 (Email Notification)
- **功能**: 结果邮件配置和发送
- **操作**:
  1. 选择邮件类型 (成功/失败)
  2. 配置邮件内容
  3. 查看数据状态表格
  4. 点击 "Send Email"

## ⚠️ 常见问题解决

### 问题 1: npm install 失败
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

### 问题 2: 端口 8080 被占用
```bash
# Windows 查找占用进程
netstat -ano | findstr :8080
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -ti:8080 | xargs kill
```

### 问题 3: 浏览器兼容性问题
- 确保使用现代浏览器 (Chrome 80+, Firefox 75+)
- 清除浏览器缓存
- 禁用广告拦截器

### 问题 4: 文件上传失败
- 检查文件格式 (仅支持 .xlsx)
- 确保文件大小不超过限制
- 检查文件是否损坏

## 🔧 开发环境配置

### 推荐 IDE
- **SAP Business Application Studio** (在线)
- **VS Code** + SAP Fiori Tools 扩展
- **WebStorm** + UI5 插件

### 有用的 VS Code 扩展
```json
{
  "recommendations": [
    "SAPOSS.sap-fiori-tools-extension-pack",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ]
}
```

## 📊 性能优化建议

### 开发环境
- 使用 SSD 硬盘
- 至少 8GB RAM
- 关闭不必要的后台程序

### 网络优化
```bash
# 使用淘宝镜像加速 npm
npm config set registry https://registry.npmmirror.com

# 或使用 yarn (可选)
npm install -g yarn
yarn install
yarn start
```

## 📝 自定义配置

### 修改端口
编辑 `package.json`:
```json
{
  "scripts": {
    "start-noflp": "fiori run --open \"/index.html?sap-ui-xx-viewCache=false\" --port 3000"
  }
}
```

### 添加新页面
1. 在 `webapp/view/` 创建新的 `.view.xml`
2. 在 `webapp/controller/` 创建对应的 `.controller.js`
3. 在 `manifest.json` 中添加路由配置

## 🚀 部署到生产环境

### 构建生产版本
```bash
npm run build
```

### 部署选项
1. **SAP ABAP 系统**: 使用 SAP Fiori Tools
2. **云平台**: SAP BTP, AWS, Azure
3. **传统服务器**: Nginx, Apache

## 📞 技术支持

### 获取帮助
1. 查看 [GitHub Issues](https://github.com/shenghaosang-ops/so_automation_new_ssh/issues)
2. 参考 [SAP UI5 文档](https://ui5.sap.com/sdk/)
3. 社区论坛: [SAP Community](https://community.sap.com)

### 报告问题
创建 Issue 时请提供:
- 操作系统和版本
- Node.js 和 npm 版本
- 详细的错误信息
- 重现步骤

---

**需要更多帮助？欢迎提交 Issue 或联系开发团队！**