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
                uploadSummaryType: "Information"
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
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (oGlobalModel) {
                var aProcessedData = oGlobalModel.getProperty("/processedData");
                if (aProcessedData && aProcessedData.length > 0) {
                    this._loadSOData(aProcessedData);
                }
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
                
                // Store results in global model for email notification
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
         * Navigate to Email Notification page
         */
        onNavigateToEmailNotification: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("EmailNotification");
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
                oRouter.navTo("RouteView1", {}, true);
            }
        }
    });
});
