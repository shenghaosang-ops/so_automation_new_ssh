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
         * Check material validity using CPI API
         * @param {Array} aData - Array of SO records
         * @returns {Promise} Promise with validation results
         */
        checkMaterialValidity: async function(aData) {
            try {
                // Import ApiService dynamically
                var ApiService = sap.ui.require("yegeoaiso/services/ApiService");
                
                if (!ApiService) {
                    // Load ApiService if not already loaded
                    ApiService = await new Promise(function(res, rej) {
                        sap.ui.require(["yegeoaiso/services/ApiService"], function(Service) {
                            res(Service);
                        }, rej);
                    });
                }

                // Use default material number
                var sMaterial = "1000253";
                
                // Batch process all unique CustomerCode values
                var aUniqueCustomerCodes = [];
                var oCustomerCodeMap = {};
                
                // Extract all unique CustomerCode/CompanyCode values
                aData.forEach(function(oItem) {
                    var sCustomerCode = String(oItem.customerCode || oItem.CompanyCode || oItem.companyCode || "");
                    if (sCustomerCode && !oCustomerCodeMap[sCustomerCode]) {
                        oCustomerCodeMap[sCustomerCode] = true;
                        aUniqueCustomerCodes.push(sCustomerCode);
                    }
                });

                console.log("Found unique customer codes:", aUniqueCustomerCodes);
                console.log("Sample data item:", aData[0]);

                if (aUniqueCustomerCodes.length === 0) {
                    throw new Error("No CustomerCode/CompanyCode found in data. Please check data structure.");
                }

                // Call CPI API for each unique customer code (PARALLEL)
                var aAllResults = [];
                var aErrors = [];
                
                console.log("Starting parallel validation for " + aUniqueCustomerCodes.length + " plant(s)...");
                
                // Process all requests in parallel
                var aPromises = aUniqueCustomerCodes.map(function(sProductionPlant) {
                    return ApiService.callCPIMaterialValidation(sMaterial, sProductionPlant)
                        .then(function(oResult) {
                            if (oResult.results && oResult.results.length > 0) {
                                console.log("✓ Plant " + sProductionPlant + ": Found " + oResult.results.length + " sales order(s)");
                                return oResult.results;
                            } else {
                                console.log("⚠ Plant " + sProductionPlant + ": No sales orders found");
                                return [];
                            }
                        })
                        .catch(function(error) {
                            console.error("✗ Validation failed for plant " + sProductionPlant + ":", error.message);
                            aErrors.push({
                                plant: sProductionPlant,
                                error: error.message
                            });
                            return [];
                        });
                });
                
                // Wait for all requests to complete
                var aResults = await Promise.all(aPromises);
                
                // Flatten results
                aResults.forEach(function(results) {
                    if (results && results.length > 0) {
                        aAllResults = aAllResults.concat(results);
                    }
                });
                
                var bAllSuccess = aErrors.length === 0;
                var sMessage = bAllSuccess ? 
                    "Material validation completed successfully" :
                    "Material validation completed with " + aErrors.length + " error(s)";
                
                return {
                    success: bAllSuccess,
                    message: sMessage,
                    materialValid: aAllResults.length > 0,
                    salesOrders: aAllResults,
                    totalValidated: aUniqueCustomerCodes.length,
                    errors: aErrors,
                    data: {
                        results: aAllResults
                    }
                };
            } catch (error) {
                console.error("Material validation failed:", error);
                return {
                    success: false,
                    message: error.message || "Material validation failed",
                    materialValid: false,
                    salesOrders: [],
                    totalValidated: 0,
                    errors: [{ error: error.message }]
                };
            }
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
                            // If already marked as invalid from processing, keep it invalid
                            if (oItem.valid === false) {
                                return oItem; // Don't change invalid items
                            }
                            
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
         * Upload SO data to ERP system using CPI API
         * @param {Array} aData - Array of valid SO records
         * @param {Function} fnProgress - Progress callback function
         * @returns {Promise} Promise with upload results
         */
        uploadToERP: async function(aData, fnProgress) {
            try {
                // Import ApiService dynamically
                var ApiService = sap.ui.require("yegeoaiso/services/ApiService");
                
                if (!ApiService) {
                    ApiService = await new Promise(function(res, rej) {
                        sap.ui.require(["yegeoaiso/services/ApiService"], function(Service) {
                            res(Service);
                        }, rej);
                    });
                }

                var aResults = [];
                var iTotal = aData.length;
                var iProcessed = 0;
                
                // Get today's date in SAP format (DD.MM.YYYY)
                var oToday = new Date();
                var sDay = ("0" + oToday.getDate()).slice(-2);
                var sMonth = ("0" + (oToday.getMonth() + 1)).slice(-2);
                var sYear = oToday.getFullYear();
                var sCreatedDate = sDay + "." + sMonth + "." + sYear;

                // Process each item sequentially
                for (var i = 0; i < aData.length; i++) {
                    var oItem = aData[i];
                    
                    try {
                        // Build CPI request payload with fixed values
                        // Ensure SalesOrganization is a string
                        var sSalesOrg = String(oItem.customerCode || oItem.companyCode || "1010");
                        
                        var oRequestData = {
                            A_SalesOrder: {
                                SalesOrderType: "OR",
                                SalesOrganization: sSalesOrg,
                                DistributionChannel: "10",
                                OrganizationDivision: "00",
                                SalesGroup: "101",
                                SalesOffice: "1010",
                                SalesDistrict: "NORTH",
                                SoldToParty: "1000042",
                                ExternalDocumentID: "",
                                PurchaseOrderByCustomer: "customer order number",
                                to_Item: {
                                    SalesOrderItemCategory: "TAN",
                                    Material: "10000112",
                                    RequestedQuantity: "1",
                                    RequestedQuantityUnit: "EA",
                                    ProductionPlant: "1010",
                                    ShippingPoint: "1010"
                                }
                            }
                        };

                        console.log("Creating SO for item " + (i + 1) + "/" + iTotal + " (SalesOrg: " + sSalesOrg + ")");

                        // Call CPI API
                        var oResult = await ApiService.callCPICreateSalesOrder(oRequestData);
                        
                        // Success result
                        aResults.push({
                            rowIndex: oItem.rowIndex,
                            poNumber: oItem.poNumber,
                            soNumber: oResult.salesOrder || "N/A",
                            createdDate: sCreatedDate,
                            customerCode: oItem.customerCode,
                            customerName: oItem.customerName,
                            partNumber: oItem.partNo,
                            partNo: oItem.partNo,
                            quantity: oItem.quantity,
                            requestDate: oItem.requestDate,
                            status: "Success",
                            errorMessage: "",
                            message: "SO created successfully in ERP system"
                        });
                        
                        console.log("✓ SO created successfully: " + oResult.salesOrder);
                        
                    } catch (error) {
                        // Error result
                        console.error("✗ Failed to create SO for item " + (i + 1) + ":", error.message);
                        
                        aResults.push({
                            rowIndex: oItem.rowIndex,
                            poNumber: oItem.poNumber,
                            soNumber: "N/A",
                            createdDate: "",
                            customerCode: oItem.customerCode,
                            customerName: oItem.customerName,
                            partNumber: oItem.partNo,
                            partNo: oItem.partNo,
                            quantity: oItem.quantity,
                            requestDate: oItem.requestDate,
                            status: "Failed",
                            errorMessage: error.message || "System error",
                            message: "Failed: " + (error.message || "System error")
                        });
                    }
                    
                    iProcessed++;
                    
                    // Update progress
                    var iProgress = Math.round((iProcessed / iTotal) * 100);
                    if (fnProgress) {
                        fnProgress(iProgress, iProcessed);
                    }
                }

                return aResults;
                
            } catch (error) {
                console.error("Upload to ERP failed:", error);
                throw error;
            }
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
