require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const EmailService = require('./services/emailService');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Initialize Email Service with BPA SMTP configuration
const emailConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM
};

const emailService = new EmailService(emailConfig);
app.set('emailService', emailService);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'SAP SO Automation Email Server',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/email', emailRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SAP SO Automation Email Server');
    console.log('='.repeat(60));
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 SMTP Host: ${emailConfig.host}:${emailConfig.port}`);
    console.log(`👤 SMTP User: ${emailConfig.user}`);
    console.log('='.repeat(60) + '\n');

    const skipVerify = process.env.SKIP_SMTP_VERIFY === 'true';
    if (skipVerify) {
        console.log('⏭ Skipping SMTP verification (SKIP_SMTP_VERIFY=true)\n');
    } else {
        try {
            const verification = await emailService.verifyConnection();
            if (verification.success) {
                console.log('✅ SMTP connection ready\n');
            } else {
                console.log('⚠️  SMTP connection verification failed:', verification.message);
                console.log('   Please check your .env configuration (set SKIP_SMTP_VERIFY=true to bypass)\n');
            }
        } catch (error) {
            console.error('❌ SMTP connection error:', error.message);
            console.log('   Server will continue but email sending may not work (use SKIP_SMTP_VERIFY=true to bypass)\n');
        }
    }

    console.log('📌 Available endpoints:');
    console.log('   GET  /health              - Health check');
    console.log('   GET  /api/email/verify    - Verify SMTP connection');
    console.log('   GET  /api/email/config    - Get email configuration');
    console.log('   POST /api/email/send      - Send email');
    console.log('   POST /api/email/validate  - Validate email addresses');
    console.log(`\n⚙️  Runtime Flags: SKIP_SMTP_VERIFY=${skipVerify}, EMAIL_TIMEOUT=${process.env.EMAIL_TIMEOUT || 'default'}`);
    console.log('\n' + '='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n📴 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📴 SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
