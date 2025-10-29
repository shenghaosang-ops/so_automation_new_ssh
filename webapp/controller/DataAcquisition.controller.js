sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../services/DataAcquisitionService"
], function(Controller, History, JSONModel, MessageToast, MessageBox, DataAcquisitionService) {
    "use strict";

    return Controller.extend("yegeoaiso.controller.DataAcquisition", {
        
        onInit: function() {
            // Initialize data acquisition model
            var oDataModel = new JSONModel({
                selectedCustomer: "",
                dataType: "structured",
                websiteUrl: "",
                dataSelectors: "",
                outputFormat: "json",
                additionalConfig: "",
                extractionTemplate: "",
                extractedData: "",
                documentFile: null,
                downloadSuccess: false,
                downloadStatus: "",
            });
            this.getView().setModel(oDataModel, "dataAcquisition");

            // Initialize service
            DataAcquisitionService.init(this);
        },

        /**
         * Handle customer selection change
         */
        onCustomerChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel("dataAcquisition");
            
            // Set selected customer
            oModel.setProperty("/selectedCustomer", sSelectedKey);
            
            // Auto-fill URL based on customer selection
            if (sSelectedKey === "customerA") {
                oModel.setProperty("/websiteUrl", "https://www.filemail.com/d/tzivrghywfzivdn");
                MessageToast.show("Customer A selected - URL auto-filled");
            } else if (sSelectedKey === "customerB") {
                oModel.setProperty("/websiteUrl", "");
                MessageToast.show("Customer B selected");
            } else {
                oModel.setProperty("/websiteUrl", "");
            }
        },

        /**
         * Handle data type change
         */
        onDataTypeChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("item").getKey();
            this.getView().getModel("dataAcquisition").setProperty("/dataType", sSelectedKey);
            
            // Clear previous extraction results
            this.getView().getModel("dataAcquisition").setProperty("/extractedData", "");
        },

        /**
         * Handle document file selection
         */
        onDocumentSelect: function(oEvent) {
            var oFileUploader = oEvent.getSource();
            var sFileName = oFileUploader.getValue();
            
            if (sFileName) {
                this.byId("documentNameStrip").setText("Selected: " + sFileName);
                this.byId("documentNameStrip").setType("Success");
                
                // Get the file
                var oFile = oEvent.getParameter("files")[0];
                this.getView().getModel("dataAcquisition").setProperty("/documentFile", oFile);
                
                MessageToast.show("Document selected: " + sFileName);
            }
        },

        /**
         * Extract data from website
         */
        onExtractWebData: function() {
            var oModel = this.getView().getModel("dataAcquisition");
            var sUrl = oModel.getProperty("/websiteUrl");
            var sOutputFormat = oModel.getProperty("/outputFormat");
            
            if (!sUrl) {
                MessageBox.warning("Please enter a website URL");
                return;
            }

            // Show busy indicator
            this.getView().setBusy(true);

            // Call service to extract web data
            DataAcquisitionService.extractWebData({
                url: sUrl,
                selectors: oModel.getProperty("/dataSelectors"),
                outputFormat: sOutputFormat,
                config: oModel.getProperty("/additionalConfig")
            }).then(function(oResult) {
                this.getView().setBusy(false);
                
                // Display extracted data
                var sExtractedData = JSON.stringify(oResult, null, 2);
                oModel.setProperty("/extractedData", sExtractedData);
                
                MessageToast.show("Web data extracted successfully");
            }.bind(this)).catch(function(oError) {
                this.getView().setBusy(false);
                MessageBox.error("Failed to extract web data: " + oError.message);
            }.bind(this));
        },

        /**
         * Download Excel file from URL
         */
        onDownloadExcel: function() {
            var that = this;
            var oModel = this.getView().getModel("dataAcquisition");
            var sUrl = oModel.getProperty("/websiteUrl");
            
            if (!sUrl) {
                oModel.setProperty("/downloadStatus", "Please select a customer first");
                oModel.setProperty("/downloadSuccess", false);
                return;
            }

            // Show loading status
            oModel.setProperty("/downloadStatus", "Downloading file...");

            DataAcquisitionService.downloadExcelFile(sUrl)
                .then(function(oResult) {
                    if (oResult.success) {
                        oModel.setProperty("/downloadStatus", "File downloaded successfully to: " + oResult.filePath);
                        oModel.setProperty("/downloadSuccess", true);
                        // Enable the Next button by setting some extracted data
                        oModel.setProperty("/extractedData", "Download completed");
                    } else {
                        oModel.setProperty("/downloadStatus", "Failed to download file");
                        oModel.setProperty("/downloadSuccess", false);
                    }
                })
                .catch(function(oError) {
                    oModel.setProperty("/downloadStatus", "Error downloading file: " + oError.message);
                    oModel.setProperty("/downloadSuccess", false);
                });
        },
        // onDownloadExcel: function() {
        //     var sUrl = this.getView().getModel("dataAcquisition").getProperty("/websiteUrl");
            
        //     if (!sUrl) {
        //         MessageToast.show("Please select a customer first");
        //         return;
        //     }

        //     // Show loading indicator
        //     sap.ui.core.BusyIndicator.show();

        //     DataAcquisitionService.downloadExcelFile(sUrl)
        //         .then(function(oResult) {
        //             if (oResult.success) {
        //                 MessageBox.success("File downloaded successfully to: " + oResult.filePath);
        //             } else {
        //                 MessageBox.error("Failed to download file");
        //             }
        //         })
        //         .catch(function(oError) {
        //             MessageBox.error("Error downloading file: " + oError.message);
        //         })
        //         .finally(function() {
        //             sap.ui.core.BusyIndicator.hide();
        //         });
        // },

        /**
         * Extract data from document (PDF, DOC, TXT)
         */
        onExtractDocumentData: function() {
            var oModel = this.getView().getModel("dataAcquisition");
            var oFile = oModel.getProperty("/documentFile");
            var sTemplate = oModel.getProperty("/extractionTemplate");
            var sOutputFormat = oModel.getProperty("/outputFormat");
            
            if (!oFile) {
                MessageBox.warning("Please select a document file");
                return;
            }

            // Show busy indicator
            this.getView().setBusy(true);

            // Call service to extract document data
            DataAcquisitionService.extractDocumentData({
                file: oFile,
                template: sTemplate,
                outputFormat: sOutputFormat
            }).then(function(oResult) {
                this.getView().setBusy(false);
                
                // Display extracted data
                var sExtractedData = JSON.stringify(oResult, null, 2);
                oModel.setProperty("/extractedData", sExtractedData);
                
                MessageToast.show("Document data extracted successfully");
            }.bind(this)).catch(function(oError) {
                this.getView().setBusy(false);
                MessageBox.error("Failed to extract document data: " + oError.message);
            }.bind(this));
        },

        /**
         * Clear extraction results
         */
        onClearResults: function() {
            this.getView().getModel("dataAcquisition").setProperty("/extractedData", "");
            MessageToast.show("Results cleared");
        },

        /**
         * Navigate to SO Automation page with extracted data
         */
        onNavigateToSOAutomation: function() {
            var oModel = this.getView().getModel("dataAcquisition");
            var sExtractedData = oModel.getProperty("/extractedData");
            
            if (!sExtractedData) {
                MessageBox.warning("Please extract data before proceeding");
                return;
            }

            // Store extracted data in a global model for the next page
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (!oGlobalModel) {
                oGlobalModel = new JSONModel({});
                this.getOwnerComponent().setModel(oGlobalModel, "globalData");
            }
            oGlobalModel.setProperty("/acquiredData", sExtractedData);

            // Navigate to SO Automation
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1");
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
                oRouter.navTo("Home", {}, true);
            }
        }
    });
});
