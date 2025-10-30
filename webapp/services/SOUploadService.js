/**
 * SO Upload Service
 * Handles validation and upload of SO data to ERP system
 */
sap.ui.define([], function() {
    "use strict";

    var SOUploadService = {
        _controller: null,

        /**
         * Initialize service
         */
        init: function(oController) {
            this._controller = oController;
        },

        /**
         * Validate SO data before upload
         * @param {Array} aData - Array of SO records
         * @returns {Promise} Promise with validated data
         */
        validateData: function(aData) {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    try {
                        var aValidatedData = aData.map(function(oItem) {
                            var bValid = true;
                            var aErrors = [];

                            // Validation rules - check each field
                            if (!oItem.poNumber || String(oItem.poNumber).trim() === "") {
                                bValid = false;
                                aErrors.push("PO Number is required");
                            }
                            
                            if (!oItem.partNo || String(oItem.partNo).trim() === "") {
                                bValid = false;
                                aErrors.push("Part Number is required");
                            }
                            
                            // Quantity validation - must be a positive number
                            var iQty = parseFloat(oItem.quantity);
                            if (!oItem.quantity || isNaN(iQty) || iQty <= 0) {
                                bValid = false;
                                aErrors.push("Valid quantity (>0) is required");
                            }
                            
                            // Optional: Customer code validation
                            if (!oItem.customerCode || String(oItem.customerCode).trim() === "") {
                                // Just a warning, not blocking
                                // aErrors.push("Customer Code is recommended");
                            }

                            var sMessage = bValid ? "All validations passed" : aErrors.join("; ");

                            return Object.assign({}, oItem, {
                                valid: bValid,
                                validationMessage: sMessage
                            });
                        });

                        resolve(aValidatedData);
                    } catch (error) {
                        reject({
                            message: "Validation failed: " + error.message
                        });
                    }
                }, 1000);
            });
        },

        /**
         * Upload SO data to ERP system
         * @param {Array} aData - Array of valid SO records
         * @param {Function} fnProgress - Progress callback function
         * @returns {Promise} Promise with upload results
         */
        uploadToERP: function(aData, fnProgress) {
            return new Promise(function(resolve, reject) {
                var aResults = [];
                var iTotal = aData.length;
                var iProcessed = 0;
                
                // Generate base SO number (starting point)
                // Format: 4000xxxxxx where xxxxxx increments
                var iBaseSONumber = 4000000000 + Math.floor(Math.random() * 100000); // Random starting point
                var iCurrentSONumber = iBaseSONumber;

                // Simulate batch upload
                var processNext = function() {
                    if (iProcessed >= iTotal) {
                        resolve(aResults);
                        return;
                    }

                    var oItem = aData[iProcessed];
                    
                    // Simulate ERP API call
                    setTimeout(function() {
                        // Simulate success/failure (90% success rate)
                        var bSuccess = Math.random() > 0.1;
                        
                        // Generate SAP-style SO number: sequential 10-digit number starting with 4
                        var sSAPSONumber = "N/A";
                        if (bSuccess) {
                            sSAPSONumber = iCurrentSONumber.toString();
                            iCurrentSONumber++; // Increment for next SO
                        }
                        
                        // Get today's date in SAP format (DD.MM.YYYY)
                        var oToday = new Date();
                        var sDay = ("0" + oToday.getDate()).slice(-2);
                        var sMonth = ("0" + (oToday.getMonth() + 1)).slice(-2);
                        var sYear = oToday.getFullYear();
                        var sCreatedDate = sDay + "." + sMonth + "." + sYear;
                        
                        var oResult = {
                            rowIndex: oItem.rowIndex,
                            poNumber: oItem.poNumber,
                            soNumber: sSAPSONumber,
                            createdDate: bSuccess ? sCreatedDate : "",
                            customerCode: oItem.customerCode,
                            customerName: oItem.customerName,
                            partNumber: oItem.partNo,
                            partNo: oItem.partNo,
                            quantity: oItem.quantity,
                            requestDate: oItem.requestDate,
                            status: bSuccess ? "Success" : "Failed",
                            errorMessage: bSuccess ? "" : "System error or duplicate PO",
                            message: bSuccess ? 
                                "SO created successfully in ERP system" : 
                                "Failed: System error or duplicate PO"
                        };

                        aResults.push(oResult);
                        iProcessed++;

                        // Update progress
                        var iProgress = Math.round((iProcessed / iTotal) * 100);
                        if (fnProgress) {
                            fnProgress(iProgress, iProcessed);
                        }

                        // Process next item
                        processNext();
                    }, 500); // Simulate API call delay
                };

                processNext();
            });
        },

        /**
         * Check ERP system connection
         */
        checkConnection: function() {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve({
                        status: "Connected",
                        system: "SAP S/4HANA",
                        version: "2023"
                    });
                }, 500);
            });
        },

        /**
         * Get SO details from ERP
         */
        getSODetails: function(sSONumber) {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (!sSONumber) {
                        reject({ message: "SO Number is required" });
                        return;
                    }

                    resolve({
                        soNumber: sSONumber,
                        status: "Open",
                        createdDate: new Date().toISOString(),
                        totalValue: "10000 USD"
                    });
                }, 500);
            });
        }
    };

    return SOUploadService;
});
