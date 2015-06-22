Package.describe({
	name   : 'miro:preloader',
	summary: 'A Meteor "lazy-loader" for external .js and .css libraries',
	version: '1.2.3',
	git    : 'https://github.com/MiroHibler/meteor-preloader.git'
});

Package.onUse( function ( api ) {

	api.use([
		'underscore@1.0.3',
		'iron:router@1.0.0'
	], [ 'server', 'client' ] );

	api.addFiles( 'lib/server_route_controller.js', 'server' );
	api.addFiles( 'lib/client_route_controller.js', 'client' );

	if ( api.export ) {
		api.export( 'Preloader', [ 'server', 'client' ] );
		api.export( 'PreloadController', [ 'server', 'client' ] );
	}
});
