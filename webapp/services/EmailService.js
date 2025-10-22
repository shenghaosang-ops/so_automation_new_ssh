/**
 * Email Service
 * Handles email notification sending
 */
sap.ui.define([], function() {
    "use strict";

    var EmailService = {
        _controller: null,

        /**
         * Initialize service
         */
        init: function(oController) {
            this._controller = oController;
        },

        /**
         * Send email with SO upload results
         * @param {Object} oEmailData - Email configuration and data
         * @returns {Promise} Promise with send result
         */
        sendEmail: function(oEmailData) {
            return new Promise(function(resolve, reject) {
                // Validate email data
                if (!oEmailData.recipients || oEmailData.recipients.trim() === "") {
                    reject({
                        message: "Recipients are required"
                    });
                    return;
                }

                // Simulate email sending via backend API
                setTimeout(function() {
                    try {
                        // Parse recipients
                        var aRecipients = oEmailData.recipients.split(";").map(function(s) {
                            return s.trim();
                        }).filter(function(s) {
                            return s !== "";
                        });

                        // Validate email format (basic)
                        var bValidEmails = aRecipients.every(function(sEmail) {
                            return sEmail.includes("@") && sEmail.includes(".");
                        });

                        if (!bValidEmails) {
                            reject({
                                message: "Invalid email address format"
                            });
                            return;
                        }

                        // Simulate successful send
                        var oResult = {
                            status: "sent",
                            recipientCount: aRecipients.length,
                            sentAt: new Date().toISOString(),
                            messageId: "MSG-" + Date.now(),
                            attachments: oEmailData.attachExcel ? 1 : 0
                        };

                        resolve(oResult);
                    } catch (error) {
                        reject({
                            message: "Failed to send email: " + error.message
                        });
                    }
                }, 2000); // Simulate sending delay
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
