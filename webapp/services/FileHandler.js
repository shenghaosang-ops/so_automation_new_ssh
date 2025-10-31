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
            try {
                var oReader = new FileReader();
                oReader.onload = function(e) {
                    try {
                        var arrayBuffer = e.target.result;
                        var data = new Uint8Array(arrayBuffer);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var firstSheetName = workbook.SheetNames[0];
                        var worksheet = workbook.Sheets[firstSheetName];
                        var jsonData = XLSX.utils.sheet_to_json(worksheet);
                        
                        // 保存完整数据（所有列）
                        var oViewModel = ctrl.getView().getModel("viewData");
                        oViewModel.setProperty("/excelData", jsonData);
                        oViewModel.setProperty("/rowCount", jsonData.length);
                        oViewModel.setProperty("/showPreview", true);
                        
                        // 创建预览数据（仅前5列用于预览表格显示）
                        var previewData = jsonData.map(function(row) {
                            var columns = Object.keys(row);
                            var previewRow = {};
                            columns.slice(0, 5).forEach(function(column) {
                                previewRow[column] = row[column];
                            });
                            return previewRow;
                        });
                        
                        // 更新预览表格（仅显示前5列）
                        if (ctrl._updatePreviewTable) {
                            ctrl._updatePreviewTable(previewData);
                        }
                        
                        oMessageStrip.setText(jsonData.length + " rows with " + Object.keys(jsonData[0]).length + " columns extracted successfully.");
                        oMessageStrip.setType("Success");
                        
                        console.log("Excel data extracted:", jsonData.length, "rows,", Object.keys(jsonData[0]).length, "columns");
                        console.log("First row data:", jsonData[0]);
                    } catch (error) {
                        oMessageStrip.setText("File processing failed: " + error.message);
                        oMessageStrip.setType("Error");
                        console.error("Excel processing error:", error);
                    }
                };
                oReader.onerror = function(error) {
                    oMessageStrip.setText("File reading failed");
                    oMessageStrip.setType("Error");
                    console.error("File reading error:", error);
                };
                oReader.readAsArrayBuffer(ctrl._uploadedFile);
            } catch (error) {
                oMessageStrip.setText("Error: " + error.message);
                oMessageStrip.setType("Error");
                console.error("Processing error:", error);
            }
        }
    };

    return FileHandler;
});
