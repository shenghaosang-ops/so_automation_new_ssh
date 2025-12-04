const nodemailer = require('nodemailer');

/**
 * Email Service using BPA SMTP Configuration
 */
class EmailService {
    constructor(config) {
        this.config = config;
        this.transporter = null;
        this.initTransporter();
    }

    /**
     * Initialize nodemailer transporter with BPA SMTP settings
     */
    initTransporter() {
        const timeout = Number(process.env.EMAIL_TIMEOUT || this.config.timeout || 30000);
        const secure = this.config.secure === true || this.config.port === 465;
        this.transporter = nodemailer.createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: secure,
            auth: (this.config.user && this.config.password) ? { user: this.config.user, pass: this.config.password } : undefined,
            tls: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            },
            requireTLS: secure ? false : true,
            connectionTimeout: timeout,
            greetingTimeout: Math.min(timeout, 20000),
            socketTimeout: timeout
        });

        console.log('✅ BPA SMTP Transporter initialized:', {
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            secure: secure,
            timeout
        });
    }

    /**
     * Verify SMTP connection
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP connection verified successfully');
            return { success: true, message: 'SMTP server is ready' };
        } catch (error) {
            console.error('❌ SMTP connection verification failed:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Send email via BPA SMTP
     * @param {Object} emailData - Email data
     * @returns {Promise<Object>} Send result
     */
    async sendEmail(emailData) {
        const { to, cc, subject, text, html } = emailData;

        // Validate required fields
        if (!to || to.length === 0) {
            throw new Error('At least one recipient is required');
        }

        if (!subject) {
            throw new Error('Email subject is required');
        }

        if (!text && !html) {
            throw new Error('Email content (text or html) is required');
        }

        // Prepare mail options
        const mailOptions = {
            from: `"SAP销售订单自动化" <${this.config.from}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: text || this.stripHtml(html),
            html: html || text.replace(/\n/g, '<br>'),
            priority: 'normal'
        };

        // Add CC if provided
        if (cc && cc.length > 0) {
            mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
        }

        try {
            console.log('📧 Sending email via BPA SMTP...', {
                to: mailOptions.to,
                cc: mailOptions.cc,
                subject: mailOptions.subject
            });

            const info = await this.transporter.sendMail(mailOptions);

            console.log('✅ Email sent successfully:', {
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted,
                rejected: info.rejected
            });

            return {
                success: true,
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted,
                rejected: info.rejected,
                sentAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw error;
        }
    }

    /**
     * Strip HTML tags from content
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    }

    /**
     * Validate email address format
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate multiple email addresses
     */
    static validateEmails(emails) {
        const emailArray = Array.isArray(emails) 
            ? emails 
            : emails.split(/[,;]/).map(e => e.trim()).filter(e => e);

        const valid = [];
        const invalid = [];

        emailArray.forEach(email => {
            if (EmailService.validateEmail(email)) {
                valid.push(email);
            } else {
                invalid.push(email);
            }
        });

        return {
            valid,
            invalid,
            isValid: invalid.length === 0 && valid.length > 0
        };
    }
}

module.exports = EmailService;
