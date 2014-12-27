Preloader = {

	init            : function ( controller ) {
		var self = this;

		if ( !self.router ) {
			self.router = controller.router;
		}

		if ( !self.router._libs ) {
			self.router._libs = {
				sources	: {
					css	: [],
					js	: []
				}
			};
		}
	},

	loadAsync       : function ( preloadHandler ) {

		var self = this,
			asyncLibs = _.difference( self.router._async.js, self.router._libs.sources.js );

		self._asyncCounter		= 0;
		self._totalAsyncFiles	= asyncLibs.length;

		if ( asyncLibs.length ) {
			console.info( '[Preloader - Async] Loading initiated...' );

			_.map( asyncLibs, function ( asyncLib ) {
				self._asyncCounter++;
				console.info( '[Preloader - Async] Loading ' + self._asyncCounter + '/' + self._totalAsyncFiles + ': ' + asyncLib );

				$.getScript( asyncLib )
					.done( function ( script, textStatus ) {
						console.info( '[Preloader - Async] Loading ' + asyncLib + ': SUCCESS' );

						// Update list of loaded resources, so we don't re-load them
						Preloader.updateCachedList({
							js: [asyncLib]
						});

						if ( preloadHandler ) {
							preloadHandler( null, {	// Send SUCCESS info back
								file		: asyncLib,
								script		: script,
								status		: textStatus,
								counter		: self._asyncCounter,
								totalFiles	: self._totalAsyncFiles
							});
						}
					})
					.fail( function ( jqxhr, textStatus, exception ) {
						console.error( '[Preloader - Async] Loading ' + asyncLib + ': ERROR - ' + jqxhr.status + ' (\'' + textStatus + '\'): \'' + exception.message + '\'' );
						if ( preloadHandler ) {
							preloadHandler({	// Send ERROR info back
								file		: asyncLib,
								jqxhr		: jqxhr,
								status		: textStatus,
								exception	: exception,
								counter		: self._asyncCounter,
								totalFiles	: self._totalAsyncFiles
							});
						}
					});
			});

			console.info( '[Preloader - Async] Initialization finished.' );
		} else {
			console.info( '[Preloader - Async] All libraries already loaded.' );
		}
	},

	loadSync        : function ( syncLibs, preloadHandlers ) {

		var self = this;

		if ( preloadHandlers ) {
			if ( typeof preloadHandlers == 'function' ) {
				preloadHandlers = [ preloadHandlers ];
			}
		} else {
			preloadHandlers = [];
		}

		if ( syncLibs.sources.css.length && !syncLibs.ready.css ) {
			var totalCssFiles	= syncLibs.sources.css.length,
				cssCounter		= 0;

			console.info( '[Preloader - StyleSheets] Loading initiated...' );

			$.map( syncLibs.sources.css, function ( cssFile ) {
				cssCounter++;

				$( 'head' ).append( '<link rel="stylesheet" type="text/css" href="' + cssFile + '"/>' );

				console.info( '[Preloader - StyleSheets] Loading ' + cssCounter + '/' + totalCssFiles + ': ' + cssFile );
			});

			// Update list of loaded resources, so we don't re-load them
			Preloader.updateCachedList({
				css: syncLibs.sources.css
			});

			console.info( '[Preloader - StyleSheets] Loading finished.' );
		}

		syncLibs.ready.css = true;
		syncLibs.readyDeps.css.changed();

		if ( syncLibs.sources.js.length && !syncLibs.ready.js ) {

			console.info( '[Preloader - JavaScripts] Loading initiated...' );

			self._totalJsFiles	= syncLibs.sources.js.length;
			self._jsCounter		= 1;

			self._lib			= {
				source		: syncLibs.sources.js[0],
				isLoaded	: false,
				isChecked	: false,
				deps		: {
					loaded	: new Tracker.Dependency,
					checked	: new Tracker.Dependency,
				}
			};

			self._isLoaded		= function () {
				self._lib.deps.loaded.depend();

				return self._lib.isLoaded;
			};

			self._isChecked		= function () {
				self._lib.deps.checked.depend();

				return self._lib.isChecked;
			};

			self._preloadJs		= function () {

				console.info( '[Preloader - JavaScripts] Loading ' + self._jsCounter + '/' + self._totalJsFiles + ': ' + self._lib.source );

				$.getScript( self._lib.source )
					.done( function ( script, textStatus ) {
						self._jsCounter++;
						self._lib.isLoaded = true;
						self._lib.deps.loaded.changed();
					})
					.fail( function ( jqxhr, textStatus, exception ) {
						// TODO: Better error handling
						console.error( '[Preloader - JavaScripts] Loading ' + self._jsCounter + '/' + self._totalJsFiles + ': ERROR - ' + jqxhr.status + ' (\'' + textStatus + '\'): \'' + exception.message + '\'' );
					});
			};

			self._preloadCheck	= function ( preloadChecks ) {
				// Call user's handler method(s) to let them
				// check if library finished initialization
				var timeOut		= 2,	// seconds

					timer		= setTimeout( function () {	// Prevent endless run
						self._lib.isChecked = true;

						clearTimeout( timer );
						clearInterval( interval );

						self._lib.deps.checked.changed();

						console.error( '[Preloader - JavaScripts] Loading check: ERROR - Timeout' );

					}, timeOut * 1000 ),

					interval	= setInterval( function () {
						// Wait for library to finish loading
						try {
							for ( var preloadCheck in preloadChecks ) {
								self._lib.isChecked = preloadChecks[preloadCheck]( self._lib.source );

								if ( self._lib.isChecked ) {

									clearTimeout( timer );
									clearInterval( interval );

									self._lib.deps.checked.changed();

									console.info( '[Preloader - JavaScripts] Loading check: SUCCESS' );

									// Update list of loaded resources, so we don't re-load them
									Preloader.updateCachedList({
										js: [self._lib.source]
									});

									break;	// Break the loop
								}
							}
						} catch ( error ) {
							console.error( '[Preloader - JavaScripts] Loading check: ERROR - ' + error.message );
						}
					}, 0 );	// Run as often as possible
			};

			self._deps = Tracker.autorun( function () {
				if ( self._isLoaded() ) {
					if ( self._isChecked() ) {
						syncLibs.sources.js.shift();
						if ( syncLibs.sources.js.length > 0 ) {
							self._lib.source = syncLibs.sources.js[0];
							self._lib.isLoaded = false;
							self._lib.isChecked = false;
							self._lib.deps.loaded.changed();
							self._lib.deps.checked.changed();
							self._preloadJs();
						} else {
							// We're finished
							self._deps.stop();

							console.info( '[Preloader - JavaScripts] Loading finished.' );
							console.info( '\n[Preloader - End] Loading route "' + syncLibs.controller.route.getName() + '" finished.\n' );

							syncLibs.ready.js = true;
							syncLibs.readyDeps.js.changed();

							// Because of https://github.com/EventedMind/iron-router/issues/554
							syncLibs.controller.render();

							// We're finished, so load any async libraries
							if ( self.router._async && self.router._async.js.length ) {
								var preload = self.router.options.preload;
								self.loadAsync( ( preload && preload.async && preload.async.handler ) ? preload.async.handler : null );
							}
						}
					} else if ( preloadHandlers.length ) {
						self._preloadCheck( preloadHandlers );
					} else {
						// Continue with loading if there are no preload check handlers
						// Update list of loaded resources anyway, so we don't re-load them
						Preloader.updateCachedList({
							js: [self._lib.source]
						});

						self._lib.isChecked = true;
						self._lib.deps.checked.changed();
					}
				}
			});

			self._preloadJs();

		} else {
			syncLibs.ready.js = true;
			syncLibs.readyDeps.js.changed();
		}

		return {
			// Return object with ready() method to be called to check the status
			ready: function () {
				syncLibs.readyDeps.css.depend();
				syncLibs.readyDeps.js.depend();

				return syncLibs.ready.css && syncLibs.ready.js;
			}
		};
	},

	flagLibs        : function ( syncLibs, flag ) {
		syncLibs.ready.css = flag;
		syncLibs.readyDeps.css.changed();
		syncLibs.ready.js = flag;
		syncLibs.readyDeps.js.changed();
	},

	updateCachedList: function ( loadingList ) {
		var self = this;

		// This will handle both .css and .js properties
		for ( var key in loadingList ) {
			self.router._libs.sources[key] = _.unique( _.union( self.router._libs.sources[key] || [], loadingList[key] ) );
		}
	}
};

if ( typeof PreloadController === 'undefined' ) {
	PreloadController = RouteController.extend({
		preload: function () {
			// http://stackoverflow.com/a/10769621/775286
			var message = '\n\n[meteor-preloader] You\'ve made a call to deprecated method \'preload\'.\n\n' +
							'Please consult the documentation at https://github.com/MiroHibler/meteor-preloader for current usage.\n\n';
			console.log( '%c' + message, 'color:yellow;font-weight:bold;' );
		},

		onRun  : function () {
			var self = this,
				preload = self.router.options.preload;

			Preloader.init( self );

			if ( !self.router._async ) {
				if ( preload && preload.async ) {
					self.router._async = {
						js: preload.async.js || []
					};
				}
			}

			self.next();
		},

		waitOn : function () {
			var self                = this,
				routeName           = self.route.getName(),
				routeLibs           = self.route.options.preload || {},
				// These get overridden by route's settings!
				routeControllerLibs = self.preload || {},
				routerLibs          = self.router.options.preload || {},
				commonLibs          = ( routerLibs.sync ) ? routerLibs.sync.common || {} : {},
				// These also get overridden by route's settings!
				defaultLibs         = ( routerLibs.sync ) ? routerLibs.sync.default || {} : {},
				preloadHandlers     = [];

			console.info( '\n[Preloader - Start] Loading route "' + routeName + '"...\n' );

			Preloader.init( self );

			if ( !self.route._libs ) {
				self.route._libs = {
					controller	: self,
					sources		: {
						css	: [],
						js	: []
					},
					ready		: {
						css	: false,
						js	: false
					},
					readyDeps	: {
						css	: new Tracker.Dependency,
						js	: new Tracker.Dependency
					}
				};
			}

			if ( commonLibs.css && typeof commonLibs.css == 'string' ) {

				commonLibs.css = ( commonLibs.css === '' ) ? [] : [ commonLibs.css ];
			}
			if ( commonLibs.js && typeof commonLibs.js == 'string' ) {

				commonLibs.js = ( commonLibs.js === '' ) ? [] : [ commonLibs.js ];
			}
			if ( commonLibs.handler ) {

				preloadHandlers.push( commonLibs.handler );
			}

			if ( defaultLibs.css && typeof defaultLibs.css == 'string' ) {

				defaultLibs.css = ( defaultLibs.css === '' ) ? [] : [ defaultLibs.css ];
			}
			if ( defaultLibs.js && typeof defaultLibs.js == 'string' ) {

				defaultLibs.js = ( defaultLibs.js === '' ) ? [] : [ defaultLibs.js ];
			}
			if ( defaultLibs.handler ) {

				preloadHandlers.push( defaultLibs.handler );
			}

			if ( routeControllerLibs.css && typeof routeControllerLibs.css == 'string' ) {

				routeControllerLibs.css = ( routeControllerLibs.css === '' ) ? [] : [ routeControllerLibs.css ];
			}
			if ( routeControllerLibs.js && typeof routeControllerLibs.js == 'string' ) {

				routeControllerLibs.js = ( routeControllerLibs.js === '' ) ? [] : [ routeControllerLibs.js ];
			}
			if ( routeControllerLibs.handler ) {

				preloadHandlers.push( routeControllerLibs.handler );
			}

			if ( routeLibs.css && typeof routeLibs.css == 'string' ) {

				routeLibs.css = ( routeLibs.css === '' ) ? [] : [ routeLibs.css ];
			}
			if ( routeLibs.js && typeof routeLibs.js == 'string' ) {

				routeLibs.js = ( routeLibs.js === '' ) ? [] : [ routeLibs.js ];
			}
			if ( routeLibs.handler ) {

				preloadHandlers.push( routeLibs.handler );
			}

			self.route._libs.sources		= _.defaults( {}, routeControllerLibs, routeLibs );
			self.route._libs.sources		= _.defaults( {}, self.route._libs.sources, defaultLibs );
			self.route._libs.sources.css	= _.difference( _.union( commonLibs.css || [], self.route._libs.sources.css ), self.router._libs.sources.css );
			self.route._libs.sources.js		= _.difference( _.union( commonLibs.js || [], self.route._libs.sources.js ), self.router._libs.sources.js );

			if ( self.route._libs.sources.css.length && !self.route._libs.sources.css[self.route._libs.sources.css.length - 1] ) {

				self.route._libs.sources.css.pop();
			}
			if ( self.route._libs.sources.js.length && !self.route._libs.sources.js[self.route._libs.sources.js.length - 1] ) {

				self.route._libs.sources.js.pop();
			}

			if ( !self.route._libs.sources.css.length ) {

				console.info( '[Preloader - StyleSheets] All libraries are already loaded.' );
			}
			if ( !self.route._libs.sources.js.length ) {

				console.info( '[Preloader - JavaScripts] All libraries are already loaded.' );
			}

			if ( self.route._libs.sources.css.length || self.route._libs.sources.js.length ) {
				Preloader.flagLibs( self.route._libs, false );

				return Preloader.loadSync( self.route._libs, preloadHandlers );
			} else {
				Preloader.flagLibs( self.route._libs, true );

				console.info( '\n[Preloader - End] Loading route "' + routeName + '" finished.\n' );
			}

			return {
				// Return object with ready() method to be called to check the status
				ready: function () {
					// We're okay
					return true;
				}
			};
		},

		onStop : function () {
			var self = this;

			if ( !self.route._libs.ready.css || !self.route._libs.ready.js ) {
				if ( self._deps ) {
					self._deps.stop();
				}

				Preloader.flagLibs( self.route._libs, false );

				console.warn( '\n[Preloader - Stop] Loading for route "' + self.route._libs.controller.route.getName() + '" interrupted! (probably redirection...)\n' );
			}
		}
	});
}
