// v1.1.0

Preloader = {

	loadLibs        : function ( controller ) {

		var self            = this,
			thisRoute       = controller.route,
			currentStyles   = [],

			loadStyles      = function () {
				var styles = thisRoute._libs.sources.styles,
					totalStylesFiles = styles.length;

				// Remove current styles
				$( 'link[rel*=preload]' ).remove();

				if ( styles.length ) {
					var styleCounter = 0;

					// console.info( '[Preloader - Styles] Loading initiated...' );

					$.map( styles, function ( styleFile ) {
						styleCounter++;

						$( 'head' ).append( '<link rel="preload stylesheet" type="text/css" href="' + styleFile + '"/>' );

						console.info( '[Preloader - Styles] Loading ' + styleCounter + '/' + totalStylesFiles + ': ' + styleFile );
					});

					// console.info( '[Preloader - Styles] Loading finished.' );
				}
			},

			loadAsync       = function () {

				var asyncLibs = thisRoute._libs.sources.async,
					asyncHandler = thisRoute._libs.onAsync;

				self._totalAsyncFiles = asyncLibs.length;

				if ( asyncLibs.length ) {
					self._asyncCounter    = 0;

					// console.info( '[Preloader - Async] Loading initiated...' );

					_.map( asyncLibs, function ( asyncLib ) {
						self._asyncCounter++;

						// console.info( '[Preloader - Async] Loading ' + self._asyncCounter + '/' + self._totalAsyncFiles + ': ' + asyncLib );

						$.getScript( asyncLib )
							.done( function ( script, textStatus ) {

								// console.info( '[Preloader - Async] Loading ' + asyncLib + ': SUCCESS' );

								// Update list of loaded resources, so we don't re-load them
								Preloader.updateCachedList({
									async: [asyncLib]
								});

								if ( asyncHandler ) {
									asyncHandler( null, {
										// Send SUCCESS info back
										fileName  : asyncLib,
										script    : script,
										status    : textStatus,
										counter   : self._asyncCounter,
										totalFiles: self._totalAsyncFiles
									});
								}
							})
							.fail( function ( jqxhr, textStatus, exception ) {

								console.error( '[Preloader - Async] Loading ' + asyncLib + ': ERROR - ' + jqxhr.status + ' (\'' + textStatus + '\'): \'' + exception.message + '\'' );

								if ( asyncHandler ) {
									asyncHandler({
										// Send Error info back
										fileName  : asyncLib,
										jqxhr     : jqxhr,
										status    : textStatus,
										exception : exception,
										counter   : self._asyncCounter,
										totalFiles: self._totalAsyncFiles
									});
								}
							});
					});

					// console.info( '[Preloader - Async] Initialization finished.' );
				} else {
					// console.info( '[Preloader - Async] All libraries already loaded.' );
				}
			},

			loadSync        = function () {
				var syncLibs    = thisRoute._libs,
					syncHandler = thisRoute._libs.onSync;

				if ( syncLibs.sources.sync.length && !syncLibs.ready ) {

					// console.info( '[Preloader - Sync] Loading initiated...' );

					self._totalLibFiles = syncLibs.sources.sync.length;
					self._libCounter    = 1;

					self._lib           = {
						source   : syncLibs.sources.sync[0],
						isLoaded : false,
						isChecked: false,
						deps     : {
							loaded : new Tracker.Dependency,
							checked: new Tracker.Dependency,
						}
					};

					self._isLoaded      = function () {
						self._lib.deps.loaded.depend();

						return self._lib.isLoaded;
					};

					self._isChecked     = function () {
						self._lib.deps.checked.depend();

						return self._lib.isChecked;
					};

					self._preloadLib    = function () {

						// console.info( '[Preloader - Sync] Loading ' + self._libCounter + '/' + self._totalLibFiles + ': ' + self._lib.source );

						$.getScript( self._lib.source )
							.done( function ( script, textStatus ) {
								self._libCounter++;
								self._lib.isLoaded = true;
								self._lib.deps.loaded.changed();
							})
							.fail( function ( jqxhr, textStatus, exception ) {
								// TODO: Better error handling
								console.error( '[Preloader - Sync] Loading ' + self._libCounter + '/' + self._totalLibFiles + ': ERROR - ' + jqxhr.status + ' (\'' + textStatus + '\'): \'' + exception.message + '\'' );
							});
					};

					self._preloadCheck  = function () {
						// Call user's handler method(s) to let them
						// check if library finished initialization
						var timeOut  = 2,	// seconds
							// Prevent endless run
							timer    = setTimeout( function () {
								self._lib.isChecked = true;

								clearTimeout( timer );
								clearInterval( interval );

								self._lib.deps.checked.changed();

								console.error( '[Preloader - Sync] Loading check: ERROR - Timeout' );
							}, timeOut * 1000 ),

							interval = setInterval( function () {
								// Wait for library to finish loading
								try {
									self._lib.isChecked = syncHandler( self._lib.source );

									if ( self._lib.isChecked ) {

										clearTimeout( timer );
										clearInterval( interval );

										self._lib.deps.checked.changed();

										// console.info( '[Preloader - Sync] Loading check: SUCCESS' );

										// Update list of loaded resources, so we don't re-load them
										Preloader.updateCachedList({
											sync: [self._lib.source]
										});
									}
								} catch ( error ) {
									console.error( '[Preloader - Sync] Loading check: ERROR - ' + error.message );
								}
							}, 0 );	// Run as often as possible
					};

					self._deps          = Tracker.autorun( function () {

						if ( self._isLoaded() ) {

							if ( self._isChecked() ) {

								syncLibs.sources.sync.shift();

								if ( syncLibs.sources.sync.length > 0 ) {
									self._lib.source = syncLibs.sources.sync[0];
									self._lib.isLoaded = false;
									self._lib.isChecked = false;
									self._lib.deps.loaded.changed();
									self._lib.deps.checked.changed();
									self._preloadLib();
								} else {
									// We're done.
									self._deps.stop();

									// console.info( '\n[Preloader - End] Loading route "' + syncLibs.controller.route.getName() + '" finished.\n' );

									syncLibs.ready = true;
									syncLibs.readyDeps.changed();

									// Because of https://github.com/EventedMind/iron-router/issues/554
									syncLibs.controller.render();
								}
							} else if ( syncHandler ) {
								self._preloadCheck();
							} else {
								// Continue with loading if there are no preload check handlers
								// Update list of loaded resources anyway, so we don't re-load them
								Preloader.updateCachedList({
									sync: [self._lib.source]
								});

								self._lib.isChecked = true;
								self._lib.deps.checked.changed();
							}
						}
					});

					self._preloadLib();

				} else {
					syncLibs.ready = true;
					syncLibs.readyDeps.changed();
				}

				return {
					// Return object with ready() method to be called to check the status
					ready: function () {
						syncLibs.readyDeps.depend();

						return syncLibs.ready;
					}
				};
			},

			routeName       = thisRoute.getName(),

			routeLibs       = _.defaults( {}, thisRoute.options.preload ),
			// These get overridden by route's settings!
			controllerLibs  = _.defaults( {}, controller.preload ),
			routerLibs      = _.defaults( {}, controller.router.options.preload );

		// console.info( '\n[Preloader - Start] Loading route "' + routeName + '"...\n\n' );

		$( 'link[rel*=preload]' ).each( function() {
			currentStyles.push( $( this ).attr( 'href' ) );
		});

		if ( !self.router ) {
			self.router = controller.router;
		}

		if ( !self.router._libs ) {
			self.router._libs = {
				async   : [],
				sync    : []
			};
		}

		if ( !thisRoute._libs ) {
			thisRoute._libs = {
				controller: controller,
				sources   : {
					styles    : [],
					async     : [],
					sync      : []
				},
				onAsync   : null,
				onSync    : null,
				ready     : false,
				readyDeps : new Tracker.Dependency
			};
		}

		// Router Libraries
		if ( routerLibs.styles && typeof routerLibs.styles == 'string' ) {
			routerLibs.styles = ( routerLibs.styles === '' ) ? [] : [routerLibs.styles];
		}

		if ( routerLibs.async && typeof routerLibs.async == 'string' ) {
			routerLibs.async = ( routerLibs.async === '' ) ? [] : [routerLibs.async];
		}

		if ( routerLibs.sync && typeof routerLibs.sync == 'string' ) {
			routerLibs.sync = ( routerLibs.sync === '' ) ? [] : [routerLibs.sync];
		}

		if ( routerLibs.onAsync && typeof routerLibs.onAsync == 'function' ) {
			thisRoute._libs.onAsync = routerLibs.onAsync;
		}

		if ( routerLibs.onSync && typeof routerLibs.onSync == 'function' ) {
			thisRoute._libs.onSync = routerLibs.onSync;
		}

		// Route Controller Libraries
		if ( controllerLibs.styles && typeof controllerLibs.styles == 'string' ) {
			controllerLibs.styles = ( controllerLibs.styles === '' ) ? [] : [controllerLibs.styles];
		}

		if ( controllerLibs.async && typeof controllerLibs.async == 'string' ) {
			controllerLibs.async = ( controllerLibs.async === '' ) ? [] : [controllerLibs.async];
		}

		if ( controllerLibs.sync && typeof controllerLibs.sync == 'string' ) {
			controllerLibs.sync = ( controllerLibs.sync === '' ) ? [] : [controllerLibs.sync];
		}

		if ( controllerLibs.onAsync && typeof controllerLibs.onAsync == 'function' ) {
			thisRoute._libs.onAsync = controllerLibs.onAsync;
		}

		if ( controllerLibs.onSync && typeof controllerLibs.onSync == 'function' ) {
			thisRoute._libs.onSync = controllerLibs.onSync;
		}

		// Route Libraries
		if ( routeLibs.styles && typeof routeLibs.styles == 'string' ) {
			routeLibs.styles = ( routeLibs.styles === '' ) ? [] : [routeLibs.styles];
		}

		if ( routeLibs.async && typeof routeLibs.async == 'string' ) {
			routeLibs.async = ( routeLibs.async === '' ) ? [] : [routeLibs.async];
		}

		if ( routeLibs.sync && typeof routeLibs.sync == 'string' ) {
			routeLibs.sync = ( routeLibs.sync === '' ) ? [] : [routeLibs.sync];
		}

		if ( routeLibs.onAsync && typeof routeLibs.onAsync == 'function' ) {
			thisRoute._libs.onAsync = routeLibs.onAsync;
		}

		if ( routeLibs.onSync && typeof routeLibs.onSync == 'function' ) {
			thisRoute._libs.onSync = routeLibs.onSync;
		}

		// Consolidate libraries
		// Route settings override Route Controller settings,
		// which in turn override Router.configure() settings
		thisRoute._libs.sources = _.defaults(
			routeLibs,
			controllerLibs,
			routerLibs
		);

		// Get rid of duplicates
		thisRoute._libs.sources.styles = _.difference(
			thisRoute._libs.sources.styles,
			currentStyles
		);
		thisRoute._libs.sources.async  = _.difference(
			thisRoute._libs.sources.async,
			controller.router._libs.async
		);
		thisRoute._libs.sources.sync  = _.difference(
			thisRoute._libs.sources.sync,
			controller.router._libs.sync
		);

		if (
			thisRoute._libs.sources.styles.length &&
			!thisRoute._libs.sources.styles[thisRoute._libs.sources.styles.length - 1]
		) {
			thisRoute._libs.sources.styles.pop();
		}

		if (
			thisRoute._libs.sources.async.length &&
			!thisRoute._libs.sources.async[thisRoute._libs.sources.async.length - 1]
		) {
			thisRoute._libs.sources.async.pop();
		}

		if (
			thisRoute._libs.sources.sync.length &&
			!thisRoute._libs.sources.sync[thisRoute._libs.sources.sync.length - 1]
		) {
			thisRoute._libs.sources.sync.pop();
		}

		// Finally, load the resources
		if ( thisRoute._libs.sources.styles.length ) {
			loadStyles();
		}

		if ( thisRoute._libs.sources.async.length ) {
			loadAsync();
		// } else {
		// 	console.info( '[Preloader - Async] All libraries are already loaded.' );
		}

		if ( thisRoute._libs.sources.sync.length ) {
			thisRoute._libs.ready = false;
			thisRoute._libs.readyDeps.changed();

			return loadSync();
		} else {
			thisRoute._libs.ready = true;
			thisRoute._libs.readyDeps.changed();

			// console.info( '[Preloader - Sync] All libraries are already loaded.' );
		}

		// console.info( '\n[Preloader - End] Loading route "' + routeName + '" finished.\n' );

		return {
			// Return object with ready() method to be called to check the status
			ready: function () {
				// We're okay
				return true;
			}
		};
	},

	updateCachedList: function ( loadingList ) {
		var self = this;

		for ( var key in loadingList ) {
			self.router._libs[key] = _.unique( _.union( self.router._libs[key] || [], loadingList[key] ) );
		}
	}
};

if ( typeof PreloadController === 'undefined' ) {
	PreloadController = RouteController.extend({
		waitOn: function () {
			return Preloader.loadLibs( this );
		},

		onStop: function () {
			// Handle route redirection
			var self = this;

			if ( !self.route._libs.ready ) {
				if ( self._deps ) {
					self._deps.stop();
				}

				self.route._libs.ready = false;
				self.route._libs.readyDeps.changed();

				console.warn( '\n[Preloader - Stop] Loading for route "' + self.route._libs.controller.route.getName() + '" interrupted! (probably redirection...)\n' );
			}
		}
	});
}
