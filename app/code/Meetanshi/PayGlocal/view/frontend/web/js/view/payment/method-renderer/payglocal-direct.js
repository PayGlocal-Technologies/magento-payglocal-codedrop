define(
    [
        'Magento_Checkout/js/view/payment/default',
        'jquery',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/action/redirect-on-success',
        'Magento_Ui/js/model/messageList',
        'Magento_Checkout/js/model/totals',
        'Magento_Ui/js/modal/modal',
        'mage/url',
        'Magento_Checkout/js/model/payment/additional-validators',
        'Magento_Checkout/js/action/select-payment-method',
        'Magento_Checkout/js/checkout-data'
    ],
    function (Component, $,
              quote,
              fullScreenLoader,
              redirectOnSuccessAction,
              messageContainer,
              totals,
              modal,
              urlBuilder,
              additionalValidators,
              selectPaymentMethodAction,
              checkoutData) {
        'use strict';

        var payglocalResponce, intervalId;
        payglocalResponce = {};
        payglocalResponce ["status"] = "no";
        return Component.extend({
            defaults: {
                template: 'Meetanshi_PayGlocal/payment/payglocal',
                transactionResult: ''
            },
            messageContainer: messageContainer,
            getPayGlocalLogoUrl: function () {
                return window.checkoutConfig.payglocal_imageurl;
            },

            getPayGlocalInstructions: function () {
                return window.checkoutConfig.payglocal_instructions;
            },

            initialize: function () {
                var self = this;
                self._super();
                return self;
            },
            loadPayGlocalJs: function (callback) {
                var scriptEle = document.createElement("script");
                scriptEle.setAttribute("src", window.checkoutConfig.payglocal_scriptUrl);
                scriptEle.setAttribute("type", "text/javascript");
                scriptEle.setAttribute("async", false);
                scriptEle.setAttribute("data-display-mode", window.checkoutConfig.payglocal_mode);
                scriptEle.setAttribute("data-cd-id", window.checkoutConfig.payglocal_cdid);
                document.body.appendChild(scriptEle);
            },

            initObservable: function () {
                this.loadPayGlocalJs(function () {
                });
                this._super()
                    .observe('active');
                return this;
            },

            getCode: function () {
                return 'payglocal';
            },

            getData: function () {
                var data = {
                    'method': this.item.method,
                    'additional_data': {'payglocalResponce': JSON.stringify(payglocalResponce)}
                };
                data['additional_data'] = _.extend(data['additional_data'], this.additionalData);
                return data;
            },
            selectPaymentMethod: function () {
                selectPaymentMethodAction(this.getData());
                checkoutData.setSelectedPaymentMethod(this.item.method);

                if (window.checkoutConfig.payglocal_mode == "inline") {
                    jQuery("button.action.primary.checkout-payglocal").hide();
                    jQuery("button.action.primary.checkout").show();
                    jQuery("#PayGlocal_payments iframe").remove();
                }
                return true;
            },
            realPlaceOrder: function () {
                var self = this;
                this.getPlaceOrderDeferredObject()
                    .fail(
                        function () {
                            self.isPlaceOrderActionAllowed(true);
                            fullScreenLoader.stopLoader(true);
                        }
                    ).done(
                    function () {
                        self.afterPlaceOrder();

                        if (self.redirectAfterPlaceOrder) {
                            redirectOnSuccessAction.execute();
                        }
                    }
                );
            },
            payResponce: function (data) {
                payglocalResponce = data;
                if (payglocalResponce.status == "SENT_FOR_CAPTURE") {
                    this.realPlaceOrder();
                }
            },
            displayPaymentPage: function () {
                var self = this;
                $.ajax({
                    type: 'GET',
                    data: {
                        form_key: $("input[name='form_key']").val()
                    },
                    url: urlBuilder.build('payglocal/index/index'),
                    dataType: "json",
                    success: function (response) {
                        fullScreenLoader.stopLoader(true);
                        if (response.hasOwnProperty('error')) {
                            messageContainer.addErrorMessage({
                                message: response.message
                            });
                        } else {

                            window.PGPay.launchPayment({redirectUrl: response.redirectUrl}, self.payResponce.bind(self));
                            if (window.checkoutConfig.payglocal_mode == "inline") {
                                jQuery("button.action.primary.checkout-payglocal").show();
                                jQuery("button.action.primary.checkout").hide();
                            }
                        }
                    },
                    error: function (err) {
                        fullScreenLoader.stopLoader(true);
                        messageContainer.addErrorMessage({
                            message: err
                        });
                    }
                });

            },
            paymentSubmitStart: function (data, event) {
                window.PGPay.handlePayNow(event);
            },
            tPlaceOrder: function () {
                var self = this;
                if (event) {
                    event.preventDefault();
                }
                if (this.validate() &&
                    additionalValidators.validate() &&
                    this.isPlaceOrderActionAllowed() === true
                ) {
                    fullScreenLoader.startLoader(true);
                    self.displayPaymentPage();
                }
                return false;
            }
        });
    }
);