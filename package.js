Package.describe({
	name   : 'miro:preloader',
	summary: 'A Meteor "lazy-loader" for external .js and .css libraries',
	version: '1.2.0',
	git    : 'https://github.com/MiroHibler/meteor-preloader.git'
});

Package.on_use( function ( api ) {

	api.use( 'iron:router@1.0.0', ['server', 'client'] );

	api.add_files( 'lib/server_route_controller.js', 'server' );
	api.add_files( 'lib/client_route_controller.js', 'client' );

	if ( api.export ) {
		api.export( 'Preloader', ['server', 'client'] );
		api.export( 'PreloadController', ['server', 'client'] );
	}
});
