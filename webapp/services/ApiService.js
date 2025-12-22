/**
 * ApiService.js
 * Handles all API calls for batch processing
 */
sap.ui.define([], function() {
    "use strict";
    /**
     * ApiService.js
     * Handles all API calls for batch processing
     */
    var ApiService = {
        /**
         * 调用批次处理API
         * @param {Object} oRequest API请求对象
         * @returns {Promise<Object>} API响应对象
         */
        callBatchAPI: async function(oRequest) {
            console.log("Calling API to process batch " + oRequest.options.batchInfo.batchIndex);
            try {
                var response = await fetch('https://yageo-poc-backend-grateful-aardvark-kn.cfapps.eu12.hana.ondemand.com/v1/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(oRequest)
                });
                if (response.status !== 200) {
                    var sErrorText = await response.text();
                    throw new Error("API call failed: " + response.status + " " + response.statusText + ". " + sErrorText);
                }
                var responseData = await response.json();
                if (responseData.status !== "success") {
                    throw new Error("API processing failed");
                }
                return {
                    success: true,
                    data: responseData.results || [],
                    summary: {
                        totalRows: responseData.processed_count,
                        validRows: responseData.results ? responseData.results.filter(function(r){return r.valid;}).length : 0,
                        invalidRows: responseData.results ? responseData.results.filter(function(r){return !r.valid;}).length : 0
                    }
                };
            } catch (error) {
                console.error("Batch " + oRequest.options.batchInfo.batchIndex + " API call failed:", error);
                throw error;
            }
        },

        /**
         * Call BPA API to trigger file download
         * @param {string} sWebsiteUrl Website URL for downloading
         * @returns {Promise<Object>} API response object
         */
        callBPATriggerAPI: async function(sWebsiteUrl) {
            console.log("Calling BPA trigger API with URL:", sWebsiteUrl);
            try {
                var response = await fetch('https://yageo-poc-backend-grateful-aardvark-kn.cfapps.eu12.hana.ondemand.com/v1/bpa/trigger', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        website: sWebsiteUrl
                    })
                });

                if (!response.ok) {
                    var sErrorText = await response.text();
                    throw new Error("BPA API call failed: " + response.status + " " + response.statusText + ". " + sErrorText);
                }

                var responseData = await response.json();
                
                // Log the response for debugging
                console.log("BPA API Response:", JSON.stringify(responseData, null, 2));
                
                if (responseData.status !== "success") {
                    throw new Error("BPA process triggering failed: " + (responseData.message || "Unknown error"));
                }

                return {
                    success: true,
                    message: responseData.message,
                    jobUid: responseData.data && responseData.data.jobUid,
                    data: responseData.data || {},
                    rawResponse: responseData
                };
            } catch (error) {
                console.error("BPA trigger API call failed:", error);
                throw error;
            }
        },

        /**
         * Call CPI API to check material validity
         * @param {string} sMaterial Material number
         * @param {string} sProductionPlant Production plant (CustomerCode)
         * @returns {Promise<Object>} API response object
         */
        callCPIMaterialValidation: async function(sMaterial, sProductionPlant) {
            console.log("Calling CPI material validation API with material:", sMaterial, "plant:", sProductionPlant);
            try {
                var response = await fetch('https://yageo-poc-backend-grateful-aardvark-kn.cfapps.eu12.hana.ondemand.com/v1/cpi/salesorder/get', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        Material: sMaterial,
                        ProductionPlant: sProductionPlant
                    })
                });

                if (!response.ok) {
                    var sErrorText = await response.text();
                    throw new Error("CPI API call failed: " + response.status + " " + response.statusText + ". " + sErrorText);
                }

                var responseData = await response.json();
                
                console.log("CPI API Response:", JSON.stringify(responseData, null, 2));
                
                if (responseData.status !== "success") {
                    throw new Error("CPI material validation failed: " + (responseData.message || "Unknown error"));
                }

                return {
                    success: true,
                    message: responseData.message,
                    data: responseData.data,
                    results: responseData.data && responseData.data.results
                };
            } catch (error) {
                console.error("CPI material validation API call failed:", error);
                throw error;
            }
        },

        /**
         * Call CPI API to create sales order
         * @param {Object} oSalesOrderData Sales order data
         * @returns {Promise<Object>} API response object
         */
        callCPICreateSalesOrder: async function(oSalesOrderData) {
            console.log("Calling CPI create sales order API with data:", oSalesOrderData);
            try {
                var response = await fetch('https://yageo-poc-backend-grateful-aardvark-kn.cfapps.eu12.hana.ondemand.com/v1/cpi/salesorder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(oSalesOrderData)
                });

                if (!response.ok) {
                    var sErrorText = await response.text();
                    throw new Error("CPI create SO API failed: " + response.status + " " + response.statusText + ". " + sErrorText);
                }

                var responseData = await response.json();
                
                console.log("CPI Create SO Response:", JSON.stringify(responseData, null, 2));
                
                if (responseData.status !== "success") {
                    throw new Error("CPI SO creation failed: " + (responseData.message || "Unknown error"));
                }

                return {
                    success: true,
                    message: responseData.message,
                    salesOrder: responseData.data && responseData.data.SalesOrder,
                    data: responseData.data
                };
            } catch (error) {
                console.error("CPI create SO API call failed:", error);
                throw error;
            }
        }
    };

    return ApiService;
});
