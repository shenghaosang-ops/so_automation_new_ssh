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
                resultType: "both",
                recipients: "",
                cc: "",
                subject: "SO Upload Results - " + new Date().toLocaleDateString(),
                successMessage: "Dear Team,\n\nThe Sales Order upload has been completed successfully.\n\nPlease find the details below:\n\nTotal Records Processed: {totalCount}\nSuccessful Uploads: {successCount}\n\nThank you.",
                failureMessage: "Dear Team,\n\nThe Sales Order upload encountered some issues.\n\nPlease find the details below:\n\nTotal Records Processed: {totalCount}\nFailed Uploads: {failedCount}\n\nPlease review the attached details and take necessary action.\n\nThank you.",
                attachExcel: true,
                emailData: [],
                totalCount: 0,
                successCount: 0,
                failedCount: 0,
                previewMessage: "",
                sendInProgress: false,
                sendProgress: 0,
                sendResult: "",
                sendResultMessage: "",
                sendResultType: "Information",
                // AI Analysis properties
                aiAnalyzing: false,
                aiProgress: 0,
                aiAnalysisComplete: false,
                aiAnalysis: {
                    successRate: 0,
                    successInsight: "",
                    failureInsight: "",
                    topFailureReasons: [],
                    recommendations: [],
                    qualityScore: 0,
                    qualityDescription: ""
                }
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
                    this._generatePreview();
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
         * Handle result type change
         */
        onResultTypeChange: function() {
            this._generatePreview();
        },

        /**
         * AI Analyze Data - Main Analysis Function
         */
        onAnalyzeData: function() {
            var oModel = this.getView().getModel("email");
            var aEmailData = oModel.getProperty("/emailData");
            
            if (!aEmailData || aEmailData.length === 0) {
                MessageBox.warning("No data available for analysis");
                return;
            }

            // Start AI analysis animation
            oModel.setProperty("/aiAnalyzing", true);
            oModel.setProperty("/aiProgress", 0);
            oModel.setProperty("/aiAnalysisComplete", false);
            
            // Simulate AI processing with progress
            this._runAIAnalysis(aEmailData);
        },

        /**
         * Run AI Analysis with simulation
         */
        _runAIAnalysis: function(aData) {
            var oModel = this.getView().getModel("email");
            var that = this;
            var iProgress = 0;
            
            // Simulate AI thinking process
            var oInterval = setInterval(function() {
                iProgress += 20;
                oModel.setProperty("/aiProgress", iProgress);
                
                if (iProgress >= 100) {
                    clearInterval(oInterval);
                    // Perform actual analysis
                    that._performAIAnalysis(aData);
                    oModel.setProperty("/aiAnalyzing", false);
                    oModel.setProperty("/aiAnalysisComplete", true);
                    MessageToast.show("AI Analysis Complete! ✨");
                }
            }, 300);
        },

        /**
         * Perform AI Analysis - Calculate insights
         */
        _performAIAnalysis: function(aData) {
            var oModel = this.getView().getModel("email");
            var iTotalCount = aData.length;
            var iSuccessCount = 0;
            var iFailureCount = 0;
            var oFailureReasons = {};
            
            // Analyze data
            aData.forEach(function(oItem) {
                if (oItem.status === "Success") {
                    iSuccessCount++;
                } else {
                    iFailureCount++;
                    var sReason = oItem.message || "Unknown Error";
                    if (!oFailureReasons[sReason]) {
                        oFailureReasons[sReason] = 0;
                    }
                    oFailureReasons[sReason]++;
                }
            });
            
            // Calculate success rate
            var fSuccessRate = Math.round((iSuccessCount / iTotalCount) * 100);
            
            // Generate top failure reasons
            var aTopFailureReasons = Object.keys(oFailureReasons).map(function(sReason) {
                var iCount = oFailureReasons[sReason];
                var fPercentage = Math.round((iCount / iFailureCount) * 100);
                return {
                    reason: sReason,
                    count: iCount,
                    percentage: fPercentage
                };
            }).sort(function(a, b) {
                return b.count - a.count;
            }).slice(0, 5); // Top 5 reasons
            
            // Generate AI insights
            var sSuccessInsight = this._generateSuccessInsight(fSuccessRate, iSuccessCount, iTotalCount);
            var sFailureInsight = this._generateFailureInsight(iFailureCount, iTotalCount);
            var aRecommendations = this._generateRecommendations(fSuccessRate, aTopFailureReasons);
            var oQuality = this._calculateQualityScore(fSuccessRate, aTopFailureReasons);
            
            // Update model with AI analysis results
            oModel.setProperty("/aiAnalysis", {
                successRate: fSuccessRate,
                successInsight: sSuccessInsight,
                failureInsight: sFailureInsight,
                topFailureReasons: aTopFailureReasons,
                recommendations: aRecommendations,
                qualityScore: oQuality.score,
                qualityDescription: oQuality.description
            });
        },

        /**
         * Generate success insight message
         */
        _generateSuccessInsight: function(fRate, iSuccess, iTotal) {
            if (fRate >= 95) {
                return `🎉 Excellent! ${iSuccess} out of ${iTotal} orders (${fRate}%) were created successfully. Your process is highly optimized!`;
            } else if (fRate >= 80) {
                return `✅ Good performance! ${iSuccess} out of ${iTotal} orders (${fRate}%) were created successfully. Minor improvements recommended.`;
            } else if (fRate >= 50) {
                return `⚠️ Moderate success rate. ${iSuccess} out of ${iTotal} orders (${fRate}%) were created successfully. Review failure patterns below.`;
            } else {
                return `❌ Low success rate detected. Only ${iSuccess} out of ${iTotal} orders (${fRate}%) were created successfully. Immediate attention required.`;
            }
        },

        /**
         * Generate failure insight message
         */
        _generateFailureInsight: function(iFailure, iTotal) {
            if (iFailure === 0) {
                return "";
            }
            var fFailureRate = Math.round((iFailure / iTotal) * 100);
            return `${iFailure} orders (${fFailureRate}%) failed to create. AI has identified the top failure patterns below for your review.`;
        },

        /**
         * Generate AI recommendations
         */
        _generateRecommendations: function(fSuccessRate, aFailureReasons) {
            var aRecommendations = [];
            
            if (fSuccessRate < 80) {
                aRecommendations.push({
                    title: "Data Validation Enhancement",
                    description: "Implement pre-upload validation rules to catch common errors before submission",
                    icon: "sap-icon://validate"
                });
            }
            
            if (aFailureReasons.length > 0) {
                var sTopReason = aFailureReasons[0].reason;
                if (sTopReason.includes("duplicate") || sTopReason.includes("exist")) {
                    aRecommendations.push({
                        title: "Duplicate Detection",
                        description: "Enable automatic duplicate checking before creating sales orders",
                        icon: "sap-icon://copy"
                    });
                }
                if (sTopReason.includes("material") || sTopReason.includes("part")) {
                    aRecommendations.push({
                        title: "Material Master Sync",
                        description: "Verify material codes against the latest master data before processing",
                        icon: "sap-icon://product"
                    });
                }
                if (sTopReason.includes("date") || sTopReason.includes("time")) {
                    aRecommendations.push({
                        title: "Date Format Standardization",
                        description: "Standardize date formats in source data to prevent parsing errors",
                        icon: "sap-icon://calendar"
                    });
                }
            }
            
            aRecommendations.push({
                title: "Automated Retry Logic",
                description: "Implement smart retry mechanism for transient failures to improve success rate",
                icon: "sap-icon://refresh"
            });
            
            aRecommendations.push({
                title: "Real-time Monitoring Dashboard",
                description: "Set up monitoring alerts for immediate notification of high failure rates",
                icon: "sap-icon://monitor-payments"
            });
            
            return aRecommendations;
        },

        /**
         * Calculate data quality score
         */
        _calculateQualityScore: function(fSuccessRate, aFailureReasons) {
            var iScore = fSuccessRate;
            var sDescription = "";
            
            // Adjust score based on failure diversity
            if (aFailureReasons.length > 5) {
                iScore -= 5; // Many different failure types indicate data quality issues
            }
            
            if (iScore >= 90) {
                sDescription = "Excellent - Your data quality is outstanding with minimal errors";
            } else if (iScore >= 75) {
                sDescription = "Good - Data quality is acceptable with room for improvement";
            } else if (iScore >= 50) {
                sDescription = "Fair - Data quality needs attention to reduce failure rate";
            } else {
                sDescription = "Poor - Critical data quality issues detected, immediate action needed";
            }
            
            return {
                score: Math.max(0, Math.min(100, iScore)),
                description: sDescription
            };
        },

        /**
         * Search email data
         */
        onSearchEmailData: function(oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.byId("emailDataTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                if (sQuery) {
                    var aFilters = [
                        new sap.ui.model.Filter("poNumber", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("soNumber", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.Contains, sQuery)
                    ];
                    var oFilter = new sap.ui.model.Filter({
                        filters: aFilters,
                        and: false
                    });
                    oBinding.filter(oFilter);
                } else {
                    oBinding.filter([]);
                }
            }
        },

        /**
         * Refresh email preview
         */
        onRefreshPreview: function() {
            this._generatePreview();
            MessageToast.show("Preview refreshed");
        },

        /**
         * Generate email preview
         */
        _generatePreview: function() {
            var oModel = this.getView().getModel("email");
            var sResultType = oModel.getProperty("/resultType");
            var iTotal = oModel.getProperty("/totalCount");
            var iSuccess = oModel.getProperty("/successCount");
            var iFailed = oModel.getProperty("/failedCount");
            
            var sMessage = "";
            
            if (sResultType === "success" || sResultType === "both") {
                var sSuccessTemplate = oModel.getProperty("/successMessage");
                sMessage += sSuccessTemplate
                    .replace("{totalCount}", iTotal)
                    .replace("{successCount}", iSuccess);
            }
            
            if (sResultType === "failure" || sResultType === "both") {
                if (sMessage) sMessage += "\n\n---\n\n";
                var sFailureTemplate = oModel.getProperty("/failureMessage");
                sMessage += sFailureTemplate
                    .replace("{totalCount}", iTotal)
                    .replace("{failedCount}", iFailed);
            }
            
            oModel.setProperty("/previewMessage", sMessage);
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
                message: oModel.getProperty("/previewMessage"),
                attachExcel: oModel.getProperty("/attachExcel"),
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
         * Navigate to home
         */
        onNavigateToHome: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("Home");
        },

        /**
         * Complete workflow
         */
        onCompleteWorkflow: function() {
            MessageBox.success(
                "Workflow completed successfully!\n\nAll steps have been executed:\n• Data Acquisition\n• SO Processing\n• ERP Upload\n• Email Notification",
                {
                    title: "Workflow Complete",
                    onClose: function() {
                        this.onNavigateToHome();
                    }.bind(this)
                }
            );
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
