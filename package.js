Package.describe({
	summary: 'A synchronous Meteor preloader for external .js and .css libraries'
});

Package.on_use( function ( api ) {

	api.use( 'iron-router', 'client' );

	api.add_files( 'lib/client/route_controller.js', 'client' );

	if ( api.export ) {
		api.export( 'PreloadController', ['client'] );
	}
});
