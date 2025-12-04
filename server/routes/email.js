const express = require('express');
const EmailService = require('../services/emailService');

const router = express.Router();

// Get email service instance from app
const getEmailService = (req) => req.app.get('emailService');

/**
 * POST /api/email/send
 * Send email via BPA SMTP
 */
router.post('/send', async (req, res) => {
    try {
        const { to, cc, subject, text, html } = req.body;

        // Validate request body
        if (!to) {
            return res.status(400).json({
                success: false,
                error: '收件人不能为空',
                code: 'MISSING_RECIPIENT'
            });
        }

        if (!subject) {
            return res.status(400).json({
                success: false,
                error: '邮件主题不能为空',
                code: 'MISSING_SUBJECT'
            });
        }

        if (!text && !html) {
            return res.status(400).json({
                success: false,
                error: '邮件内容不能为空',
                code: 'MISSING_CONTENT'
            });
        }

        // Validate email addresses
        const toValidation = EmailService.validateEmails(to);
        if (!toValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: '收件人邮箱地址格式不正确',
                code: 'INVALID_EMAIL',
                details: {
                    invalid: toValidation.invalid
                }
            });
        }

        // Validate CC if provided
        if (cc) {
            const ccValidation = EmailService.validateEmails(cc);
            if (!ccValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: '抄送邮箱地址格式不正确',
                    code: 'INVALID_CC_EMAIL',
                    details: {
                        invalid: ccValidation.invalid
                    }
                });
            }
        }

        // Get email service
        const emailService = getEmailService(req);

        // Send email
        const result = await emailService.sendEmail({
            to: toValidation.valid,
            cc: cc ? EmailService.validateEmails(cc).valid : [],
            subject,
            text,
            html
        });

        // Return success response
        res.json({
            success: true,
            message: '邮件发送成功',
            data: {
                messageId: result.messageId,
                recipientCount: toValidation.valid.length,
                ccCount: cc ? EmailService.validateEmails(cc).valid.length : 0,
                sentAt: result.sentAt,
                smtpServer: process.env.SMTP_HOST
            }
        });

    } catch (error) {
        console.error('Email send error:', error);

        // Handle specific error types
        let errorMessage = '邮件发送失败';
        let statusCode = 500;

        if (error.code === 'EAUTH') {
            errorMessage = 'SMTP认证失败，请检查用户名和密码';
            statusCode = 401;
        } else if (error.code === 'ECONNECTION') {
            errorMessage = 'SMTP服务器连接失败';
            statusCode = 503;
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'SMTP服务器连接超时';
            statusCode = 504;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            code: error.code || 'SEND_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/email/verify
 * Verify SMTP connection
 */
router.get('/verify', async (req, res) => {
    try {
        const emailService = getEmailService(req);
        const result = await emailService.verifyConnection();

        if (result.success) {
            res.json({
                success: true,
                message: 'SMTP连接验证成功',
                data: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER,
                    status: 'connected'
                }
            });
        } else {
            res.status(503).json({
                success: false,
                error: 'SMTP连接验证失败',
                details: result.message
            });
        }
    } catch (error) {
        console.error('SMTP verification error:', error);
        res.status(500).json({
            success: false,
            error: 'SMTP验证出错',
            details: error.message
        });
    }
});

/**
 * POST /api/email/validate
 * Validate email addresses
 */
router.post('/validate', (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails) {
            return res.status(400).json({
                success: false,
                error: '请提供要验证的邮箱地址'
            });
        }

        const validation = EmailService.validateEmails(emails);

        res.json({
            success: true,
            data: validation
        });

    } catch (error) {
        console.error('Email validation error:', error);
        res.status(500).json({
            success: false,
            error: '邮箱验证出错',
            details: error.message
        });
    }
});

/**
 * GET /api/email/config
 * Get email configuration (without sensitive data)
 */
router.get('/config', (req, res) => {
    res.json({
        success: true,
        data: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM,
            maxRecipients: parseInt(process.env.MAX_RECIPIENTS) || 10
        }
    });
});

module.exports = router;
