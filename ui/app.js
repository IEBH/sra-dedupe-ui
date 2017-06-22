require('jquery/dist/jquery.js');
require('bootstrap/dist/css/bootstrap.css');
require('bootstrap/dist/js/bootstrap.js');
require('angular/angular.js');
require('font-awesome/css/font-awesome.css');

angular
	.module('app', [])
	.component('dedupeController', {
		template: `
			<form ng-submit="$ctrl.validate() && $ctrl.submit()" class="form-horizontal">
				<div ng-show="$ctrl.error" class="alert alert-danger">{{$ctrl.error}}</div>

				<div class="form-group">
					<label class="col-sm-3 control-label">Library</label>
					<div class="col-sm-9">
						<input type="file" class="form-control"/>
					</div>
				</div>
				<div class="form-group">
					<div class="pull-right">
						<button type="submit" class="btn btn-success">
							<i class="fa fa-check"></i>
							De-duplicate
						</button>
					</div>
				</div>
			</form>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.error;
			$ctrl.validate = ()=> {
				$ctrl.error = undefined;

				$ctrl.error = 'FIXME: False error';
				return false;
			};

			$ctrl.submit = ()=> {
				console.log('FIXME: SUBMIT!');
			};
		},
	})
