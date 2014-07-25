if ( typeof PreloadController === 'undefined' ) {
	PreloadController = RouteController.extend({
		preload: function ( files /* { js: [], css: [] } */, customHandler ) {
			var self			= this,
				routeFiles		= files || {},
				preloadHandler	= self.router.options.preloadHandler,
				commonFiles		= ( self.router.options.preloadFiles ) ? self.router.options.preloadFiles.common || { js: [], css: [] } : { js: [], css: [] },
				defaultFiles	= ( self.router.options.preloadFiles ) ? self.router.options.preloadFiles.default || {} : {},
				handle			= {
					ready: function() {
						self.route._libs.readyDeps.css.depend();
						self.route._libs.readyDeps.js.depend();

						return self.route._libs.ready.css && self.route._libs.ready.js;
					}
				};

			if ( routeFiles.css && typeof routeFiles.css == 'string' ) {
				routeFiles.css = [ routeFiles.css ];
			}
			if ( routeFiles.js && typeof routeFiles.js == 'string' ) {
				routeFiles.js = [ routeFiles.js ];
			}

			if ( commonFiles.css && typeof commonFiles.css == 'string' ) {
				commonFiles.css = [ commonFiles.css ];
			}
			if ( commonFiles.js && typeof commonFiles.js == 'string' ) {
				commonFiles.js = [ commonFiles.js ];
			}

			if ( defaultFiles.css && typeof defaultFiles.css == 'string' ) {
				defaultFiles.css = [ defaultFiles.css ];
			}
			if ( defaultFiles.js && typeof defaultFiles.js == 'string' ) {
				defaultFiles.js = [ defaultFiles.js ];
			}

			self._sources		= _.defaults( {}, defaultFiles, routeFiles );
			self._sources.css	= _.union( commonFiles.css || [], self._sources.css || [], routeFiles.css || [] );
			self._sources.js	= _.union( commonFiles.js || [], self._sources.js || [], routeFiles.js || [] );

			if ( self._sources ) {

				if ( !self.route._libs ) {
					self.route._libs = {
						sources	: self._sources,
						ready	: {
							css	: false,
							js	: false
						},
						readyDeps	: {
							css	: new Deps.Dependency,
							js	: new Deps.Dependency
						}
					};
				}

				if ( self.route._libs.sources.css.length && !self.route._libs.ready.css ) {
					var totalCssFiles	= self.route._libs.sources.css.length;
						cssCounter		= 1;

					console.log( '[Preloader - StyleSheet] Loading initiated...' );

					$.map( self.route._libs.sources.css, function ( cssFile ) {

						$( 'head' ).append( '<link rel="stylesheet" type="text/css" href="' + cssFile + '"/>' );
						console.log( '[Preloader - StyleSheet] Loading ' + cssCounter + '/' + totalCssFiles + ': ' + cssFile );
						cssCounter++;

					});

					console.log( '[Preloader - StyleSheet] Loading finished.' );

				}
				self.route._libs.ready.css = true;
				self.route._libs.readyDeps.css.changed();

				if ( self.route._libs.sources.js.length && !self.route._libs.ready.js ) {

					console.log( '[Preloader - JavaScript] Loading initiated...' );

					self._totalJsFiles	= self.route._libs.sources.js.length;
					self._jsCounter		= 1;

					self._lib			= {
						source		: self.route._libs.sources.js[0],
						isLoaded	: false,
						isChecked	: false,
						deps		: {
							loaded	: new Deps.Dependency,
							checked	: new Deps.Dependency,
						}
					}

					self._isLoaded		= function() {
						self._lib.deps.loaded.depend();
						return self._lib.isLoaded;
					}

					self._isChecked		= function() {
						self._lib.deps.checked.depend();
						return self._lib.isChecked;
					}

					self._preloadJs		= function () {

						console.log( '[Preloader - JavaScript] Loading ' + self._jsCounter + '/' + self._totalJsFiles + ': ' + self._lib.source );

						$.getScript( self._lib.source )
							.done( function( script, textStatus ) {
								self._jsCounter++;
								self._lib.isLoaded = true;
								self._lib.deps.loaded.changed();
							})
							.fail( function ( jqxhr, textStatus, exception ) {
								if ( error ) {
									console.log( '[Preloader - JavaScript] Loading ' + self._jsCounter + '/' + self._totalJsFiles + ' Error: ' + jqxhr.status + ' (\'' + textStatus + '\'): \'' + exception.message + '\'' );
								}
							});
					}

					self._preloadCheck	= function () {
						// Call user's handler method(s) to let them
						// check if library finished initialization
						var timeOut = 2,	// seconds
							timer = setTimeout(function(){	// Prevent endless run
								self._lib.isChecked = true;

								clearTimeout( timer );
								clearInterval( interval );

								self._lib.deps.checked.changed();

								console.log( '[Preloader - JavaScript] Loading check... ERROR: Timeout' );
							}, timeOut * 1000 ),
							interval = setInterval(function(){
								// Wait for library to finish loading
								try {
									if ( preloadHandler ) {
										self._lib.isChecked = preloadHandler( self._lib.source );
									}
									if ( customHandler ) {
										self._lib.isChecked = self._lib.isChecked && customHandler( self._lib.source );
									}
									if ( self._lib.isChecked ) {

										clearTimeout( timer );
										clearInterval( interval );

										self._lib.deps.checked.changed();

										console.log( '[Preloader - JavaScript] Loading check... [OK]' );
									}
								} catch ( error ) {
									console.log( '[Preloader - JavaScript] Loading check... ERROR: ' + error.message );
								}
							}, 0 );	// Run as often as possible
					}

					self._deps = Deps.autorun(function(){
						if ( self._isLoaded() ) {
							if ( self._isChecked() ) {
								self.route._libs.sources.js.shift();
								if ( self.route._libs.sources.js.length > 0 ) {
									self._lib.source = self.route._libs.sources.js[0];
									self._lib.isLoaded = false;
									self._lib.isChecked = false;
									self._lib.deps.loaded.changed();
									self._lib.deps.checked.changed();
									self._preloadJs();
								} else {
									// We're finished
									self._deps.stop();

									console.log( '[Preloader - JavaScript] Loading finished.' );

									self.route._libs.ready.js = true;
									self.route._libs.readyDeps.js.changed();

									// Because of https://github.com/EventedMind/iron-router/issues/554
									self.render();
								}
							} else if ( preloadHandler || customHandler ) {
								self._preloadCheck();
							} else {	// Continue with loading if there are no preload check handlers
								self._lib.isChecked = true;
								self._lib.deps.checked.changed();
							}
						}
					});

					self._preloadJs();

				} else {
					self.route._libs.ready.js = true;
					self.route._libs.readyDeps.js.changed();
				}
			}

			// Return object with ready() method to be called to check the status
			return handle;
		}
	});
}
