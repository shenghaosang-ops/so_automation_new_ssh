sap.ui.define([], function() {
    "use strict";
    /**
     * FileHandler.js
     * Handles file selection, validation, Excel parsing, and model updates
     */
    var FileHandler = {
        /**
         * 初始化文件处理相关模型
         * @param {sap.ui.core.mvc.Controller} ctrl
         */
        init: function(ctrl) {
            // 初始时禁用Extract按钮
            ctrl.byId("extractButton").setEnabled(false);

            // 初始化文件模型
            var oFileModel = new sap.ui.model.json.JSONModel({
                fileName: "",
                fileContent: { headers: [], rows: [] },
                isValid: false,
                errorMessage: ""
            });
            ctrl.getView().setModel(oFileModel, "file");
        },

        /**
         * Handles the Excel file selection event
         * Uses xlsx library to parse Excel file and prepare data for processing
         * @public
         */
        onFileSelect: function(ctrl, oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            var sFileName = oEvent.getParameter("newValue");
            var oMessageStrip = ctrl.byId("fileNameStrip");
            var oViewModel = ctrl.getView().getModel("viewData");

            if (!sFileName || !oFile) {
                oMessageStrip.setText("No file selected. Only Excel (.xlsx) files are allowed.");
                oMessageStrip.setType("Information");
                ctrl.byId("extractButton").setEnabled(false);
        
                // 更新视图模型
                oViewModel.setProperty("/uploadStatus", {
                    fileName: "",
                    message: "No file selected",
                    type: "Information"
                });
                return;
            }

            if (!sFileName.endsWith(".xlsx")) {
                oMessageStrip.setText("Invalid file type. Please select an Excel (.xlsx) file");
                oMessageStrip.setType("Error");
                ctrl.byId("extractButton").setEnabled(false);
        
                // 更新视图模型
                oViewModel.setProperty("/uploadStatus", {
                    fileName: sFileName,
                    message: "Invalid file type",
                    type: "Error"
                });
                return;
            }
            ctrl._uploadedFile = oFile;
            oMessageStrip.setText("Selected file: " + sFileName);
            oMessageStrip.setType("Success");
            ctrl.byId("extractButton").setEnabled(true);

            // 更新视图模型
            oViewModel.setProperty("/uploadStatus", {
                fileName: sFileName,
                message: "File selected successfully",
                type: "Success"
            });
        },

        /**
         * 处理Extract Excel File按钮点击事件
         */
        onExtractPress: function(ctrl, oEvent) {
            var oMessageStrip = ctrl.byId("fileNameStrip");
            var oViewModel = ctrl.getView().getModel("viewData");
            var oTable = ctrl.byId("previewTable");

            try {
                // Show busy state
                if (oTable) {
                    oTable.setBusy(true);
                }
                var oReader = new FileReader();
                oReader.onload = function(e) {
                    try {
                        var arrayBuffer = e.target.result;
                        var data = new Uint8Array(arrayBuffer);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var firstSheetName = workbook.SheetNames[0];
                        var worksheet = workbook.Sheets[firstSheetName];
                        var jsonData = XLSX.utils.sheet_to_json(worksheet);
                        // 只保留前5列数据
                        var limitedData = jsonData.map(function(row) {
                            var columns = Object.keys(row);
                            var limitedRow = {};
                            columns.slice(0, 5).forEach(function(column) {
                                limitedRow[column] = row[column];
                            });
                            return limitedRow;
                        });
                        var oModel = new sap.ui.model.json.JSONModel({ rows: limitedData });
                        ctrl.getView().setModel(oModel, "excelData");
                        oMessageStrip.setText(jsonData.length + " rows extracted.");
                        oMessageStrip.setType("Success");

                        

                        // Update view model for preview
                        oViewModel.setProperty("/excelData", limitedData);
                        oViewModel.setProperty("/rowCount", limitedData.length);
                        // 自动展开预览面板
                        var oPreviewPanel = ctrl.byId("previewPanel");
                        if (oPreviewPanel && !oPreviewPanel.getExpanded()) {
                            oPreviewPanel.setExpanded(true);
                        }
                        oViewModel.setProperty("/showPreview", true);
                        oViewModel.setProperty("/uploadStatus", {
                            fileName: ctrl._uploadedFile.name,
                            message: jsonData.length + " rows extracted successfully",
                            type: "Success"
                        });

                        // Update preview table
                        if (typeof ctrl._updatePreviewTable === "function") {
                            ctrl._updatePreviewTable(limitedData);
                        }
                    } catch (error) {
                        oMessageStrip.setText("File processing failed: " + error.message);
                        oMessageStrip.setType("Error");

                        oViewModel.setProperty("/uploadStatus", {
                            fileName: ctrl._uploadedFile.name,
                            message: "File processing failed: " + error.message,
                            type: "Error"
                        });
                        console.error("Excel processing error:", error);
                    } finally {
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                    }
                };
                oReader.onerror = function(error) {
                    oMessageStrip.setText("File reading failed");
                    oMessageStrip.setType("Error");
                    oViewModel.setProperty("/uploadStatus", {
                        fileName: ctrl._uploadedFile.name,
                        message: "File reading failed",
                        type: "Error"
                    });
                    
                    console.error("File reading error:", error);
                    
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                };
                oReader.readAsArrayBuffer(ctrl._uploadedFile);
            } catch (error) {
                oMessageStrip.setText("Error: " + error.message);
                oMessageStrip.setType("Error");
                oViewModel.setProperty("/uploadStatus", {
                    fileName: ctrl._uploadedFile ? ctrl._uploadedFile.name : "",
                    message: "Error: " + error.message,
                    type: "Error"
                });
                
                console.error("Processing error:", error);
                
                if (oTable) {
                    oTable.setBusy(false);
                }
            }
        }
    };

    return FileHandler;
});
