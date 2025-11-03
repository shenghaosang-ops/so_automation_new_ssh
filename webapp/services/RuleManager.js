/**
 * RuleManager.js
 * Handles customer rule selection, preview, editing, and cancellation
 */
sap.ui.define([], function() {
    "use strict";
    /**
     * RuleManager.js
     * Handles customer rule selection, preview, editing, and cancellation
     */
    var RuleManager = {
        /**
         * 初始化客户规则模型
         * @param {sap.ui.core.mvc.Controller} ctrl
         */
        init: function(ctrl) {
            var oCustomerRulesModel = new sap.ui.model.json.JSONModel({
                customers: [
                    { key: "C001", name: "Customer A" },
                    { key: "C002", name: "Customer B" },
                    { key: "C003", name: "Customer C" }
                ],
                rules: {
                "C001": [
                    "检查客户采购代码CustomerPurchaseCode值是否为YAG-YGO,是的话保留原数据。",
                    "在POItemNo右侧新添一列，列明为PO+POLINE，数值为CONCATENATE（PONO，POItemNo）。",
                    "对PO+POLINE列里的数值进行筛选，保留PO+POLINE中比107774190400640大的数据。",
                    "在BalanceQTY右侧新添一列，列明为QTY，数值为BalanceQTY / 1000。",
                    "在PartNo左侧新添一列，列明为SalesOrderType。如果PartNo的前两个字符包含（AT，RT，P开头的值，RL，RC0100，RC0075，RP，CC0100，500V↑，AC，CQ，CS，CC_105↑（1μF及以上），或RC_P），则销售类型设为ZOR1。如果CustomerPartNO的前两个字符包含（AC，AA，RC0201↑，AF，YC，TC，RE，SR，AS，AH，RV，CC一般产品），则销售类型设为ZCO。",
                    "删除订单状态POStatus为Block或To be cancel的行。",
                    "从数据表中提取以下字段并输出到Excel：CustomerPurchaseCode，PONo，PODate，POItemNo，PO+POLINE，CustomerPartNO，QTY，RequestDate，NetPrice，PartNo，SalesOrderType。"
                ],
                "C002": [
                    "删除Delivery Date列中空白的项目",
                    "删除PO Date列中空白的项目",
                    "在Plant列右侧新添两列，列明为'Sold To'和'Ship To'。Sold To和Ship To的值根据Plant的值来确定：如果Plant为2310，则Sold To为132274，Ship To为132279；如果Plant为2370，则Sold To为132274，Ship To为660076；如果Plant为2350，则Sold To为132274，Ship To为660082；如果Plant为2381，则需要通过检查Part No进行额外区分——如果Part No包含字母'A'，则Sold To和Ship To均为660081，如果Part No不包含字母'A'，则Sold To为132274，Ship To为660075；如果Plant为2380，则需要通过检查Part No进行额外区分——如果Part No包含字母'AAA'，则Sold To和Ship To均为660084，如果Part No不包含字母'A'，则Sold To为132274，Ship To为660077。",
                    "在Delivery Date右侧新添一列，列明为'CRD'。CRD的值为Delivery Date减去20天。",
                    "在Order Qty右侧新添一列，列明为'Quantity'。其值为Order Qty除以1000。",
                    "在Manuf. P/N左侧新添一列，列明为'SalesOrderType'。对于Part No值的前两个字符以（AT，RT，P开头的值，RL，RC0100，RC0075，RP，CC0100，500V↑，AC，CQ，CS，CC_105↑（1μF及以上））和RC_P开头的值，销售类型设为ZOR1。对于CustomerPartNO值的前两个字符以（AC，AA，RC0201↑，AF，YC，TC，RE，SR，AS，AH，RV，CC一般产品）开头的值，销售类型设为ZCO。",
                    "从数据表中提取以下字段并输出到Excel：Vendor NO，PO Number，Item No，Part No，Delivery Date，PO Date，Quantity，Manuf. P/N，Plant，Ship To，SalesOrderType。"
                ],
                "C003": [
                    "Check that Order Qty is greater than 0",
                    "Validate that Plant is in ['PL01', 'PL02', 'PL03']"
                ]
            },   
                selectedCustomer: null,
                currentRules: []
            });
            ctrl.getView().setModel(oCustomerRulesModel, "customerRules");
            // 默认选择第一个客户
            var oCustomerSelect = ctrl.byId("customerSelect");
            if (oCustomerSelect.getItems().length > 0) {
                oCustomerSelect.setSelectedItem(oCustomerSelect.getItems()[0]);
                ctrl.onCustomerChange({
                    getParameter: function(param) {
                        if (param === "selectedItem") {
                            return oCustomerSelect.getSelectedItem();
                        }
                    }
                });
            }
        },

        /**
         * Handles customer selection change event
         * Loads and displays the selected customer's rule set
         */
        onCustomerChange: function(ctrl, oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oCustomerRulesModel = ctrl.getView().getModel("customerRules");
            var oRulePreview = ctrl.byId("rulePreview");
            var oBtnEdit = ctrl.byId("btnEditRule");
            var oBtnCancel = ctrl.byId("btnCancelEditRule");
            var aRules = oCustomerRulesModel.getProperty("/rules/" + sSelectedKey) || [];
            var sFormattedRules = aRules.map(function(rule, idx) {
                return (idx + 1) + ". " + rule;
            }).join("\n");
            oRulePreview.setValue(sFormattedRules);
            oRulePreview.setEditable(false);
            oRulePreview.setValueState("None");
            ctrl._sOriginalRule = sFormattedRules;
            oBtnEdit.setText("Edit Rule");
            oBtnEdit.setEnabled(true);
            oBtnCancel.setVisible(false);
            oCustomerRulesModel.setProperty("/selectedCustomer", sSelectedKey);
            oCustomerRulesModel.setProperty("/currentRules", aRules);
            oRulePreview.setValueState(sap.ui.core.ValueState.None);
        },

        /**
         * Handles the rule editing button event
         * Toggles between edit and preview modes for rule configuration
         */
        onEditRule: function(ctrl) {
            var oRulePreview = ctrl.byId("rulePreview");
            var oBtnEdit = ctrl.byId("btnEditRule");
            var oBtnCancel = ctrl.byId("btnCancelEditRule");
            if (oRulePreview.getEditable()) {
                oRulePreview.setEditable(false);
                oBtnEdit.setText("Edit Rule");
                oBtnCancel.setVisible(false);
                // TODO: Implement rule saving logic
            } else {
                oRulePreview.setEditable(true);
                oBtnEdit.setText("Save");
                oBtnCancel.setVisible(true);
                ctrl._sOriginalRule = oRulePreview.getValue();
            }
        },

        /**
         * Handles the cancellation of rule editing
         * Restores the original rule configuration and resets UI state
         */
        onCancelEditRule: function(ctrl) {
            var oRulePreview = ctrl.byId("rulePreview");
            var oBtnEdit = ctrl.byId("btnEditRule");
            var oBtnCancel = ctrl.byId("btnCancelEditRule");
            oRulePreview.setEditable(false);
            oBtnEdit.setText("Edit Rule");
            oBtnCancel.setVisible(false);
            if (ctrl._sOriginalRule) {
                oRulePreview.setValue(ctrl._sOriginalRule);
            }
            oRulePreview.setValueState(sap.ui.core.ValueState.None);
            ctrl._sOriginalRule = null;
        }
    };

    return RuleManager;
});
