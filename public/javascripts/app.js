var app = angular.module('snapcardApp', ['ui.bootstrap']);

app.config(function ($compileProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(http|bitcoin):/);
});

app.controller('mainController', function ($scope, $http, $modal) {
	$scope.generateInvoice = function () {
		$scope.invoiceReady = false;

		var modalInstance = $modal.open({
			templateUrl: 'invoiceModal.html',
			scope: $scope,
			backdrop: 'static'
	    });

		$http.get('/invoice/new')
		.success(function (response) {
			$scope.invoiceReady = true;
			$scope.invoiceValue = response.value;
			$scope.actualValue = response.value;
			$scope.invoiceId = response.invoiceId;
			$scope.invoiceStatus = response.status;
			$scope.invoiceAddress = response.snapcardAddress;

			// "Listen" for invoice payment
			var checkPayment = function () {
				$http.get('/invoice/' + $scope.invoiceId + '/json')
				.success(function (response) {
					if (response.invoiceStatus != 'unpaid') {
						$scope.invoicePaid = true;
						$scope.paidAmount = response.paidValue;
						$scope.invoiceStatus = response.invoiceStatus;
						$scope.actualValue = response.invoiceValue - response.paidValue;
						return;
					}

					setTimeout(function () {
						checkPayment();
					}, 5000);
				});
			};

			checkPayment();
			console.log('Opa opa, invoice:', response);
		});
	};
});