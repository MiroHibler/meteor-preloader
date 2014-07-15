PreloadController = RouteController.extend({
	preload: function ( files /* { js: [], css: [] } */, customHandler ) {
		var self			= this,
			routeFiles		= files || {},
			preloadHandler	= self.router.options.preloadHandler,
			commonFiles		= ( self.router.options.preloadFiles ) ? self.router.options.preloadFiles.common || { js: [], css: [] } : { js: [], css: [] },
			defaultFiles	= ( self.router.options.preloadFiles ) ? self.router.options.preloadFiles.default || {} : {},
			handle			= {
				ready: function() {
					self._libs.readyDeps.css.depend();
					self._libs.readyDeps.js.depend();

					return self._libs.ready.css && self._libs.ready.js;
				}
			};

		if ( routeFiles.css && typeof routeFiles.css == 'string' ) {
			routeFiles.css = [ routeFiles.css ];
		}
		if ( routeFiles.js && typeof routeFiles.js == 'string' ) {
			routeFiles.js = [ routeFiles.js ];
		}

		self._sources		= _.defaults( {}, defaultFiles, routeFiles );
		self._sources.css	= _.union( commonFiles.css, self._sources.css, routeFiles.css || [] );
		self._sources.js	= _.union( commonFiles.js, self._sources.js, routeFiles.js || [] );

		if ( self._sources ) {
			if ( !self._libs ) {
				self._libs = {
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
			} else {
				self._libs.ready.css = false;
				self._libs.ready.js = false;
			}

			if ( self._libs.sources.css.length ) {
				var totalCssFiles	= self._libs.sources.css.length;
					cssCounter		= 1;

				console.log( '[Preloader - StyleSheet] Loading initiated...' );

				$.map( self._libs.sources.css, function ( cssFile ) {

					$( 'head' ).append( '<link rel="stylesheet" type="text/css" href="' + cssFile + '"/>' );
					console.log( '[Preloader - StyleSheet] Loading ' + cssCounter + '/' + totalCssFiles + ': ' + cssFile );
					cssCounter++;

				});

				console.log( '[Preloader - StyleSheet] Loading finished.' );
			}
			self._libs.ready.css = true;
			self._libs.readyDeps.css.changed();

			if ( self._libs.sources.js.length ) {

				console.log( '[Preloader - JavaScript] Loading initiated...' );

				self._totalJsFiles	= self._libs.sources.js.length;
				self._jsCounter		= 1;

				self._lib			= {
					source		: self._libs.sources.js[0],
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

				self._deps = Deps.autorun(function () {
					if ( self._isLoaded() ) {
						if ( self._isChecked() ) {
							self._libs.sources.js.shift();
							if ( self._libs.sources.js.length > 0 ) {
								self._lib.source = self._libs.sources.js[0];
								self._lib.isLoaded = false;
								self._lib.isChecked = false;
								self._lib.deps.loaded.changed();
								self._lib.deps.checked.changed();
								self._preloadJs();
							} else {
								// We're finished
								self._deps.stop();

								console.log( '[Preloader - JavaScript] Loading finished.' );

								self._libs.ready.js = true;
								self._libs.readyDeps.js.changed();

								// Because of https://github.com/EventedMind/iron-router/issues/554
								self.render();
							}
						} else {
							if ( preloadHandler || customHandler ) {
								self._preloadCheck();
							}
						}
					}
				});

				self._preloadJs();

			} else {
				self._libs.ready.js = true;
				self._libs.readyDeps.js.changed();
			}
		}

		// Return object with ready() method to be called to check the status
		return handle;
	}
});