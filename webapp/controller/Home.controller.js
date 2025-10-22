sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function(Controller, History) {
    "use strict";

    return Controller.extend("yegeoaiso.controller.Home", {
        
        onInit: function() {
            // Initialize home page
        },

        /**
         * Navigate to Data Acquisition page
         */
        onNavigateToDataAcquisition: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("DataAcquisition");
        },

        /**
         * Navigate to SO Automation page (current View1)
         */
        onNavigateToSOAutomation: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1");
        },

        /**
         * Navigate to SO Upload page
         */
        onNavigateToSOUpload: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("SOUpload");
        },

        /**
         * Navigate to Email Notification page
         */
        onNavigateToEmailNotification: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("EmailNotification");
        }
    });
});
