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
                editMode: false,
                hasDownloadedResults: false,
                filteredFields: [],
                confidenceFilter: "all"
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
            var oModel = this.getView().getModel("dataAcquisition");
            
            if (!sFileName) {
                this.byId("documentNameStrip").setText("No file selected");
                this.byId("documentNameStrip").setType("Information");
                return;
            }

            if (!sFileName.endsWith(".pdf")) {
                this.byId("documentNameStrip").setText("Only PDF files are supported");
                this.byId("documentNameStrip").setType("Error");
                return;
            }

            // Get the file
            var oFile = oEvent.getParameter("files")[0];
            var oModel = this.getView().getModel("dataAcquisition");
            
            try {
                // Create object URL for PDF preview
                var sObjectUrl = URL.createObjectURL(oFile);
                oModel.setProperty("/documentUrl", sObjectUrl);
                
                // Update PDF viewer
                var that = this;
                setTimeout(function() {
                    var oPdfViewer = document.getElementById("pdfViewer");
                    if (oPdfViewer) {
                        oPdfViewer.src = sObjectUrl;
                    }
                    
                    // Show success message
                    that.byId("documentNameStrip").setText("Selected: " + sFileName);
                    that.byId("documentNameStrip").setType("Success");
                }, 0);

                // Call service to extract data
                DataAcquisitionService.extractPdfData(oFile).then(function(oResult) {
                    if (oResult && oResult.fields) {
                        // Set both extractedFields and filteredFields
                        oModel.setProperty("/extractedFields", oResult.fields);
                        oModel.setProperty("/filteredFields", oResult.fields);
                        MessageToast.show("Data extracted successfully");
                    }
                }).catch(function(error) {
                    MessageToast.show("Error extracting data: " + error.message);
                });

                
                // Clean up object URL when component is destroyed
                var oComponent = this.getOwnerComponent();
                if (oComponent) {
                    var oPrevUrl = oComponent._sPdfUrl;
                    if (oPrevUrl) {
                        URL.revokeObjectURL(oPrevUrl);
                    }
                    oComponent._sPdfUrl = sObjectUrl;
                }
            } catch (error) {
                // Show error message
                this.byId("documentNameStrip").setText("Error loading PDF: " + error.message);
                this.byId("documentNameStrip").setType("Error");
                console.error("Error loading PDF:", error);
            }
            // Show success message
            this.byId("documentNameStrip").setText("Selected: " + sFileName);
            this.byId("documentNameStrip").setType("Success");

            // Mock API call to extract data
            this._extractDocumentData(oFile);
            // if (sFileName) {
            //     this.byId("documentNameStrip").setText("Selected: " + sFileName);
            //     this.byId("documentNameStrip").setType("Success");
                
            //     // Get the file
            //     var oFile = oEvent.getParameter("files")[0];
            //     this.getView().getModel("dataAcquisition").setProperty("/documentFile", oFile);
                
            //     MessageToast.show("Document selected: " + sFileName);
            // }
        },

        /**
         * Mock function to extract document data
         * In real implementation, this would call the backend API
         */
        _extractDocumentData: function(oFile) {
            var oModel = this.getView().getModel("dataAcquisition");
            
            // Mock API response data
            var aMockData = [
                {
                    label: "条形码",
                    value: "01.31.2531200000023013224559",
                    confidence: 95
                },
                {
                    label: "交易日期",
                    value: "2025.07.23",
                    confidence: 98
                },
                {
                    label: "发票编号",
                    value: "2531200000023013224",
                    confidence: 92
                },
                {
                    label: "总金额",
                    value: "593.49",
                    confidence: 75
                },
                {
                    label: "净额",
                    value: "559.9",
                    confidence: 48
                }
            ];

            // Simulate API delay
            setTimeout(function() {
                oModel.setProperty("/extractedFields", aMockData);
            }, 1000);
        },

        onFilterConfidence: function(oEvent) {
            // var sRange = oEvent.getSource().data("range");
            var oButton = oEvent.getSource();
            var sRange = oButton.getCustomData()[0].getValue();
            var oViewModel = this.getView().getModel("dataAcquisition");
            var aAllFields = oViewModel.getProperty("/extractedFields");
            var aFilteredFields;

            switch(sRange) {
                case "low":
                    aFilteredFields = aAllFields.filter(field => field.confidence < 51);
                    break;
                case "medium":
                    aFilteredFields = aAllFields.filter(field => field.confidence >= 51 && field.confidence < 80);
                    break;
                case "high":
                    aFilteredFields = aAllFields.filter(field => field.confidence >= 80);
                    break;
                default:
                    aFilteredFields = aAllFields;
            }

            oViewModel.setProperty("/filteredFields", aFilteredFields);
            oViewModel.setProperty("/confidenceFilter", sRange);
        },

        onToggleEditMode: function() {
            var oViewModel = this.getView().getModel("dataAcquisition");
            var bCurrentMode = oViewModel.getProperty("/editMode");
            oViewModel.setProperty("/editMode", !bCurrentMode);
        },

        /**
         * Download structured data extracted from document
         * @returns 
         */
        onDownloadResults: function() {
            var oModel = this.getView().getModel("dataAcquisition");
            var aData = oModel.getProperty("/extractedFields");
            var sFormat = this.byId("exportFormat").getSelectedKey();
            
            if (!aData || !aData.length) {
                MessageToast.show("No data to export");
                return;
            }

            switch(sFormat) {
                case "json":
                    this._downloadJson(aData);
                    break;
                case "excel":
                    this._downloadExcel(aData);
                    break;
                case "csv":
                    this._downloadCsv(aData);
                    break;
            }

            // Enable Next button after download
            oModel.setProperty("/hasDownloadedResults", true);
            MessageToast.show("Results downloaded successfully");
        },

        _downloadJson: function(aData) {
            var sContent = JSON.stringify(aData, null, 2);
            var oBlob = new Blob([sContent], { type: 'application/json' });
            this._triggerDownload(oBlob, "extracted_data.json");
        },

        _downloadExcel: function(aData) {
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(aData);
            XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
            var arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            var oBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            this._triggerDownload(oBlob, "extracted_data.xlsx");
        },

        _downloadCsv: function(aData) {
            var aCsv = [["Field Name", "Value", "Confidence"]];
            aData.forEach(function(oItem) {
                aCsv.push([oItem.label, oItem.value, oItem.confidence + "%"]);
            });
            var sContent = aCsv.map(e => e.join(",")).join("\n");
            var oBlob = new Blob([sContent], { type: 'text/csv' });
            this._triggerDownload(oBlob, "extracted_data.csv");
        },

        _triggerDownload: function(oBlob, sFilename) {
            var sUrl = URL.createObjectURL(oBlob);
            var oLink = document.createElement('a');
            oLink.href = sUrl;
            oLink.download = sFilename;
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
            URL.revokeObjectURL(sUrl);
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
            // var oModel = this.getView().getModel("dataAcquisition");
            // var sExtractedData = oModel.getProperty("/extractedData");
            
            // if (!sExtractedData) {
            //     MessageBox.warning("Please extract data before proceeding");
            //     return;
            // }

            // // Store extracted data in a global model for the next page
            // var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            // if (!oGlobalModel) {
            //     oGlobalModel = new JSONModel({});
            //     this.getOwnerComponent().setModel(oGlobalModel, "globalData");
            // }
            // oGlobalModel.setProperty("/acquiredData", sExtractedData);

            // // Navigate to SO Automation
            // var oRouter = this.getOwnerComponent().getRouter();
            // oRouter.navTo("RouteView1");
            var oModel = this.getView().getModel("dataAcquisition");
            var sDataType = oModel.getProperty("/dataType");
            var bCanProceed = false;
            var oData = null;

            // Check data based on type
            if (sDataType === "structured") {
                var sExtractedData = oModel.getProperty("/extractedData");
                bCanProceed = !!sExtractedData;
                oData = sExtractedData;
            } else {
                // For unstructured data
                var aExtractedFields = oModel.getProperty("/extractedFields");
                bCanProceed = Array.isArray(aExtractedFields) && aExtractedFields.length > 0;
                oData = aExtractedFields;
            }

            if (!bCanProceed) {
                MessageBox.warning("Please extract data before proceeding");
                return;
            }

            // Store extracted data in a global model for the next page
            var oGlobalModel = this.getOwnerComponent().getModel("globalData");
            if (!oGlobalModel) {
                oGlobalModel = new JSONModel({});
                this.getOwnerComponent().setModel(oGlobalModel, "globalData");
            }
            oGlobalModel.setProperty("/acquiredData", oData);

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
