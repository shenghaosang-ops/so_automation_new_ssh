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
