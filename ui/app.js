var electron = require('electron');
require('ui/css/utility-spacing.css');
require('jquery/dist/jquery.js');
require('bootstrap/dist/css/bootstrap.css');
require('bootstrap/dist/js/bootstrap.js');
require('lodash/lodash.js');
require('angular/angular.js');
require('font-awesome/css/font-awesome.css');

angular
	.module('app', [])

	/**
	* Excpetionally simple routing system
	* Uses $ctrl.stage to monitor where we are. Accepts $scope.$emit('setStage') to change the stage we are at
	*/
	.component('dedupeController', {
		template: `
			<div ng-switch="$ctrl.stage">
				<dedupe-select-file ng-switch-when="selectFile"></dedupe-select-file>
				<dedupe-read-file ng-switch-when="readFile"></dedupe-read-file>
				<dedupe-dedupe-file ng-switch-when="dedupe"></dedupe-dedupe-file>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.stage = 'selectFile';
			$scope.$on('setStage', (e, stage) => $ctrl.stage = stage);
		},
	})

	/**
	* Prompt for a file to work with
	*/
	.component('dedupeSelectFile', {
		template: `
			<div class="form-horizontal">
				<div style="display: none">
					<input type="file" class="form-control"/>
				</div>

				<div class="text-center">
					<a ng-click="$ctrl.selectFile()" class="btn btn-success btn-lg">
						<i class="fa fa-upload"></i>
						Select library file...
					</a>
				</div>
			</div>
		`,
		controller: function($element, $scope, $timeout) {
			var $ctrl = this;

			// Register file change listener {{{
			$ctrl.selectFile = ()=> $element.find('input[type=file]').trigger('click');

			$element
				.find('input[type=file]')
				.on('change', function() { $timeout(()=> { // Attach to file widget and listen for change events so we can update the text
					var filename = $(this).val().replace(/\\/g,'/').replace( /.*\//,''); // Tidy up the file name
					if (!filename) return;

					var fr = new FileReader();
					fr.addEventListener('load', data => {

						console.log('Transmit', filename);
						electron.ipcRenderer
							.send('setFile', {
								filename: filename,
								dataUrl: data.target.result,
							});

						$scope.$apply(()=> $scope.$emit('setStage', 'readFile'));
					});
					fr.readAsDataURL(this.files[0]);
				})});
			// }}}
		},
	})

	/**
	* Show the status as a we read + dedupe the file
	*/
	.component('dedupeReadFile', {
		template: `
			<div class="form-horizontal text-center">
				<h2>
					<i class="fa fa-spinner fa-spin fa-lg"></i>
					{{$ctrl.status.text}}
				</h2>

				<div ng-if="$ctrl.status.progressPercent !== undefined" class="progress progress-striped active m-t-20">
					<div class="progress-bar progress-bar-striped active" style="width: {{$ctrl.status.progressPercent}}%"></div>
				</div>
				<p class="text-muted" ng-bind="$ctrl.status.progressText"></p>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.status = {
				text: 'Opening file',
				progressPercent: undefined,
				progressText: undefined,
			};

			electron.ipcRenderer
				.on('updateStatus', (e, newStatus) => $scope.$apply(()=> _.assign($ctrl.status, newStatus)))
				.on('readLibrary', ()=> $scope.$apply(()=> $scope.$emit('setStage', 'dedupe')))
		},
	})

	/**
	* Perform the dedupe operation and show stats
	*/
	.component('dedupeDedupeFile', {
		template: `
			<div class="form-horizontal text-center">
				<h2>
					<i class="fa fa-spinner fa-spin fa-lg"></i>
					{{$ctrl.status.text}}
				</h2>

				<div ng-if="$ctrl.status.progressPercent !== undefined" class="progress progress-striped active m-t-20">
					<div class="progress-bar progress-bar-striped active" style="width: {{$ctrl.status.progressPercent}}%"></div>
				</div>
				<p class="text-muted" ng-bind="$ctrl.status.progressText"></p>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.status = {
				text: 'Prepairing to dedupe file',
				progressPercent: undefined,
				progressText: undefined,
			};

			electron.ipcRenderer
				.on('updateStatus', (e, newStatus) => $scope.$apply(()=> _.assign($ctrl.status, newStatus)))
				.on('readLibrary', ()=> $scope.$apply(()=> $scope.$emit('setStage', 'dedupe')))
		},
	})
