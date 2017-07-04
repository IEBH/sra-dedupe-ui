var electron = require('electron');
require('./css/app.css');
require('./css/drop-mask.css');
require('./css/wizard.css');
require('./css/utility-spacing.css');
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
			<!-- Tab header {{{ -->
			<div class="wizard">
				<div class="wizard-inner">
					<div class="connecting-line"></div>
					<ul class="nav nav-tabs" role="tablist">
						<li ng-class="$ctrl.stage == 'home' ? 'active' : ''">
							<a>
								<span class="round-tab">
									<i class="fa fa-home"></i>
								</span>
								<span class="round-tab-text">Home</span>
							</a>
						</li>
						<li ng-class="$ctrl.stage == 'readFile' ? 'active' : ''">
							<a>
								<span class="round-tab">
									<i class="fa fa-file-o"></i>
								</span>
								<span class="round-tab-text">Read file</span>
							</a>
						</li>
						<li ng-class="$ctrl.stage == 'dedupe' ? 'active' : ''">
							<a>
								<span class="round-tab">
									<i class="fa fa-compress"></i>
								</span>
								<span class="round-tab-text">Deduplicate</span>
							</a>
						</li>
						<li ng-class="$ctrl.stage == 'summary' ? 'active' : ''">
							<a>
								<span class="round-tab">
									<i class="fa fa-line-chart"></i>
								</span>
								<span class="round-tab-text">Summary</span>
							</a>
						</li>
					</ul>
				</div>
			</div>
			<!-- }}} -->
			<div ng-switch="$ctrl.stage">
				<dedupe-select-file ng-switch-when="home"></dedupe-select-file>
				<dedupe-read-file ng-switch-when="readFile"></dedupe-read-file>
				<dedupe-dedupe-file ng-switch-when="dedupe"></dedupe-dedupe-file>
				<dedupe-summary ng-switch-when="summary"></dedupe-summary>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.stage = 'home';
			$scope.$on('setStage', (e, stage) => $ctrl.stage = stage);
			electron.ipcRenderer.on('setStage', (e, newStage) => $scope.$apply(()=> $ctrl.stage = newStage))
		},
	})

	/**
	* Prompt for a file to work with
	*/
	.component('dedupeSelectFile', {
		template: `
			<div class="drop-mask"></div>
			<div class="form-horizontal">
				<div style="display: none">
					<input type="file" class="form-control"/>
				</div>

				<div class="text-center">
					<a ng-click="$ctrl.selectFile()" class="btn btn-success btn-lg">
						<i class="fa fa-upload"></i>
						Select library file...
					</a>
					<div class="text-muted m-t-5">(or drop the file on this window)</div>
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
					$ctrl.processFile(this.files[0]);
				})});
			// }}}

			// Register drop event listener {{{
			$ctrl.dragLeavingTimer;
			angular.element('body')
				.on('dragover', function(e) {
					angular.element('body').addClass('dragging');
					e.stopPropagation();
					e.preventDefault();
					e.originalEvent.dataTransfer.dropEffect = 'copy';
					$timeout.cancel($ctrl.dragLeavingTimer);
				})
				.on('dragleave', function(e) {
					$ctrl.dragLeavingTimer = $timeout(()=> angular.element('body').removeClass('dragging'), 100);
				})
				.on('drop', function(e) {
					e.stopPropagation();
					e.preventDefault();
					if (!e.originalEvent.dataTransfer.files.length) return;
					var dropFile = e.originalEvent.dataTransfer.files[0];
					$ctrl.processFile(dropFile);
				});
			// }}}

			// Process incomming file object {{{
			$ctrl.processFile = file => {
				console.log('PROC', file);
				var filename = file.name.replace(/\\/g,'/').replace( /.*\//,''); // Tidy up the file name
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
				fr.readAsDataURL(file);
			};
			// }}}
		},
	})

	/**
	* Show the status as a we read + dedupe the file
	*/
	.component('dedupeReadFile', {
		template: `
			<div class="container text-center">
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

			$scope.$on('$destroy', ()=> electron.ipcRenderer.removeAllListeners('updateStatus'));
		},
	})

	/**
	* Perform the dedupe operation and show stats
	*/
	.component('dedupeDedupeFile', {
		template: `
			<div class="container text-center">
				<h2>
					<i class="fa fa-spinner fa-spin fa-lg"></i>
					{{$ctrl.status.text}}
				</h2>

				<div ng-if="$ctrl.status.progressPercent !== undefined" class="progress progress-striped active m-t-20">
					<div class="progress-bar progress-bar-striped active" style="width: {{$ctrl.status.progressPercent}}%"></div>
				</div>
				<p class="text-muted" ng-bind="$ctrl.status.progressText"></p>

				<div>
					<div class="btn btn-info">
						<i class="fa fa-list-ul"></i>
						{{$ctrl.status.total | number}} total
					</div>
					<div class="btn btn-warning">
						<i class="fa fa-compress"></i>
						{{$ctrl.status.dupes | number}} dupes
					</div>
				</div>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.status = {
				text: 'Prepairing to dedupe file',
				progressPercent: undefined,
				progressText: undefined,
				total: undefined,
				dupes: undefined,
			};

			electron.ipcRenderer
				.on('updateStatus', (e, newStatus) => $scope.$apply(()=> _.assign($ctrl.status, newStatus)))

			$scope.$on('$destroy', ()=> electron.ipcRenderer.removeAllListeners('updateStatus'));
		},
	})

	/**
	* Show the summary and allow the download of the file
	*/
	.component('dedupeSummary', {
		template: `
			<div class="container text-center">
				<h2>Finished deduplicating</h2>
				<p class="text-muted">{{$ctrl.status.basename}}</p>

				<div>
					<div class="btn btn-info">
						<i class="fa fa-list-ul"></i>
						{{$ctrl.status.total | number}} total
					</div>
					<div class="btn btn-warning">
						<i class="fa fa-compress"></i>
						{{$ctrl.status.dupes | number}} dupes
					</div>
				</div>

				<hr/>

				<div class="row">
					<div class="col-xs-6 col-xs-offset-3">
						<div class="panel panel-default">
							<div class="panel-heading">Download library</div>
							<div class="panel-body">
								<ul class="list-group">
									<a ng-repeat="format in $ctrl.status.formats track by format.id" ng-click="$ctrl.downloadAs(format.id)" class="list-group-item">
										{{format.name}}
										<strong ng-if="format.id == 'endnotexml'">(recommended)</strong>
									</a>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<div class="row text-center">
					<a ng-click="$ctrl.startAgain()" class="btn btn-primary">
						<i class="fa fa-refresh"></i>
						Start again
					</a>
				</div>
			</div>
		`,
		controller: function($scope) {
			var $ctrl = this;

			$ctrl.status = {
				filename: undefined,
				total: undefined,
				dupes: undefined,
				formats: undefined,
			};

			electron.ipcRenderer
				.on('updateStatus', (e, newStatus) => $scope.$apply(()=> _.assign($ctrl.status, newStatus)))

			$scope.$on('$destroy', ()=> electron.ipcRenderer.removeAllListeners('updateStatus'));

			$ctrl.downloadAs = format => electron.ipcRenderer.send('downloadFile', format);
			$ctrl.startAgain = ()=> $scope.$emit('setStage', 'home');
		},
	})
