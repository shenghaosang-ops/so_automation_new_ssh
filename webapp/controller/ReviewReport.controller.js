sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("yegeoaiso.controller.ReviewReport", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ReviewReport").attachPatternMatched(this._onRouteMatched, this);

            // Initialize model
            var oModel = new JSONModel({
                totalCount: 0,
                successCount: 0,
                failedCount: 0,
                emailData: [],
                failedOrders: [],
                aiAnalyzing: false,
                aiProgress: 0,
                aiAnalysisComplete: false,
                aiAnalysis: {
                    successRate: 0,
                    qualityScore: 0,
                    qualityDescription: "",
                    successInsight: "",
                    failureInsight: "",
                    topFailureReasons: [],
                    recommendations: []
                }
            });
            this.getView().setModel(oModel, "report");
        },

        _onRouteMatched: function () {
            // Load data from previous step (SO Upload results)
            this._loadReportData();
        },

        _loadReportData: function () {
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (!oGlobalModel) {
                MessageToast.show("No upload data found");
                return;
            }

            var aResults = oGlobalModel.getProperty("/uploadResults") || [];
            var aFailedRecords = oGlobalModel.getProperty("/failedRecords") || [];
            var oModel = this.getView().getModel("report");

            // Transform and count
            var aEmailData = aResults.map(function (item, index) {
                return {
                    rowNumber: index + 1,
                    poNumber: item.poNumber || "",
                    customerName: item.customerName || "",
                    partNumber: item.partNumber || "",
                    quantity: item.quantity || 0,
                    status: item.status || "Unknown",
                    errorMessage: item.errorMessage || "",
                    soNumber: item.soNumber || ""
                };
            });

            var iSuccess = aEmailData.filter(function (item) {
                return item.status === "Success";
            }).length;

            var iFailed = aEmailData.filter(function (item) {
                return item.status === "Failed";
            }).length;

            // Process failed orders with AI recommendations
            var aFailedOrders = aFailedRecords.map(function(item) {
                return {
                    rowIndex: item.rowIndex || item.rowNumber || "",
                    poNumber: item.poNumber || "",
                    customerName: item.customerName || "",
                    partNumber: item.partNumber || "",
                    quantity: item.quantity || 0,
                    errorMessage: item.errorMessage || item.message || "Unknown error",
                    recommendation: this._generateRecommendation(item.errorMessage || item.message || "")
                };
            }.bind(this));

            oModel.setProperty("/emailData", aEmailData);
            oModel.setProperty("/failedOrders", aFailedOrders);
            oModel.setProperty("/totalCount", aEmailData.length);
            oModel.setProperty("/successCount", iSuccess);
            oModel.setProperty("/failedCount", iFailed);
        },

        /**
         * Generate AI recommendation based on error message
         */
        _generateRecommendation: function(sError) {
            var sLowerError = sError.toLowerCase();
            
            if (sLowerError.includes("duplicate") || sLowerError.includes("already exists")) {
                return "Check for duplicate PO numbers in the source data. Verify if order already exists in ERP system.";
            } else if (sLowerError.includes("invalid") || sLowerError.includes("format")) {
                return "Validate data format. Ensure all fields meet ERP system requirements (e.g., date format, numeric values).";
            } else if (sLowerError.includes("quantity") || sLowerError.includes("qty")) {
                return "Verify quantity field is numeric and greater than zero. Check for decimal precision requirements.";
            } else if (sLowerError.includes("customer") || sLowerError.includes("vendor")) {
                return "Confirm customer/vendor code exists in ERP master data. Check for leading zeros or special characters.";
            } else if (sLowerError.includes("material") || sLowerError.includes("part")) {
                return "Verify part number exists in material master. Check if material is active and available for sales.";
            } else if (sLowerError.includes("connection") || sLowerError.includes("timeout") || sLowerError.includes("network")) {
                return "System connectivity issue. Check network connection, ERP system availability, and retry after a few minutes.";
            } else if (sLowerError.includes("authorization") || sLowerError.includes("permission")) {
                return "User lacks required authorization. Contact system administrator to grant necessary permissions.";
            } else if (sLowerError.includes("mandatory") || sLowerError.includes("required")) {
                return "Missing mandatory field. Review data completeness and ensure all required fields are populated.";
            } else {
                return "Review error details and consult ERP system documentation. Consider contacting support if issue persists.";
            }
        },

        onAnalyzeData: function () {
            var oModel = this.getView().getModel("report");
            var aData = oModel.getProperty("/emailData");

            if (!aData || aData.length === 0) {
                MessageBox.warning("No data available for analysis");
                return;
            }

            // Start AI analysis
            oModel.setProperty("/aiAnalyzing", true);
            oModel.setProperty("/aiProgress", 0);
            oModel.setProperty("/aiAnalysisComplete", false);

            // Simulate AI analysis with progress
            this._runAIAnalysis();
        },

        _runAIAnalysis: function () {
            var oModel = this.getView().getModel("report");
            var iProgress = 0;

            var oInterval = setInterval(function () {
                iProgress += 20;
                oModel.setProperty("/aiProgress", iProgress);

                if (iProgress >= 100) {
                    clearInterval(oInterval);
                    // Perform actual analysis
                    this._performAIAnalysis();
                    oModel.setProperty("/aiAnalyzing", false);
                    oModel.setProperty("/aiAnalysisComplete", true);
                    MessageToast.show("AI Analysis completed successfully!");
                }
            }.bind(this), 400);
        },

        _performAIAnalysis: function () {
            var oModel = this.getView().getModel("report");
            var aData = oModel.getProperty("/emailData");
            var iTotal = oModel.getProperty("/totalCount");
            var iSuccess = oModel.getProperty("/successCount");
            var iFailed = oModel.getProperty("/failedCount");

            // Calculate success rate
            var fSuccessRate = iTotal > 0 ? Math.round((iSuccess / iTotal) * 100) : 0;

            // Generate success insight
            var sSuccessInsight = this._generateSuccessInsight(fSuccessRate, iSuccess, iTotal);

            // Analyze failure patterns
            var aFailureAnalysis = this._analyzeFailures(aData);
            var sFailureInsight = this._generateFailureInsight(iFailed, aFailureAnalysis);

            // Calculate data quality score
            var iQualityScore = this._calculateQualityScore(fSuccessRate, aData);
            var sQualityDescription = this._getQualityDescription(iQualityScore);

            // Generate recommendations
            var aRecommendations = this._generateRecommendations(fSuccessRate, aFailureAnalysis);

            // Update model
            oModel.setProperty("/aiAnalysis", {
                successRate: fSuccessRate,
                qualityScore: iQualityScore,
                qualityDescription: sQualityDescription,
                successInsight: sSuccessInsight,
                failureInsight: sFailureInsight,
                topFailureReasons: aFailureAnalysis,
                recommendations: aRecommendations
            });
        },

        _generateSuccessInsight: function (fRate, iSuccess, iTotal) {
            if (fRate === 100) {
                return "🎉 Perfect execution! All " + iTotal + " sales orders were created successfully. Your data quality and system integration are working flawlessly.";
            } else if (fRate >= 80) {
                return "✅ Great performance! " + iSuccess + " out of " + iTotal + " orders succeeded (" + fRate + "%). The majority of your data is being processed correctly.";
            } else if (fRate >= 50) {
                return "⚠️ Moderate success rate at " + fRate + "%. " + iSuccess + " orders succeeded, but there are some issues that need attention to improve the overall success rate.";
            } else if (fRate > 0) {
                return "❌ Low success rate at " + fRate + "%. Only " + iSuccess + " out of " + iTotal + " orders succeeded. Significant data quality or system issues detected.";
            } else {
                return "🚨 Critical: No orders succeeded. All " + iTotal + " orders failed. This indicates a systemic issue that requires immediate attention.";
            }
        },

        _analyzeFailures: function (aData) {
            var aFailed = aData.filter(function (item) {
                return item.status === "Failed";
            });

            if (aFailed.length === 0) {
                return [];
            }

            // Group by error message
            var oErrorGroups = {};
            aFailed.forEach(function (item) {
                var sError = item.errorMessage || "Unknown error";
                if (!oErrorGroups[sError]) {
                    oErrorGroups[sError] = {
                        reason: sError,
                        count: 0,
                        percentage: 0
                    };
                }
                oErrorGroups[sError].count++;
            });

            // Convert to array and calculate percentages
            var aFailureReasons = Object.values(oErrorGroups);
            var iTotalFailed = aFailed.length;
            aFailureReasons.forEach(function (item) {
                item.percentage = Math.round((item.count / iTotalFailed) * 100);
            });

            // Sort by count descending and take top 5
            aFailureReasons.sort(function (a, b) {
                return b.count - a.count;
            });

            return aFailureReasons.slice(0, 5);
        },

        _generateFailureInsight: function (iFailed, aFailureAnalysis) {
            if (iFailed === 0) {
                return "";
            }

            if (aFailureAnalysis.length === 0) {
                return "⚠️ " + iFailed + " orders failed, but no specific error patterns were detected.";
            }

            var sTopReason = aFailureAnalysis[0].reason;
            var iTopCount = aFailureAnalysis[0].count;

            var sInsight = "🔍 Analysis of " + iFailed + " failed orders: The most common issue is '" + sTopReason + 
                "' affecting " + iTopCount + " orders (" + aFailureAnalysis[0].percentage + "%).";

            // Check for system errors
            var bSystemError = this._detectSystemError(sTopReason);
            if (bSystemError) {
                sInsight += " This appears to be a system connectivity issue.";
            } else {
                sInsight += " This appears to be a data quality issue.";
            }

            return sInsight;
        },

        _detectSystemError: function (sError) {
            var sLowerError = sError.toLowerCase();
            return sLowerError.includes("connection") || 
                   sLowerError.includes("timeout") || 
                   sLowerError.includes("network") || 
                   sLowerError.includes("s4") ||
                   sLowerError.includes("server") ||
                   sLowerError.includes("unavailable");
        },

        _calculateQualityScore: function (fSuccessRate, aData) {
            // Base score from success rate (70% weight)
            var fBaseScore = fSuccessRate * 0.7;

            // Data completeness check (15% weight)
            var iCompleteRecords = 0;
            aData.forEach(function (item) {
                if (item.poNumber && item.customerName && item.partNumber && item.quantity > 0) {
                    iCompleteRecords++;
                }
            });
            var fCompletenessScore = aData.length > 0 ? (iCompleteRecords / aData.length) * 15 : 0;

            // Error diversity (15% weight) - fewer unique errors is better
            var aFailed = aData.filter(function (item) {
                return item.status === "Failed";
            });
            var iUniqueErrors = new Set(aFailed.map(function (item) {
                return item.errorMessage;
            })).size;
            var fErrorDiversityScore = aFailed.length > 0 ? 
                Math.max(0, 15 - (iUniqueErrors * 3)) : 15;

            var iTotalScore = Math.round(fBaseScore + fCompletenessScore + fErrorDiversityScore);
            return Math.min(100, Math.max(0, iTotalScore));
        },

        _getQualityDescription: function (iScore) {
            if (iScore >= 90) {
                return "Excellent data quality! Your input data is well-structured and complete.";
            } else if (iScore >= 70) {
                return "Good data quality with minor issues. Consider reviewing failed records.";
            } else if (iScore >= 50) {
                return "Fair data quality. Some improvements needed in data validation and completeness.";
            } else {
                return "Poor data quality detected. Recommend thorough review of data sources and validation rules.";
            }
        },

        _generateRecommendations: function (fSuccessRate, aFailureAnalysis) {
            var aRecommendations = [];

            // Success rate based recommendations
            if (fSuccessRate === 100) {
                aRecommendations.push({
                    title: "Maintain Excellence",
                    description: "Continue current data quality practices and system monitoring",
                    icon: "sap-icon://quality-issue"
                });
            } else if (fSuccessRate < 50) {
                aRecommendations.push({
                    title: "Urgent: Review Data Sources",
                    description: "High failure rate detected. Validate data extraction and transformation logic",
                    icon: "sap-icon://alert"
                });
            }

            // Failure pattern based recommendations
            if (aFailureAnalysis.length > 0) {
                var sTopError = aFailureAnalysis[0].reason;
                var bSystemError = this._detectSystemError(sTopError);

                if (bSystemError) {
                    aRecommendations.push({
                        title: "Check System Connectivity",
                        description: "Connection issues detected. Verify S4HANA system availability and network status",
                        icon: "sap-icon://disconnected"
                    });
                } else if (sTopError.toLowerCase().includes("duplicate")) {
                    aRecommendations.push({
                        title: "Implement Deduplication",
                        description: "Duplicate records found. Add pre-processing step to check for existing PO numbers",
                        icon: "sap-icon://duplicate"
                    });
                } else if (sTopError.toLowerCase().includes("format") || sTopError.toLowerCase().includes("invalid")) {
                    aRecommendations.push({
                        title: "Enhance Data Validation",
                        description: "Data format issues detected. Strengthen validation rules before upload",
                        icon: "sap-icon://form"
                    });
                }
            }

            // Always add monitoring recommendation
            aRecommendations.push({
                title: "Enable Real-time Monitoring",
                description: "Set up alerts for failure rate thresholds and system connectivity issues",
                icon: "sap-icon://monitor-payments"
            });

            // Add automation recommendation if partial success
            if (fSuccessRate > 0 && fSuccessRate < 100) {
                aRecommendations.push({
                    title: "Automate Error Retry",
                    description: "Implement automatic retry logic for transient errors to improve success rate",
                    icon: "sap-icon://synchronize"
                });
            }

            return aRecommendations;
        },

        onExportPDF: function () {
            MessageToast.show("PDF export functionality will be implemented");
            // TODO: Implement PDF export with jsPDF or similar library
        },

        onExportExcel: function () {
            MessageToast.show("Excel export functionality will be implemented");
            // TODO: Implement Excel export using existing XLSX library
        },

        onNavigateToHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("Home");
        },

        onCompleteWorkflow: function () {
            MessageBox.success("Workflow completed successfully! All data has been processed and analyzed.", {
                onClose: function () {
                    this.onNavigateToHome();
                }.bind(this)
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("SOUpload");
        },

        /**
         * Show failed orders dialog
         */
        onShowFailedOrders: function() {
            var oModel = this.getView().getModel("report");
            var iFailedCount = oModel.getProperty("/failedCount");

            if (iFailedCount === 0) {
                MessageBox.information("No failed orders to display. All uploads were successful!");
                return;
            }

            // Open dialog
            if (!this._oFailedOrdersDialog) {
                this._oFailedOrdersDialog = this.byId("failedOrdersDialog");
            }
            this._oFailedOrdersDialog.open();
        },

        /**
         * Close failed orders dialog
         */
        onCloseFailedOrdersDialog: function() {
            if (this._oFailedOrdersDialog) {
                this._oFailedOrdersDialog.close();
            }
        },

        /**
         * Export failed orders to Excel
         */
        onExportFailedOrders: function() {
            MessageToast.show("Exporting failed orders to Excel...");
            // TODO: Implement Excel export using existing XLSX library
        }
    });
});
