var electron = require('electron');
require('jquery/dist/jquery.js');
require('bootstrap/dist/css/bootstrap.css');
require('bootstrap/dist/js/bootstrap.js');
require('angular/angular.js');
require('font-awesome/css/font-awesome.css');

angular
	.module('app', [])
	.component('dedupeController', {
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

					var fr = new FileReader();
					fr.addEventListener('load', data => {

						console.log('Transmit', filename);
						electron.ipcRenderer
							.send('setFile', {
								filename: filename,
								dataUrl: data.target.result,
							});

					});
					fr.readAsDataURL(this.files[0]);
				})});
			// }}}
		},
	})
