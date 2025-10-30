sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../services/EmailService"
], function(Controller, History, JSONModel, MessageToast, MessageBox, EmailService) {
    "use strict";

    return Controller.extend("yegeoaiso.controller.EmailNotification", {
        
        onInit: function() {
            // Initialize Email model
            var oEmailModel = new JSONModel({
                recipients: "",
                cc: "",
                subject: "SO Upload Results - " + new Date().toLocaleDateString(),
                emailData: [],
                totalCount: 0,
                successCount: 0,
                failedCount: 0,
                emailContent: "",
                emailContentType: "",
                sendInProgress: false,
                sendProgress: 0,
                sendResult: "",
                sendResultMessage: "",
                sendResultType: "Information"
            });
            this.getView().setModel(oEmailModel, "email");

            // Get router and attach route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("EmailNotification").attachPatternMatched(this._onRouteMatched, this);

            // Initialize service
            EmailService.init(this);
        },

        /**
         * Handle route matched - load data from previous page
         */
        _onRouteMatched: function() {
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (oGlobalModel) {
                var aUploadResults = oGlobalModel.getProperty("/uploadResults");
                if (aUploadResults && aUploadResults.length > 0) {
                    this._loadEmailData(aUploadResults);
                    this._generateSmartEmailContent();
                }
            }
        },

        /**
         * Load email data with status column
         */
        _loadEmailData: function(aResults) {
            var oModel = this.getView().getModel("email");
            var iSuccess = 0;
            var iFailure = 0;

            // Enhance data with status information
            var aEmailData = aResults.map(function(oResult) {
                if (oResult.status === "Success") {
                    iSuccess++;
                } else {
                    iFailure++;
                }
                return {
                    rowIndex: oResult.rowIndex,
                    status: oResult.status,
                    poNumber: oResult.poNumber,
                    soNumber: oResult.soNumber || "N/A",
                    customerCode: oResult.customerCode || "",
                    partNo: oResult.partNo || "",
                    quantity: oResult.quantity || "",
                    requestDate: oResult.requestDate || "",
                    message: oResult.message
                };
            });

            oModel.setProperty("/emailData", aEmailData);
            oModel.setProperty("/totalCount", aResults.length);
            oModel.setProperty("/successCount", iSuccess);
            oModel.setProperty("/failedCount", iFailure);
        },

        /**
         * Generate smart email content based on upload results
         */
        _generateSmartEmailContent: function() {
            var oModel = this.getView().getModel("email");
            var iTotal = oModel.getProperty("/totalCount");
            var iSuccess = oModel.getProperty("/successCount");
            var iFailed = oModel.getProperty("/failedCount");
            var aEmailData = oModel.getProperty("/emailData");
            
            var sContent = "";
            var sContentType = "";
            
            // Scenario 1: All Success
            if (iSuccess === iTotal && iTotal > 0) {
                sContentType = "✅ All Success";
                sContent = "Dear Team,\n\n";
                sContent += "🎉 Congratulations! All sales orders have been uploaded successfully!\n\n";
                sContent += "═══════════════════════════════════════\n";
                sContent += "📊 Summary:\n";
                sContent += "───────────────────────────────────────\n";
                sContent += "Total Records Processed: " + iTotal + "\n";
                sContent += "Successful Uploads: " + iSuccess + " (100%)\n";
                sContent += "Failed Uploads: 0\n";
                sContent += "═══════════════════════════════════════\n\n";
                sContent += "All sales orders have been created successfully in the system.\n\n";
                sContent += "Thank you for using SO Automation Agent!\n\n";
                sContent += "Best Regards,\n";
                sContent += "SO Automation Team";
            }
            // Scenario 2: Partial Success (some failures)
            else if (iFailed > 0 && iFailed < iTotal) {
                sContentType = "⚠️ Partial Success";
                var fSuccessRate = Math.round((iSuccess / iTotal) * 100);
                sContent = "Dear Team,\n\n";
                sContent += "The sales order upload has been completed with some issues.\n\n";
                sContent += "═══════════════════════════════════════\n";
                sContent += "📊 Summary:\n";
                sContent += "───────────────────────────────────────\n";
                sContent += "Total Records Processed: " + iTotal + "\n";
                sContent += "✅ Successful Uploads: " + iSuccess + " (" + fSuccessRate + "%)\n";
                sContent += "❌ Failed Uploads: " + iFailed + " (" + (100 - fSuccessRate) + "%)\n";
                sContent += "═══════════════════════════════════════\n\n";
                
                // Add failed records details
                sContent += "❌ Failed Records Details:\n";
                sContent += "───────────────────────────────────────\n";
                var aFailedRecords = aEmailData.filter(function(oItem) {
                    return oItem.status !== "Success";
                });
                
                aFailedRecords.forEach(function(oRecord, index) {
                    sContent += "\n" + (index + 1) + ". Row #" + oRecord.rowIndex + "\n";
                    sContent += "   PO Number: " + oRecord.poNumber + "\n";
                    sContent += "   Customer: " + oRecord.customerCode + "\n";
                    sContent += "   Part No: " + oRecord.partNo + "\n";
                    sContent += "   Quantity: " + oRecord.quantity + "\n";
                    sContent += "   ⚠️ Error: " + oRecord.message + "\n";
                });
                
                sContent += "\n═══════════════════════════════════════\n\n";
                sContent += "Please review the failed records above and take necessary action.\n\n";
                sContent += "Best Regards,\n";
                sContent += "SO Automation Team";
            }
            // Scenario 3: Complete Failure
            else if (iFailed === iTotal && iTotal > 0) {
                sContentType = "❌ All Failed";
                sContent = "Dear Team,\n\n";
                sContent += "⚠️ ATTENTION: All sales orders failed to upload!\n\n";
                sContent += "═══════════════════════════════════════\n";
                sContent += "📊 Summary:\n";
                sContent += "───────────────────────────────────────\n";
                sContent += "Total Records Processed: " + iTotal + "\n";
                sContent += "Successful Uploads: 0\n";
                sContent += "❌ Failed Uploads: " + iFailed + " (100%)\n";
                sContent += "═══════════════════════════════════════\n\n";
                
                // Analyze common error patterns
                var oErrorReasons = {};
                aEmailData.forEach(function(oRecord) {
                    var sReason = oRecord.message || "Unknown Error";
                    if (!oErrorReasons[sReason]) {
                        oErrorReasons[sReason] = 0;
                    }
                    oErrorReasons[sReason]++;
                });
                
                // Check for system errors
                var bSystemError = false;
                for (var sReason in oErrorReasons) {
                    if (sReason.toLowerCase().includes("connection") || 
                        sReason.toLowerCase().includes("s4") ||
                        sReason.toLowerCase().includes("timeout") ||
                        sReason.toLowerCase().includes("network")) {
                        bSystemError = true;
                        break;
                    }
                }
                
                if (bSystemError) {
                    sContent += "🔴 System Error Detected:\n";
                    sContent += "───────────────────────────────────────\n";
                    sContent += "The upload failure appears to be caused by system connectivity issues.\n\n";
                    sContent += "Possible causes:\n";
                    sContent += "• S4/HANA system connection error\n";
                    sContent += "• Network timeout or instability\n";
                    sContent += "• Service temporarily unavailable\n";
                    sContent += "• Authentication/Authorization issues\n\n";
                    sContent += "Recommended Actions:\n";
                    sContent += "1. Verify S4/HANA system status\n";
                    sContent += "2. Check network connectivity\n";
                    sContent += "3. Retry the upload after system is stable\n";
                    sContent += "4. Contact IT support if issue persists\n\n";
                } else {
                    sContent += "📋 Common Error Reasons:\n";
                    sContent += "───────────────────────────────────────\n";
                    var iReasonIndex = 1;
                    for (var sErrorReason in oErrorReasons) {
                        sContent += iReasonIndex + ". " + sErrorReason + " (" + oErrorReasons[sErrorReason] + " occurrences)\n";
                        iReasonIndex++;
                    }
                    sContent += "\n";
                }
                
                sContent += "═══════════════════════════════════════\n\n";
                sContent += "⚠️ IMMEDIATE ACTION REQUIRED\n";
                sContent += "Please review the error details and contact the system administrator.\n\n";
                sContent += "Best Regards,\n";
                sContent += "SO Automation Team";
            }
            
            oModel.setProperty("/emailContent", sContent);
            oModel.setProperty("/emailContentType", sContentType);
        },

        /**
         * Send email
         */
        onSendEmail: function() {
            var oModel = this.getView().getModel("email");
            var sRecipients = oModel.getProperty("/recipients");
            
            if (!sRecipients) {
                MessageBox.warning("Please enter at least one recipient email address");
                return;
            }

            // Confirm send
            MessageBox.confirm(
                "Are you sure you want to send this email?",
                {
                    title: "Confirm Send",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._performSend();
                        }
                    }.bind(this)
                }
            );
        },

        /**
         * Perform email send
         */
        _performSend: function() {
            var oModel = this.getView().getModel("email");
            
            // Set sending in progress
            oModel.setProperty("/sendInProgress", true);
            oModel.setProperty("/sendProgress", 0);
            oModel.setProperty("/sendResult", "");

            // Prepare email data
            var oEmailData = {
                recipients: oModel.getProperty("/recipients"),
                cc: oModel.getProperty("/cc"),
                subject: oModel.getProperty("/subject"),
                message: oModel.getProperty("/emailContent"),
                data: oModel.getProperty("/emailData")
            };

            // Simulate progress
            var iProgress = 0;
            var oInterval = setInterval(function() {
                iProgress += 10;
                oModel.setProperty("/sendProgress", Math.min(iProgress, 90));
            }, 200);

            // Call service to send email
            EmailService.sendEmail(oEmailData).then(function(oResult) {
                clearInterval(oInterval);
                oModel.setProperty("/sendInProgress", false);
                oModel.setProperty("/sendProgress", 100);
                oModel.setProperty("/sendResult", "success");
                oModel.setProperty("/sendResultMessage", "Email sent successfully to " + oResult.recipientCount + " recipient(s)");
                oModel.setProperty("/sendResultType", "Success");
                
                MessageToast.show("Email sent successfully!");
            }.bind(this)).catch(function(oError) {
                clearInterval(oInterval);
                oModel.setProperty("/sendInProgress", false);
                oModel.setProperty("/sendResult", "error");
                oModel.setProperty("/sendResultMessage", "Failed to send email: " + oError.message);
                oModel.setProperty("/sendResultType", "Error");
                
                MessageBox.error("Failed to send email: " + oError.message);
            }.bind(this));
        },

        /**
         * Navigate to Review and Report page
         */
        onNavigateToReviewReport: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("ReviewReport");
        },

        /**
         * Navigate back
         */
        onNavBack: function() {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("SOUpload", {}, true);
            }
        }
    });
});
