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
                oMessageStrip.setText("No file selected. Supported formats: CSV (.csv), Excel (.xlsx)");
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

            // 检查文件类型是否为 CSV 或 Excel
            var bIsCSV = sFileName.toLowerCase().endsWith(".csv");
            var bIsExcel = sFileName.toLowerCase().endsWith(".xlsx");
            
            if (!bIsCSV && !bIsExcel) {
                oMessageStrip.setText("Invalid file type. Please select CSV (.csv) or Excel (.xlsx) file");
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
            ctrl._uploadedFileType = bIsCSV ? "csv" : "xlsx";
            
            var sFileTypeLabel = bIsCSV ? "CSV" : "Excel";
            oMessageStrip.setText("Selected " + sFileTypeLabel + " file: " + sFileName);
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
         * 处理Extract按钮点击事件 - 支持 CSV 和 Excel
         */
        onExtractPress: function(ctrl, oEvent) {
            var oMessageStrip = ctrl.byId("fileNameStrip");
            var sFileType = ctrl._uploadedFileType || "xlsx";
            
            try {
                var oReader = new FileReader();
                
                if (sFileType === "csv") {
                    // 处理 CSV 文件
                    oReader.onload = function(e) {
                        try {
                            var csvContent = e.target.result;
                            var jsonData = FileHandler._parseCSV(csvContent);
                            
                            if (!jsonData || jsonData.length === 0) {
                                throw new Error("No data found in CSV file");
                            }
                            
                            FileHandler._processExtractedData(ctrl, jsonData, oMessageStrip, "CSV");
                        } catch (error) {
                            oMessageStrip.setText("CSV processing failed: " + error.message);
                            oMessageStrip.setType("Error");
                            console.error("CSV processing error:", error);
                        }
                    };
                    oReader.readAsText(ctrl._uploadedFile);
                    
                } else {
                    // 处理 Excel 文件
                    oReader.onload = function(e) {
                        try {
                            var arrayBuffer = e.target.result;
                            var data = new Uint8Array(arrayBuffer);
                            var workbook = XLSX.read(data, { type: 'array' });
                            var firstSheetName = workbook.SheetNames[0];
                            var worksheet = workbook.Sheets[firstSheetName];
                            var jsonData = XLSX.utils.sheet_to_json(worksheet);
                            
                            if (!jsonData || jsonData.length === 0) {
                                throw new Error("No data found in Excel file");
                            }
                            
                            FileHandler._processExtractedData(ctrl, jsonData, oMessageStrip, "Excel");
                        } catch (error) {
                            oMessageStrip.setText("Excel processing failed: " + error.message);
                            oMessageStrip.setType("Error");
                            console.error("Excel processing error:", error);
                        }
                    };
                    oReader.readAsArrayBuffer(ctrl._uploadedFile);
                }
                
                oReader.onerror = function(error) {
                    oMessageStrip.setText("File reading failed");
                    oMessageStrip.setType("Error");
                    console.error("File reading error:", error);
                };
                
            } catch (error) {
                oMessageStrip.setText("Error: " + error.message);
                oMessageStrip.setType("Error");
                console.error("Processing error:", error);
            }
        },
        
        /**
         * 解析 CSV 文件内容
         */
        _parseCSV: function(csvContent) {
            var lines = csvContent.split(/\r?\n/);
            var headers = [];
            var jsonData = [];
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                
                var values = FileHandler._parseCSVLine(line);
                
                if (i === 0) {
                    // 第一行作为表头
                    headers = values;
                } else {
                    // 数据行
                    var row = {};
                    for (var j = 0; j < headers.length; j++) {
                        row[headers[j]] = values[j] || "";
                    }
                    jsonData.push(row);
                }
            }
            
            return jsonData;
        },
        
        /**
         * 解析 CSV 行（处理引号和逗号）
         */
        _parseCSVLine: function(line) {
            var values = [];
            var currentValue = "";
            var inQuotes = false;
            
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        // 双引号转义
                        currentValue += '"';
                        i++;
                    } else {
                        // 切换引号状态
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // 字段分隔符
                    values.push(currentValue.trim());
                    currentValue = "";
                } else {
                    currentValue += char;
                }
            }
            
            // 添加最后一个字段
            values.push(currentValue.trim());
            
            return values;
        },
        
        /**
         * 处理提取的数据（CSV 或 Excel）
         */
        _processExtractedData: function(ctrl, jsonData, oMessageStrip, sFileType) {
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
            
            var iColumns = Object.keys(jsonData[0]).length;
            oMessageStrip.setText(sFileType + " file: " + jsonData.length + " rows with " + iColumns + " columns extracted successfully.");
            oMessageStrip.setType("Success");
            
            console.log(sFileType + " data extracted:", jsonData.length, "rows,", iColumns, "columns");
            console.log("First row data:", jsonData[0]);
        }
    };

    return FileHandler;
});
