/**
 * Email Service
 * Handles email notification sending via SAP Build Process Automation (BPA) SMTP
 * Integrated with BPA destination configuration
 */
sap.ui.define([], function() {
    "use strict";

    var EmailService = {
        _controller: null,

        /**
         * BPA SMTP Email Configuration
         * Based on SAP Process Automation destination: sap_process_automation_mail
         */
        bpaEmailConfig: {
            destinationName: "sap_process_automation_mail",
            host: "smtp.qq.com",
            port: 587,
            secure: false, // false for STARTTLS
            auth: {
                user: "867749660@qq.com",
                // Password should be securely stored in BPA destination
            },
            from: "867749660@qq.com",
            starttls: {
                enable: true,
                required: true
            },
            ssl: {
                checkServerIdentity: false,
                trust: "*",
                enable: false
            },
            transportProtocol: "smtp"
        },

        /**
         * Initialize service
         */
        init: function(oController) {
            this._controller = oController;
        },

        /**
         * Send email with SO upload results via BPA SMTP (Backend API)
         * @param {Object} oEmailData - Email configuration and data
         * @param {String} oEmailData.recipients - Email recipients (comma or semicolon separated)
         * @param {String} oEmailData.cc - CC recipients (optional)
         * @param {String} oEmailData.subject - Email subject
         * @param {String} oEmailData.content - Email content
         * @returns {Promise} Promise with send result
         */
        sendEmail: function(oEmailData) {
            return new Promise(function(resolve, reject) {
                // Validate email data
                if (!oEmailData.recipients || oEmailData.recipients.trim() === "") {
                    reject({
                        message: "收件人不能为空"
                    });
                    return;
                }

                if (!oEmailData.subject || oEmailData.subject.trim() === "") {
                    reject({
                        message: "邮件主题不能为空"
                    });
                    return;
                }

                // Parse recipients (support both comma and semicolon)
                var aRecipients = oEmailData.recipients
                    .split(/[;,]/)
                    .map(function(s) { return s.trim(); })
                    .filter(function(s) { return s !== ""; });

                // Parse CC recipients if provided
                var aCCRecipients = [];
                if (oEmailData.cc) {
                    aCCRecipients = oEmailData.cc
                        .split(/[;,]/)
                        .map(function(s) { return s.trim(); })
                        .filter(function(s) { return s !== ""; });
                }

                // Prepare payload for backend API
                var oPayload = {
                    to: aRecipients,
                    cc: aCCRecipients.length > 0 ? aCCRecipients : undefined,
                    subject: oEmailData.subject,
                    text: oEmailData.content,
                    html: oEmailData.content.replace(/\n/g, '<br>')
                };

                // Log request (for debugging)
                console.log("发送邮件请求到后端API:", {
                    to: oPayload.to,
                    cc: oPayload.cc,
                    subject: oPayload.subject,
                    apiUrl: 'http://localhost:3000/api/email/send'
                });

                // Call backend API
                fetch('http://localhost:3000/api/email/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(oPayload)
                })
                .then(function(response) {
                    if (!response.ok) {
                        return response.json().then(function(error) {
                            throw new Error(error.error || '邮件发送失败');
                        });
                    }
                    return response.json();
                })
                .then(function(result) {
                    if (result.success) {
                        console.log("邮件发送成功:", result.data);
                        resolve({
                            success: true,
                            message: result.message,
                            messageId: result.data.messageId,
                            recipientCount: result.data.recipientCount,
                            ccCount: result.data.ccCount,
                            sentAt: result.data.sentAt,
                            smtpServer: result.data.smtpServer,
                            from: EmailService.bpaEmailConfig.from
                        });
                    } else {
                        reject({
                            message: result.error || "邮件发送失败"
                        });
                    }
                })
                .catch(function(error) {
                    console.error("邮件发送失败:", error);
                    reject({
                        message: error.message || "无法连接到邮件服务器"
                    });
                });
            });
        },

        /**
         * Validate email configuration
         */
        validateEmailConfig: function(oConfig) {
            var aErrors = [];

            if (!oConfig.recipients) {
                aErrors.push("Recipients are required");
            }

            if (!oConfig.subject) {
                aErrors.push("Subject is required");
            }

            if (!oConfig.message) {
                aErrors.push("Message body is required");
            }

            return {
                valid: aErrors.length === 0,
                errors: aErrors
            };
        },

        /**
         * Generate email template
         */
        generateTemplate: function(sType, oData) {
            var sTemplate = "";

            switch (sType) {
                case "success":
                    sTemplate = "Dear Team,\n\n" +
                        "The Sales Order upload has been completed successfully.\n\n" +
                        "Summary:\n" +
                        "- Total Records: " + (oData.totalCount || 0) + "\n" +
                        "- Successful: " + (oData.successCount || 0) + "\n\n" +
                        "Thank you.";
                    break;

                case "failure":
                    sTemplate = "Dear Team,\n\n" +
                        "The Sales Order upload encountered some issues.\n\n" +
                        "Summary:\n" +
                        "- Total Records: " + (oData.totalCount || 0) + "\n" +
                        "- Failed: " + (oData.failedCount || 0) + "\n\n" +
                        "Please review the details and take necessary action.\n\n" +
                        "Thank you.";
                    break;

                case "both":
                    sTemplate = "Dear Team,\n\n" +
                        "The Sales Order upload has been completed.\n\n" +
                        "Summary:\n" +
                        "- Total Records: " + (oData.totalCount || 0) + "\n" +
                        "- Successful: " + (oData.successCount || 0) + "\n" +
                        "- Failed: " + (oData.failedCount || 0) + "\n\n" +
                        "Please review the attached details.\n\n" +
                        "Thank you.";
                    break;

                default:
                    sTemplate = "Sales Order Processing Results";
            }

            return sTemplate;
        },

        /**
         * Format email data as HTML table
         */
        formatAsHTMLTable: function(aData) {
            var sHTML = "<table border='1' cellpadding='5' cellspacing='0'>" +
                "<thead><tr>" +
                "<th>Row #</th>" +
                "<th>Status</th>" +
                "<th>PO Number</th>" +
                "<th>SO Number</th>" +
                "<th>Message</th>" +
                "</tr></thead><tbody>";

            aData.forEach(function(oItem) {
                sHTML += "<tr>" +
                    "<td>" + oItem.rowIndex + "</td>" +
                    "<td>" + oItem.status + "</td>" +
                    "<td>" + (oItem.poNumber || "") + "</td>" +
                    "<td>" + (oItem.soNumber || "N/A") + "</td>" +
                    "<td>" + (oItem.message || "") + "</td>" +
                    "</tr>";
            });

            sHTML += "</tbody></table>";
            return sHTML;
        }
    };

    return EmailService;
});
