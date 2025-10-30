sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../services/SOUploadService"
], function(Controller, History, JSONModel, MessageToast, MessageBox, SOUploadService) {
    "use strict";

    return Controller.extend("yegeoaiso.controller.SOUpload", {
        
        onInit: function() {
            // Initialize SO Upload model
            var oUploadModel = new JSONModel({
                totalRecords: 0,
                validRecords: 0,
                invalidRecords: 0,
                soData: [],
                erpSystem: "SAP S/4HANA",
                connectionStatus: "Connected",
                uploadInProgress: false,
                uploadProgress: 0,
                uploadedCount: 0,
                uploadResults: [],
                uploadSummaryMessage: "",
                uploadSummaryType: "Information",
                successCount: 0,
                failedCount: 0,
                totalUploadCount: 0,
                email: {
                    recipients: "",
                    cc: "",
                    subject: "SO Upload Result " + this._formatDate(new Date()),
                    content: "",
                    sending: false,
                    sendProgress: 0,
                    sent: false
                }
            });
            this.getView().setModel(oUploadModel, "soUpload");

            // Get router and attach route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("SOUpload").attachPatternMatched(this._onRouteMatched, this);

            // Initialize service
            SOUploadService.init(this);
        },

        /**
         * Handle route matched - load data from previous page
         */
        _onRouteMatched: function() {
            var oModel = this.getView().getModel("soUpload");
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            
            if (oGlobalModel) {
                var aProcessedData = oGlobalModel.getProperty("/processedData");
                if (aProcessedData && aProcessedData.length > 0) {
                    this._loadSOData(aProcessedData);
                }
                
                // Auto-populate email recipients based on selected customer
                var sSelectedCustomer = oGlobalModel.getProperty("/selectedCustomer");
                if (sSelectedCustomer === "customerB") {
                    oModel.setProperty("/email/recipients", "recipents@sap.com");
                } else if (sSelectedCustomer === "customerA") {
                    oModel.setProperty("/email/recipients", "customerA@sap.com");
                }
            }
            
            // Set default recipient if not set
            if (!oModel.getProperty("/email/recipients")) {
                oModel.setProperty("/email/recipients", "recipents@sap.com");
            }
        },

        /**
         * Load SO data from processing results
         */
        _loadSOData: function(aData) {
            var oModel = this.getView().getModel("soUpload");
            var iValid = 0;
            var iInvalid = 0;

            aData.forEach(function(oItem) {
                // If valid field is undefined, default to true (assume valid until checked)
                if (oItem.valid === undefined) {
                    oItem.valid = true;
                    oItem.validationMessage = "Not yet validated";
                }
                
                if (oItem.valid) {
                    iValid++;
                } else {
                    iInvalid++;
                }
            });

            oModel.setProperty("/soData", aData);
            oModel.setProperty("/totalRecords", aData.length);
            oModel.setProperty("/validRecords", iValid);
            oModel.setProperty("/invalidRecords", iInvalid);
        },

        /**
         * Search data in table
         */
        onSearchData: function(oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.byId("soDataTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                if (sQuery) {
                    var aFilters = [
                        new sap.ui.model.Filter("poNumber", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("customerCode", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("partNo", sap.ui.model.FilterOperator.Contains, sQuery)
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
         * Check data validity
         */
        onCheckData: function() {
            var oModel = this.getView().getModel("soUpload");
            var aData = oModel.getProperty("/soData");
            
            if (!aData || aData.length === 0) {
                MessageBox.warning("No data available to check");
                return;
            }

            this.getView().setBusy(true);

            // Call service to validate data
            SOUploadService.validateData(aData).then(function(aValidatedData) {
                this.getView().setBusy(false);
                
                // Update data with validation results
                this._loadSOData(aValidatedData);
                
                var iValid = oModel.getProperty("/validRecords");
                var iInvalid = oModel.getProperty("/invalidRecords");
                
                MessageBox.information(
                    "Data validation completed.\n\nValid Records: " + iValid + 
                    "\nInvalid Records: " + iInvalid
                );
            }.bind(this)).catch(function(oError) {
                this.getView().setBusy(false);
                MessageBox.error("Validation failed: " + oError.message);
            }.bind(this));
        },

        /**
         * Execute upload to ERP system
         */
        onExecuteUpload: function() {
            var oModel = this.getView().getModel("soUpload");
            var aData = oModel.getProperty("/soData");
            var iValidRecords = oModel.getProperty("/validRecords");
            
            if (iValidRecords === 0) {
                MessageBox.warning("No valid records to upload");
                return;
            }

            // Confirm upload
            MessageBox.confirm(
                "Are you sure you want to upload " + iValidRecords + " record(s) to ERP system?",
                {
                    title: "Confirm Upload",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._performUpload(aData);
                        }
                    }.bind(this)
                }
            );
        },

        /**
         * Perform the actual upload
         */
        _performUpload: function(aData) {
            var oModel = this.getView().getModel("soUpload");
            
            // Set upload in progress
            oModel.setProperty("/uploadInProgress", true);
            oModel.setProperty("/uploadProgress", 0);
            oModel.setProperty("/uploadedCount", 0);
            oModel.setProperty("/uploadResults", []);

            // Filter only valid records
            var aValidData = aData.filter(function(oItem) {
                return oItem.valid === true;
            });

            // Call service to upload
            SOUploadService.uploadToERP(aValidData, function(iProgress, iCount) {
                // Progress callback
                oModel.setProperty("/uploadProgress", iProgress);
                oModel.setProperty("/uploadedCount", iCount);
            }).then(function(aResults) {
                oModel.setProperty("/uploadInProgress", false);
                oModel.setProperty("/uploadProgress", 100);
                oModel.setProperty("/uploadResults", aResults);
                
                // Calculate success/failure
                var iSuccess = aResults.filter(function(r) { return r.status === "Success"; }).length;
                var iFailure = aResults.length - iSuccess;
                
                var sMessage = "Upload completed. Success: " + iSuccess + ", Failed: " + iFailure;
                var sType = iFailure === 0 ? "Success" : "Warning";
                
                oModel.setProperty("/uploadSummaryMessage", sMessage);
                oModel.setProperty("/uploadSummaryType", sType);
                oModel.setProperty("/successCount", iSuccess);
                oModel.setProperty("/failedCount", iFailure);
                oModel.setProperty("/totalUploadCount", aResults.length);
                
                // Generate email content
                this._generateEmailContent(aResults, iSuccess, iFailure);
                
                // Store results in global model for review report
                var oGlobalModel = this.getOwnerComponent().getModel("globalData");
                if (!oGlobalModel) {
                    oGlobalModel = new JSONModel({});
                    this.getOwnerComponent().setModel(oGlobalModel, "globalData");
                }
                oGlobalModel.setProperty("/uploadResults", aResults);
                
                MessageToast.show(sMessage);
            }.bind(this)).catch(function(oError) {
                oModel.setProperty("/uploadInProgress", false);
                MessageBox.error("Upload failed: " + oError.message);
            }.bind(this));
        },

        /**
         * Export upload results
         */
        onExportResults: function() {
            MessageToast.show("Export functionality to be implemented");
            // TODO: Implement Excel export
        },

        /**
         * Format date as DD.MM.YYYY
         */
        _formatDate: function(oDate) {
            var sDay = ("0" + oDate.getDate()).slice(-2);
            var sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
            var sYear = oDate.getFullYear();
            return sDay + "." + sMonth + "." + sYear;
        },

        /**
         * Generate email content based on upload results - only successful records in table format
         */
        _generateEmailContent: function(aResults, iSuccess, iFailure) {
            var oModel = this.getView().getModel("soUpload");
            var iTotal = aResults.length;
            var sContent = "";

            // Filter only successful records for email
            var aSuccessful = aResults.filter(function(r) { return r.status === "Success"; });

            // Store failed records in global model for Review & Report page
            var aFailed = aResults.filter(function(r) { return r.status === "Failed"; });
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (!oGlobalModel) {
                oGlobalModel = new JSONModel({});
                this.getOwnerComponent().setModel(oGlobalModel, "globalData");
            }
            oGlobalModel.setProperty("/failedRecords", aFailed);

            // Update email subject with date
            oModel.setProperty("/email/subject", "SO Upload Result " + this._formatDate(new Date()));

            // Generate email content - show successful records in table format
            if (iSuccess > 0) {
                oModel.setProperty("/email/emailContentType", "success");
                sContent = "Dear Team,\n\n";
                sContent += "✅ Sales order upload completed successfully!\n\n";
                sContent += "Summary:\n";
                sContent += "- Total Successful Orders: " + iSuccess + "\n";
                sContent += "- Upload Date: " + this._formatDate(new Date()) + "\n\n";
                sContent += "Successful Orders:\n";
                sContent += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                
                // Table header
                sContent += String.prototype.padEnd ? 
                    "No.".padEnd(5) + "SO Number".padEnd(15) + "PO Number".padEnd(15) + "Customer".padEnd(25) + "Part Number".padEnd(20) + "Quantity".padEnd(12) + "Created Date\n" :
                    "No.  SO Number      PO Number      Customer                 Part Number         Quantity    Created Date\n";
                sContent += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                
                // Table rows
                aSuccessful.forEach(function(oRecord, index) {
                    var sNo = String(index + 1);
                    var sSONumber = oRecord.soNumber || "N/A";
                    var sPONumber = oRecord.poNumber || "N/A";
                    var sCustomer = (oRecord.customerName || "N/A").substring(0, 24);
                    var sPartNumber = (oRecord.partNumber || "N/A").substring(0, 19);
                    var sQuantity = String(oRecord.quantity || "N/A");
                    var sCreatedDate = oRecord.createdDate || "N/A";
                    
                    if (String.prototype.padEnd) {
                        sContent += sNo.padEnd(5) + sSONumber.padEnd(15) + sPONumber.padEnd(15) + 
                                   sCustomer.padEnd(25) + sPartNumber.padEnd(20) + sQuantity.padEnd(12) + sCreatedDate + "\n";
                    } else {
                        // Fallback for older browsers
                        sContent += sNo + "    " + sSONumber + "   " + sPONumber + "   " + 
                                   sCustomer + "   " + sPartNumber + "   " + sQuantity + "   " + sCreatedDate + "\n";
                    }
                });
                
                sContent += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
                
                if (iFailure > 0) {
                    sContent += "Note: " + iFailure + " record(s) failed. Please check the Review & Report page for detailed failure analysis.\n\n";
                }
                
                sContent += "All sales orders are now active in the system and ready for processing.\n\n";
                sContent += "Best regards,\nSO Automation System";
            } else {
                // All failed - redirect to Review & Report page
                oModel.setProperty("/email/emailContentType", "allFailed");
                sContent = "Dear Team,\n\n";
                sContent += "❌ Sales order upload encountered issues.\n\n";
                sContent += "Summary:\n";
                sContent += "- Total Orders Attempted: " + iTotal + "\n";
                sContent += "- Failed Orders: " + iFailure + "\n\n";
                sContent += "⚠️ All uploads failed. Please check the Review & Report page for detailed failure analysis and recommendations.\n\n";
                sContent += "Best regards,\nSO Automation System";
            }

            oModel.setProperty("/email/content", sContent);
        },

        /**
         * Detect if errors are system-related
         */
        _detectSystemError: function(aResults) {
            var aSystemKeywords = ["connection", "timeout", "network", "s4", "server", "unavailable", "unreachable"];
            
            for (var i = 0; i < aResults.length; i++) {
                var sError = (aResults[i].errorMessage || aResults[i].message || "").toLowerCase();
                for (var j = 0; j < aSystemKeywords.length; j++) {
                    if (sError.indexOf(aSystemKeywords[j]) !== -1) {
                        return true;
                    }
                }
            }
            return false;
        },

        /**
         * Send email notification
         */
        onSendEmail: function() {
            var oModel = this.getView().getModel("soUpload");
            var sRecipients = oModel.getProperty("/email/recipients");
            var sSubject = oModel.getProperty("/email/subject");
            var sContent = oModel.getProperty("/email/content");

            if (!sRecipients || !sSubject) {
                MessageBox.warning("Please fill in recipients and subject");
                return;
            }

            // Set sending state
            oModel.setProperty("/email/sending", true);
            oModel.setProperty("/email/sendProgress", 0);
            oModel.setProperty("/email/sent", false);

            // Simulate email sending with progress
            var iProgress = 0;
            var oInterval = setInterval(function() {
                iProgress += 20;
                oModel.setProperty("/email/sendProgress", iProgress);

                if (iProgress >= 100) {
                    clearInterval(oInterval);
                    oModel.setProperty("/email/sending", false);
                    oModel.setProperty("/email/sent", true);
                    MessageToast.show("Email sent successfully!");
                }
            }, 300);
        },

        /**
         * Navigate to Review & Report page
         */
        onNavigateToReviewReport: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("ReviewReport");
        },

        /**
         * Navigate back to SO Automation
         */
        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1");
        }
    });
});
