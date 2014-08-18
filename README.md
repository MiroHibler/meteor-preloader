# meteor-preloader

#### A _synchronous_ Meteor preloader for external .js and .css libraries.

Inspired by [wait-on-lib](https://github.com/DerMambo/wait-on-lib)


## NEW VERSION - v0.4

 * **Added sync loading to extended controller** - if you extend the PreloadController, you can set its `preload` parameter to the object containing lists of CSS and JavaScript files to load for each route that is using extended controller.


## Dependencies

 * [iron-router](https://github.com/EventedMind/iron-router) - _A client and server side router designed specifically for Meteor_.


## TL;DR;

_meteor-preloader_ extends the [iron-router](https://github.com/EventedMind/iron-router) with _**synchronous**_ external file loader - after loading the file, and if a user's callback method is defined, it will **_block_ the page load**, and _repeatedly_ call the callback method to check whether the library has finished it's initialization. It will stop calling the callback method if not getting the positive (boolean true) response from it for 2 seconds, and continue with the rest of the files.

**NEW in v0.3.0**: libraries can now be loaded _**asyncronously**_ as well in order to prevent blocking the page load!

## What?!

[Meteor gathers](http://docs.meteor.com/#structuringyourapp) all JavaScript files in the application tree, with the exception of the _server_, _public_, and _private_ subdirectories, for the client. It minifies this bundle and serves it to each new client.

That's fine for small (one-page) applications with a few (dozen) custom .js files, but when you're building a large, structured application that has many different screens, like a CMS application for example, things are getting more complicated.

The problem in large aplications is that you usually don't want to serve all libraries (and .css files) to **ALL** pages. A login page or a user profile page doesn't need fairly large mapping or graph visualization libraries or extensive styling, for example.

Also, to improve the page loading speed and responsiveness, you'd often want to load 3rd party libraries from CDN (or author's server) instead of your own server.

To load such files, a usual approach is to use AJAX loader, for example jQuery's `$.ajax`, or a higher-level alternatives like `$.get()` and `$.load()`. Main problem with those methods is that they work - asynchronously - meaning they _will not block the page loading_, which may be a problem for depending libraries and user defined methods - successful AJAX load doesn't guarantee that the library has finished self-initialization, therefore may not be available to other libraries and custom methods when they load or being invoked.

_meteor-preloader's_ main task is to fix that problem.

###NEW in v0.4.0

If you extend the PreloadController, you can set its `preload` parameter to the object containing lists of CSS and JavaScript files to load for each route that is using extended controller.

**NOTE:** Each route's own `preload` settings will override the extended controller's `preload` settings!

###NEW in v0.3.0

Files now can be loaded even _**asyncronously**_ - for example: in case there's a large library that will be needed after user's login, its loading can be initiated at the first initial page load, before the user logs in and it's load will continue until fully loaded regardless of any routes being (re)loaded.

A handler can be passed to _meteor-preloader_ to be invoked on _**each**_ file being (pre)loaded.


## How?
(in case you were TL even for _TL;DR;_)

_meteor-preloader_ extends the [iron-router](https://github.com/EventedMind/iron-router) with _**synchronous**_ external file loader - after loading the file, and if a user's callback method is defined, it will **_block_ the page load**, and _repeatedly_ call the callback method to check whether the library has finished it's initialization. It will stop calling the callback method if not getting the positive (boolean true) response from it for 2 seconds, and continue with the rest of the files.

**NEW in v0.3.0**: libraries can now be loaded _**asyncronously**_ as well in order to prevent blocking the page load!


## KEWL!

Yeah! Now, go ahead, use [Meteorite](https://github.com/oortcloud/meteorite) - _Installer & smart package manager for Meteor_ to add it to your app:

```sh
$ mrt add preloader
```


## Bring it on!

_**NOTE:** **.css**_ files will be just appended to the `<head>` section which will cause their immediate loading.

_meteor-preloader_ adds one parameter to the (Iron) Router object:

 * `preload` The object containing two parameters - objects with their own parameters - lists of files to be (pre)loaded on each page, in the order they appear in the list

```javascript
Router.configure({
	layoutTemplate	: 'layout',
	loadingTemplate	: 'loading',
	preload			: {	// parameters can be a string (file path) or an array of strings
		'async': {	// List of files to be loaded asynchronously
			// These will be loaded in the background (non-blocking!) once per full page reload
			'js'		: '',	// a string (file path) or an array of strings
			// (optional) User-defined method called on each _loaded_ library (_initialization_
			// is NOT guaranteed)
			'handler'	: function ( error, result ) {
					// Check if library finished initialization and have your way with it

					// error:
					{
						file		: <full path of the file being loaded>,
						jqxhr		: <jqxhr object returned from AJAX call>,
						status		: <textual status returned from AJAX call>,
						exception	: <exception object returned from AJAX call>,
						counter		: <current file counter>,
						totalFiles	: <total number of files being loaded>
					}

					// result:
					{
						file		: <full path of the file being loaded>,
						script		: <file content returned from AJAX call>,
						status		: <textual status returned from AJAX call>,
						counter		: <current file counter>,
						totalFiles	: <total number of files being loaded>
					}
				}
		},
	    'sync': {	// List of files to be loaded synchronously
			'common': {		// You can omit any of these objects...
				// Use these on *ALL* pages
				'css'		: '',	// a string (file path) or an array of strings
				'js'		: '',	// a string (file path) or an array of strings
				// (optional) User-defined method called on each _loaded_ library to check whether
				// it finished _initialization_
				'handler'	: function ( filePath ) {
					var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );
					// Check and return `true` if `file` finished initialization
				}
			},
			'default': {	// ...but omitting both won't make you any smarter.
				// Use these (on top of 'common') if no others are defined
				// These can get overridden by each route's PreloadController
				'css'		: '',	// a string (file path) or an array of strings
				'js'		: '',	// a string (file path) or an array of strings
				// (optional) User-defined method called on each _loaded_ library to check whether
				// it finished _initialization_
				'handler'	: function ( filePath ) {
					var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );
					// Check and return `true` if `file` finished initialization
				}
			}
		}
	}
})
```

It also adds similar parameter to the route controller:

```javascript
Router.map(function(){
	this.route( 'home', {
		path			: '/',
		template		: 'main',
		controller		: PreloadController,
		/* * NOTE *
		 |
		 | Old implementation of calling a route controller method `preload()` within
		 | route's `waitOn` method is deprecated in v0.3+
		 | Libraries will now be automagically loaded within route's `waitOn` method
		 |
		 */
		preload			: {	// Lists of files to load
			// 'css		: [],		<-- If undefined, load the libraries defined
									// in `Router.preload.sync.default.css`
			'css'		: [],		//	<-- If '' or empty, DON'T load the libraries defined
									// in `Router.preload.sync.default.css`
			// 'js'		: [],		<-- If undefined, load the libraries defined
									// in `Router.preload.sync.default.js`
			'js'		: [],		//	<-- If '' or empty, DON'T load the libraries defined
									// in `Router.preload.sync.default.js`
			'handler'	: function ( filePath ) {
				var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );
				// Check and return `true` if `file` finished initialization
			}
		}
	});
});
```

Similar parameter in the extended controller is now supported as well:

```javascript
FancyRouteController = PreloadController.extend({
	// NOTE: Files can be set fixed...
	preload: {
		css: [],
		js : [],
		handler: function ( filePath ) { return true; }
	},

	// ...or dinamically if needed

	onRun  : function () {
		// ONLY in `onRun` event handler!
		var self = this;

		switch ( self.route.name ) {
			case 'fancyRoute':
				self.preload = {
					css    : [],
					js     : [],
					handler: function ( filePath ) { return true; }
				};
			default:
		}
	}
}
```

**NOTE:** If all router-, controller- and route-specific handlers are defined, ALL will be called unless any of them returns `true`!

Also, to be able to use _meteor-preloader_'s functionality in a specific route, you have to define it as route's controller, for example:

```javascript
Router.map(function(){
	this.route( 'home', {
		controller: PreloadController	// or extended controller (ie. FancyRouteController)
	}
}
```


## And now, something completely different!

(Drumroll) Example time!

```javascript
Router.configure({
	layoutTemplate	: 'layout',
	loadingTemplate	: 'loading',
	preload			: {
		async	: {
			// These will be loaded in the background (non-blocking!) once per full page reload
			'js'		: '/large/files/to/async/preload/humongous_uglyfied.min.js',
			'handler'	: function ( error, result ) {
				if ( error ) {
					console.log( 'Some other time... :(' );
				} else {
					console.log( 'Finally! :)' );
				}
			}
		},
		sync	: {
			'common'	: {
				// Use these on *ALL* pages
				css		: '/library/icons/fontawesome/assets/css/font-awesome.min.css',
				js		: '/library/modernizr/modernizr.js',
				handler	: function ( filePath ) {
					var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );

					switch ( file ) {
						case 'modernizr.js':
								try {
									return !!Modernizr;
								} catch ( error ) {
									return false;
								}
							break;
						default:
							return true;
					}
				}
			},
			'default'	: {
				// Use these (on top of 'common') if no others are defined
				// These can get overridden by each route's preload controller
				js		: [],
				css		: []/*,		Nothing to handle
				handler	: function ( filePath ) {}*/
			}
		}
	}
});

/* * NOTE *
 | meteor-preloader will NOT block page loading unless:
 | https://github.com/EventedMind/iron-router/issues/554
 */
Router.onBeforeAction( 'loading' );

AppRouteController = PreloadController.extend({
	preload	: {
		js: '/plugins/main_badass.js'
	},

	onRun	: function () {
		var self = this;

		switch ( self.route.name ) {
			case 'badAss':
				self.preload.js = '/plugins/even_more_badass.js';
				self.preload.handler = function ( filePath ) {
					var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );

					switch ( file ) {
						case 'even_more_badass.js':
								try {
									return !!BADASS;
								} catch ( error ) {
									return false;
								}
							break;
						default:
							return true;
					}
				};
			default:
		}
	}
});

Router.map(function () {
	this.route( 'home', {
		path			: '/',
		template		: 'main',
		controller		: AppRouteController,
		yieldTemplates	: {
			'news': {
				to: 'mainContent'
			}
		},
		/* * NOTE *
		 |
		 | Old implementation of calling a route controller method `preload()` within
		 | route's `waitOn` method is deprecated in v0.3+
		 | Libraries will now be automagically loaded within route's `waitOn` method
		 |
		 */
		preload			: {
			js		: '/plugins/yet_another_fancy_schmancy.js', /*,
			css		: [],	<-- No route-specific CSS - use defaults */
			handler	: function ( filePath ) {
				var file = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );

				switch ( file ) {
					case 'yet_another_fancy_schmancy.js':
							try {
								return !!YAFS;
							} catch ( error ) {
								return false;
							}
						break;
					default:
						return true;
				}
			}
		}
	});
});
```


## Oh, no, not again!

Oh yes - you can cache AJAX loading (**globally**) by:
```javascript
$.ajaxSetup({
	cache: true
});
```

## Changelog
### v0.4.0
 * Added sync loading to extended controller
 * Bug Fixes

### v0.3.3
 * Fix for issue #3 - "Preloader fails after the 0.8.3 meteor update"

### v0.3.2
 * Fix README.md comments in examples

### v0.3.1
 * Async loading moved to the end (after sync loading) in order to not to block the page load
 * Fix for async file counter
 * Fix for preloader handler's loop

### v0.3.0
 * **Total rewrite**
 	- **changed the parameter structure!**
 	- **route controller's `preload` method has been deprecated!**
 * Added Async loading for large libraries
 * Now checking (across routes) for already loaded libraries to prevent re-loading

### v0.2.2
 * Fix for cached status of styles not being correctly set

### v0.2.1
 * Cached status so styles as well don't get loaded again for the same route (until full page reload, duh!)

### v0.2.0
 * Cached status so libraries don't get loaded again for the same route (until full page reload, duh!)

### v0.1.3
 * Bumped up version in `smart.js`

### v0.1.2
 * Fixed bug #2 - Not all the js files are loaded
 * Changes to the README.md

### v0.1.1
 * Fixed bug: Empty 'default' parameter in preloadFiles throwing error

### v0.1.0
 * Initial release

## Copyright and license

Copyright © 2014 [Miroslav Hibler](http://miro.hibler.me)

_meteor-preloader_ is licensed under the [**MIT**](http://miro.mit-license.org) license.
