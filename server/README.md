# SAP SO Automation - Email Server

Backend API server for SAP Sales Order Automation with BPA SMTP integration.

## Features

- ✅ BPA SMTP Email Sending (QQ Mail)
- ✅ STARTTLS Support
- ✅ Multiple Recipients & CC
- ✅ Email Validation
- ✅ Connection Verification
- ✅ Error Handling
- ✅ CORS Support

## Prerequisites

- Node.js 14.x or higher
- npm or yarn
- QQ Email account with SMTP authorization code

## Installation

1. Navigate to server directory:
```powershell
cd server
```

2. Install dependencies:
```powershell
npm install
```

3. Create `.env` file:
```powershell
Copy-Item .env.example .env
```

4. Edit `.env` and configure your settings:
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=867749660@qq.com
SMTP_PASSWORD=your_authorization_code_here
SMTP_FROM=867749660@qq.com
SKIP_SMTP_VERIFY=true        # Dev: skip slow connection verify
EMAIL_TIMEOUT=8000           # Dev: shorter SMTP timeouts (ms)

PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:4004
```

## Getting QQ Email Authorization Code

1. Login to QQ Mail: https://mail.qq.com
2. Go to Settings → Accounts
3. Find "POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV Service"
4. Enable SMTP service
5. Generate authorization code (授权码)
6. Copy the authorization code to `.env` file as `SMTP_PASSWORD`

⚠️ **Important**: Use authorization code, NOT your QQ password!

## Running the Server

### Development mode (with auto-reload):
```powershell
npm run dev
```

### Production mode:
```powershell
npm start
```

The server will start on `http://localhost:3000`

### Environment Flags

| Variable | Purpose | Recommended (Dev) | Production |
|----------|---------|-------------------|------------|
| `SKIP_SMTP_VERIFY` | Skip startup `verify()` to speed boot | `true` | `false` |
| `EMAIL_TIMEOUT` | Socket & connection timeout (ms) | `8000` | `30000` or higher |

If you see long waits on `npm run dev`, enable `SKIP_SMTP_VERIFY=true` and reduce `EMAIL_TIMEOUT`.

## API Endpoints

### 1. Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T10:00:00.000Z",
  "service": "SAP SO Automation Email Server",
  "version": "1.0.0"
}
```

### 2. Verify SMTP Connection
```
GET /api/email/verify
```

Response:
```json
{
  "success": true,
  "message": "SMTP连接验证成功",
  "data": {
    "host": "smtp.qq.com",
    "port": "587",
    "user": "867749660@qq.com",
    "status": "connected"
  }
}
```

### 3. Send Email
```
POST /api/email/send
Content-Type: application/json

{
  "to": ["recipient1@example.com", "recipient2@example.com"],
  "cc": ["cc@example.com"],
  "subject": "销售订单上传结果",
  "text": "纯文本内容",
  "html": "<p>HTML内容</p>"
}
```

Response (Success):
```json
{
  "success": true,
  "message": "邮件发送成功",
  "data": {
    "messageId": "<message-id@smtp.qq.com>",
    "recipientCount": 2,
    "ccCount": 1,
    "sentAt": "2025-12-01T10:00:00.000Z",
    "smtpServer": "smtp.qq.com"
  }
}
```

Response (Error):
```json
{
  "success": false,
  "error": "邮件发送失败",
  "code": "SEND_ERROR",
  "details": "Error details here"
}
```

### 4. Validate Email Addresses
```
POST /api/email/validate
Content-Type: application/json

{
  "emails": "user1@example.com, user2@example.com, invalid-email"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": ["user1@example.com", "user2@example.com"],
    "invalid": ["invalid-email"],
    "isValid": false
  }
}
```

### 5. Get Email Configuration
```
GET /api/email/config
```

Response:
```json
{
  "success": true,
  "data": {
    "host": "smtp.qq.com",
    "port": "587",
    "secure": false,
    "from": "867749660@qq.com",
    "maxRecipients": 10
  }
}
```

## Integration with Frontend

Update `webapp/services/EmailService.js` to call the backend API:

```javascript
sendEmail: function(oEmailData) {
    return new Promise(function(resolve, reject) {
        // Call backend API
        fetch('http://localhost:3000/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: oEmailData.recipients.split(/[;,]/).map(e => e.trim()),
                cc: oEmailData.cc ? oEmailData.cc.split(/[;,]/).map(e => e.trim()) : [],
                subject: oEmailData.subject,
                text: oEmailData.content,
                html: oEmailData.content.replace(/\n/g, '<br>')
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                resolve({
                    success: true,
                    message: result.message,
                    messageId: result.data.messageId,
                    recipientCount: result.data.recipientCount,
                    sentAt: result.data.sentAt,
                    smtpServer: result.data.smtpServer
                });
            } else {
                reject(new Error(result.error));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}
```

## Testing

### Test SMTP Connection:
```powershell
curl http://localhost:3000/api/email/verify
```

### Test Email Sending:
```powershell
curl -X POST http://localhost:3000/api/email/send `
  -H "Content-Type: application/json" `
  -d '{
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "text": "This is a test email from SAP SO Automation"
  }'
```

### Test with Postman:
1. Import the API endpoints
2. Set base URL to `http://localhost:3000`
3. Test each endpoint

## Project Structure

```
server/
├── server.js              # Main server file
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── .env                  # Environment variables (create this)
├── services/
│   └── emailService.js   # Email service with BPA SMTP
└── routes/
    └── email.js          # Email API routes
```

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `MISSING_RECIPIENT` | No recipient provided | Add at least one recipient |
| `MISSING_SUBJECT` | No subject provided | Add email subject |
| `MISSING_CONTENT` | No content provided | Add email text or HTML content |
| `INVALID_EMAIL` | Invalid email format | Check email address format |
| `EAUTH` | SMTP authentication failed | Verify authorization code |
| `ECONNECTION` | Cannot connect to SMTP | Check network/firewall |
| `ETIMEDOUT` | Connection timeout | Check SMTP server availability |

## Troubleshooting

### SMTP Authentication Failed (EAUTH)
- Verify you're using QQ authorization code, not password
- Check if SMTP service is enabled in QQ Mail settings
- Regenerate authorization code if needed

### Connection Timeout
- Check firewall settings
- Verify port 587 is not blocked
- Check network connectivity
- Reduce `EMAIL_TIMEOUT` to 8000 for quicker fail
- Use `SKIP_SMTP_VERIFY=true` in development

### STARTTLS Error
- Ensure `SMTP_SECURE=false` in `.env`
- Verify `SMTP_PORT=587` (not 465)

## Security Notes

⚠️ **Important Security Practices:**

1. Never commit `.env` file to git
2. Use strong authorization codes
3. Limit ALLOWED_ORIGINS in production
4. Enable HTTPS in production
5. Implement rate limiting for production
6. Monitor email sending logs

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use environment variables instead of `.env` file
3. Enable HTTPS
4. Add rate limiting middleware
5. Set up logging (Winston, Morgan)
6. Use PM2 for process management:

```powershell
npm install -g pm2
pm2 start server.js --name "email-server"
pm2 save
pm2 startup
```

## Support

For issues or questions:
- Check server logs
- Verify `.env` configuration
- Test SMTP connection with `/api/email/verify`
- Review QQ Mail SMTP settings

## License

MIT
