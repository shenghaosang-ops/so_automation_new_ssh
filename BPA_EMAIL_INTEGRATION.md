# SAP BPA SMTP 邮件集成说明

## 概述

本应用已集成 SAP Build Process Automation (BPA) 的 SMTP 邮件发送功能。邮件通过 QQ 邮箱 SMTP 服务器发送。

## BPA 目标配置

### 目标名称
`sap_process_automation_mail`

### SMTP 配置参数

```json
{
  "destinationName": "sap_process_automation_mail",
  "host": "smtp.qq.com",
  "port": 587,
  "user": "867749660@qq.com",
  "from": "867749660@qq.com",
  "transportProtocol": "smtp",
  "authentication": "BasicAuthentication",
  "starttls": {
    "enable": true,
    "required": true
  },
  "ssl": {
    "enable": false,
    "checkServerIdentity": false,
    "trust": "*"
  }
}
```

## 前端集成

### EmailService.js

`webapp/services/EmailService.js` 已更新，包含：

1. **BPA 配置集成**
   - SMTP 服务器配置
   - 认证信息
   - STARTTLS 支持

2. **sendEmail 方法**
   - 支持多收件人（逗号或分号分隔）
   - 支持抄送 (CC)
   - 邮件格式验证
   - HTML 内容支持

### SOUpload Controller

`webapp/controller/SOUpload.controller.js` 已更新：

1. 引入 EmailService
2. `onSendEmail` 方法使用 EmailService 发送邮件
3. 显示发送进度和结果
4. 错误处理

## 后端 API 实现（需要实现）

### API 端点

创建一个后端 API 端点来处理实际的 SMTP 发送：

```
POST /api/email/send
```

### 请求体示例

```json
{
  "destination": "sap_process_automation_mail",
  "from": "867749660@qq.com",
  "to": ["recipient1@example.com", "recipient2@example.com"],
  "cc": ["cc@example.com"],
  "subject": "销售订单上传结果",
  "text": "纯文本内容",
  "html": "HTML格式内容<br>换行",
  "smtpConfig": {
    "host": "smtp.qq.com",
    "port": 587,
    "secure": false,
    "starttls": {
      "enable": true,
      "required": true
    }
  }
}
```

### Node.js 实现示例

```javascript
const express = require('express');
const nodemailer = require('nodemailer');

app.post('/api/email/send', async (req, res) => {
  try {
    const { from, to, cc, subject, text, html, smtpConfig } = req.body;
    
    // 从 BPA Destination 获取密码
    const password = await getBPADestinationPassword('sap_process_automation_mail');
    
    // 创建传输器
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: from,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // 发送邮件
    const info = await transporter.sendMail({
      from: from,
      to: to.join(', '),
      cc: cc ? cc.join(', ') : undefined,
      subject: subject,
      text: text,
      html: html
    });
    
    res.json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });
    
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Java 实现示例

```java
@RestController
@RequestMapping("/api/email")
public class EmailController {
    
    @PostMapping("/send")
    public ResponseEntity<EmailResponse> sendEmail(@RequestBody EmailRequest request) {
        try {
            // 从 BPA Destination 获取配置
            Properties props = new Properties();
            props.put("mail.smtp.host", request.getSmtpConfig().getHost());
            props.put("mail.smtp.port", request.getSmtpConfig().getPort());
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            
            // 创建认证器
            Authenticator auth = new Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(
                        request.getFrom(), 
                        getBPAPassword("sap_process_automation_mail")
                    );
                }
            };
            
            Session session = Session.getInstance(props, auth);
            
            // 创建消息
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(request.getFrom()));
            message.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(String.join(",", request.getTo()))
            );
            
            if (request.getCc() != null && !request.getCc().isEmpty()) {
                message.setRecipients(
                    Message.RecipientType.CC,
                    InternetAddress.parse(String.join(",", request.getCc()))
                );
            }
            
            message.setSubject(request.getSubject());
            message.setContent(request.getHtml(), "text/html; charset=utf-8");
            
            // 发送
            Transport.send(message);
            
            return ResponseEntity.ok(new EmailResponse(true, "Email sent successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new EmailResponse(false, e.getMessage()));
        }
    }
}
```

## QQ 邮箱授权码配置

### 获取授权码

1. 登录 QQ 邮箱
2. 设置 -> 账户 -> POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启 SMTP 服务
4. 生成授权码（不是QQ密码）
5. 将授权码配置到 BPA Destination 的 `mail.password` 字段

### 安全注意事项

- **不要**在前端代码中硬编码密码
- **不要**将密码提交到代码仓库
- 密码应该存储在：
  - BPA Destination 配置中
  - 后端环境变量中
  - 安全的密钥管理服务中

## 测试

### 前端测试

1. 启动应用
2. 进入"销售订单上传"页面
3. 执行上传操作
4. 在邮件通知区域填写：
   - 收件人：your-email@example.com
   - 抄送（可选）：cc@example.com
   - 主题：自动生成或自定义
5. 点击"发送邮件"按钮
6. 查看发送进度和结果

### 检查日志

浏览器控制台会显示：
```
通过BPA SMTP发送邮件: {
  destination: "sap_process_automation_mail",
  from: "867749660@qq.com",
  to: ["recipient@example.com"],
  subject: "销售订单上传结果",
  smtpHost: "smtp.qq.com",
  smtpPort: 587
}
```

## 功能特性

### 1. 多收件人支持
- 支持逗号分隔：`user1@example.com, user2@example.com`
- 支持分号分隔：`user1@example.com; user2@example.com`

### 2. 抄送 (CC) 支持
- 可选字段
- 支持多个抄送人

### 3. 邮件内容
- 纯文本格式
- HTML 格式（自动转换换行符）
- AI 生成的邮件内容
- 支持手动编辑

### 4. 进度显示
- 实时进度条
- 发送状态提示
- 成功/失败消息

### 5. 验证
- 邮件地址格式验证
- 必填字段检查
- 错误提示

## 邮件内容示例

### 成功场景
```
销售订单上传结果报告

======================

上传时间: 2025-12-01 10:30:00

总记录数: 10
成功记录数: 10 ✅
失败记录数: 0 ❌
成功率: 100%

此邮件由SAP销售订单自动化代理自动发送
通过 SAP Build Process Automation (BPA) SMTP服务
```

### 部分失败场景
```
销售订单上传结果报告

======================

上传时间: 2025-12-01 10:30:00

总记录数: 10
成功记录数: 8 ✅
失败记录数: 2 ❌
成功率: 80%

失败记录详情:
-------------------
1. 采购订单号: PO12345
   错误原因: Material not found

2. 采购订单号: PO67890
   错误原因: Invalid quantity

此邮件由SAP销售订单自动化代理自动发送
通过 SAP Build Process Automation (BPA) SMTP服务
```

## 故障排除

### 问题：邮件发送失败

**可能原因：**
1. SMTP 服务器连接失败
2. 认证失败（授权码错误）
3. 收件人地址格式错误
4. 端口被防火墙阻止

**解决方案：**
1. 检查网络连接
2. 验证 QQ 邮箱授权码是否正确
3. 确认收件人地址格式
4. 检查防火墙设置，确保 587 端口开放

### 问题：STARTTLS 错误

**解决方案：**
确保 SMTP 配置中：
```javascript
starttls: {
  enable: true,
  required: true
}
ssl: {
  enable: false  // STARTTLS 使用时应为 false
}
```

## 下一步

1. **实现后端 API**
   - 创建邮件发送端点
   - 集成 BPA Destination 服务
   - 安全存储和获取 SMTP 密码

2. **增强功能**
   - 附件支持（Excel 报告）
   - 邮件模板
   - 发送历史记录
   - 批量发送

3. **监控和日志**
   - 发送成功率统计
   - 失败原因分析
   - 邮件发送日志

## 参考文档

- [SAP Build Process Automation - Destinations](https://help.sap.com/docs/build-process-automation/sap-build-process-automation/destinations)
- [QQ邮箱SMTP设置](https://service.mail.qq.com/detail/0/310)
- [Nodemailer Documentation](https://nodemailer.com/)

---

**更新日期**: 2025-12-01  
**版本**: 1.0
