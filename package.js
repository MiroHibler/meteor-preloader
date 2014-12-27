Package.describe({
	name   : 'miro:preloader',
	summary: 'A synchronous/asynchronous Meteor preloader for external .js and .css libraries',
	version: '1.0.3',
	git    : 'https://github.com/MiroHibler/meteor-preloader.git'
});

Package.on_use( function ( api ) {

	api.use(
		'iron:router@1.0.6', 'client'
	);

	api.add_files( 'lib/client/route_controller.js', 'client' );

	if ( api.export ) {
		api.export( 'Preloader', 'client' );
		api.export( 'PreloadController', 'client' );
	}
});
