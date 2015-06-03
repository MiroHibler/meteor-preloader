# Meteor Preloader

#### A Meteor "_lazy-loader_" for external .js and .css libraries

_Preloader_ is to Meteor what **yepnope.js** [was](https://github.com/SlexAxton/yepnope.js#deprecation-notice) to pre-Meteor era.

## NEW VERSION - v1.2.2

 * Logging in console throwing errors in unsupported browsers prevented


## Dependencies

 * [iron:router](https://github.com/eventedmind/iron-router) - _A router that
works on the server and the browser, designed specifically for [Meteor](https://github.com/meteor/meteor)_.


## TL;DR;
_Preloader_ extends the [iron:router](https://github.com/EventedMind/iron-router)
with with two main functions:

 - _**synchronous**_ file loading - after loading the file, and if a user's
callback method is defined, it will **_block_ the page load**, and _repeatedly_
call the callback method to check whether the library has finished it's
initialization - many libraries do internal initialization and even loading their
own dependencies before being ready. It will stop calling the callback method
if not getting the positive (boolean true) response from it after 2 seconds, and
it will continue with the rest of the libraries;
 - _**asynchronous**_ file loading - in order to prevent blocking the
page load and load large libraries in the background to speed up the loading
process. There may be callback method provided as well - it will not block the
page load but may be used to check for external library's successful
initialization.


## What?!

[Meteor gathers](http://docs.meteor.com/#structuringyourapp) all JavaScript files
in the application tree, with the exception of the _server_, _public_, and
_private_ subdirectories, for the client. It minifies this bundle and serves it
to each new client.

That's fine for small (one-page) applications with a few (dozen) custom .js
files, but when you're building a large, structured application that has many
different screens, like a CMS application for example, things are getting more
complicated.

The problem in large applications is that you usually don't want to serve all
libraries (.js and .css files) to **ALL** pages. A login page or a user profile
page doesn't need fairly large mapping or graph visualization libraries or
extensive styling.

Also, to improve the page loading speed and responsiveness, you'd often want to
load 3rd party libraries from CDN (or author's server) instead of your own
server.

To load such files, a usual approach is to use AJAX loader, for example jQuery's
`$.ajax`, or a higher-level alternatives like `$.get()` and `$.load()`. The main
problem with those methods is that they work _asynchronously_, meaning - they
_will not block the page loading_, which may be a problem for depending
libraries and user defined methods - successful AJAX load doesn't guarantee that
the library has finished self-initialization, therefore may not be available to
other libraries and custom methods when they load or being invoked.

_Preloader's_ main task is to fix that problem.

> _**NOTE:** **.css**_ files will be just appended to the `<head>` section which
will cause their immediate loading and they are always loaded asynchronously.


## KEWL!

Yeah! Now, go ahead and type:

```sh
meteor add miro:preloader
```

to add it to your app.


## Bring it on!

_Preloader_ adds one method parameter (`preload`) to any or all of the following
Iron.Router objects:

- **Router.configure** - default options for all routes

- **RouteController** - default options for all routes using that controller

- **Route** - specific options for a particular route
> If no extended controller has been provided for a particular route, a
PreloadController itself should be assigned to the route.

To use _Preloader_, add these method parameters to them:

```javascript
'preload': {

	/*
	 | Parameters can be a string (file path) or an array of strings
	 */

	// Added in v1.2.1 - this one works only in Router.Configure!
	'verbose': true,  // Show loading messages in console

	// Custom time-out to replace internal 2 seconds
	'timeOut': 5000,	// milliseconds

	// CSS style(s) to load
	'styles' : '',	// or []

	// File(s) to be loaded asynchronously (non-blocking)
	'async'  : '',	// or []

	// File(s) to be loaded synchronously (blocking)
	'sync'   : '',	// or []

	// (optional) User-defined method called BEFORE each asynchronously
	// loaded library to allow additional processing
	'onBeforeAsync': function ( fileName ) {
		// Return 'true' to continue normally, otherwise skip library
		return true;
	},

	// (optional) User-defined method called on each asynchronously
	// loaded library to check whether it finished initialization
	'onAsync': function ( error, result ) {
		// Check if library finished initialization
		// and have your way with it

		/* error:
		{
			file      : <full path of the file being loaded>,
			jqxhr     : <jqxhr object returned from AJAX call>,
			status    : <textual status returned from AJAX call>,
			exception : <exception object returned from AJAX call>,
			counter   : <current file counter>,
			totalFiles: <total number of files being loaded>
		}

		// result:
		{
			file      : <full path of the file being loaded>,
			script    : <file content returned from AJAX call>,
			status    : <textual status returned from AJAX call>,
			counter   : <current file counter>,
			totalFiles: <total number of files being loaded>
		}
		*/
	},

	// (optional) User-defined method called AFTER each asynchronously
	// loaded library to allow additional processing
	'onAfterAsync': function ( fileName ) {
		// Return 'true' to continue normally,
		// otherwise don't mark library as loaded
		return true;
	},

	// (optional) User-defined method called BEFORE each synchronously
	// loaded library to allow additional processing
	'onBeforeSync': function ( fileName ) {
		// Return 'true' to continue normally, otherwise skip library
		return true;
	},

	// (optional) User-defined method called on each synchronously
	// loaded library to check whether it finished initialization
	'onSync' : function ( fileName ) {
		// Check and return `true` if `fileName` finished initialization
		return true;
	},

	// (optional) User-defined method called AFTER each synchronously
	// loaded library to allow additional processing
	'onAfterSync': function ( fileName ) {
		// Return 'true' to continue normally,
		// otherwise don't mark library as loaded
		return true;
	}
}
```

These options are processed by the `PreloadController` - a built-in route
controller that handles preloading.

It's used in two ways:

 * To be extended for a custom route controller:

```javascript
HomeController = PreloadController.extend();

Router.route( '/', {
	name: 'home'
});
```

or

 * To be assigned to the Route directly:

```javascript
Router.route( '/', {
	controller: PreloadController	// or 'PreloadController'
});
```

We might have some options defined globally with Router.configure, some options
defined on the Route and some options defined on the RouteController.
_Preloader_ looks up options in this order:

1. Route
1. RouteController
1. Router


## And now, something completely different!

(Drumroll...) Example time!

```javascript
var routePath = 'http://js.arcgis.com/3.12/',
	routeLoaded = false,
	loadHandler = function () {
		routeLoaded = true;
	};

Router.configure({
	layoutTemplate : 'layout',
	loadingTemplate: 'loading',

	/*
	 | Options declared on the extended PreloadController and route
	 | will override these default Router options!
	 */
	'preload': {
		// Added in v1.2.1 - this one works only in Router.Configure!
		'verbose': true,  // Show loading messages in console

		'timeOut': 5000,  // wait 5s for our humongous library to finish loading
		'styles' : '/library/icons/fontawesome/assets/css/font-awesome.css',
		'async'  : '/large/files/to/async/preload/humongous.js',
		'sync'   : [
			routePath,
			'/library/modernizr/modernizr.js'
		],
		'onAsync': function ( error, result ) {
			if ( error ) {
				console.log( 'Some other time... :(' );
			} else {
				console.log( 'Finally! :)' );
			}
		},
		'onBeforeSync': function ( fileName ) {
			if ( fileName === routePath ) {
				// Our ArcGis library requires special treatment:
				var script    = document.createElement( 'script' );

				script.rel    = 'preload javascript';
				script.type   = 'text/javascript';
				script.src    = routePath;
				script.onload = loadHandler;

				document.body.appendChild( script );

				// No need to continue normally...
				return false;
			}
		},
		'onSync' : function ( filePath ) {
			if ( routeLoaded && filePath === routePath ) {
				// Check for Dojo
				return !!require && !!define;
			}
			// Else...
			var fileName = filePath.replace( /\?.*$/,"" ).replace( /.*\//,"" );

			switch ( fileName ) {
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
		},
		'onAfterSync': function ( fileName ) {
			// We'll probably want to reload the main
			// library, so don't mark it cached
			return false;
		}
	}
});

AppRouteController = PreloadController.extend({
	/*
	 | Options declared on the route will override these options!
	 */
	'preload': {
		'async': '/plugins/main_badass.js'
	},

	onBeforeAction: function () {
		var self = this,
			routeName = self.route.getName();

		switch ( routeName ) {
			case 'badAss':
				self.preload.sync = '/plugins/even_more_badass.js';
				self.preload.onSync = function ( filePath ) {
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
				// Whatever goes on with other routes
		}
	}
});

Router.route( '/', {
	name          : 'home',
	template      : 'main',
	yieldTemplates: {
		'news': {
			to: 'mainContent'
		}
	},

	/*
	 | If no extended controller has been provided for a particular route,
	 | a PreloadController itself should be assigned to the route
	 */
	controller: AppRouteController,

	/*
	 | Options declared on the route will override
	 | extended PreloadController and global options!
	 */
	'preload': {
		'sync'  : '/plugins/yet_another_fancy_schmancy.js',
		'onSync': function ( filePath ) {
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
```


## Oh, no, not again!

Oh yes - you can speed up loading by caching AJAX loading (**globally**) with:
```javascript
$.ajaxSetup({
	cache: true
});
```

## Changelog

### v1.2.2
 * Logging in console throwing errors in unsupported browsers prevented (fixed by #21)

### v1.2.1
 * Logging in console may now be controlled by the flag (addresses #12)
 * Bug fixes (CSS loading)
 * Clean up

### v1.2.0
 * Extended to server side (only to prevent errors if ran on server)
 * Some new methods - library/event handlers
 * Reinstated verbose logging
 * Bug fixes
 * Clean up

### v1.1.0
 * Rewritten again - simplified API
 * Bug fixes

### v1.0.3
 * Docs changes & typos

### v1.0.2
 * Version bump

### v1.0.1
 * Specifying a version constraint for iron:router package (@1.0.5)

### v1.0.0
 * Now compatible with Meteor v1.0

### v0.4.0
 * **Added sync loading to extended controller** - if you extend the
PreloadController, you can set its `preload` parameter to the object containing
lists of CSS and JavaScript files to load for each route that is using extended
controller.
 * Bug Fixes
**NOTE:** Each route's own `preload` settings will override the extended
controller's `preload` settings!

### v0.3.3
 * Fix for issue #3 - "Preloader fails after the 0.8.3 meteor update"

### v0.3.2
 * Fix README.md comments in examples

### v0.3.1
 * Async loading moved to the end (after sync loading) in order to not to block
the page load
 * Fix for async file counter
 * Fix for preloader handler's loop

### v0.3.0
 * **Total rewrite**
	- **changed the parameter structure!**
	- **route controller's `preload` method has been deprecated!**
 * Added Async loading for large libraries
	- for example: in case there's a large library that will be needed after
	user's login, its loading can be initiated at the first initial page load,
	before the user logs in and it's load will continue until fully loaded
	regardless of any routes being (re)loaded
	- a handler can be passed to _miro:preloader_ to be invoked on _**each**_ file
	being (pre)loaded
 * Now checking (across routes) for already loaded libraries to prevent re-loading

### v0.2.2
 * Fix for cached status of styles not being correctly set

### v0.2.1
 * Cached status so styles as well don't get loaded again for the same route
(until full page reload, duh!)

### v0.2.0
 * Cached status so libraries don't get loaded again for the same route (until
full page reload, duh!)

### v0.1.3
 * Bumped up version in `smart.js`

### v0.1.2
 * Fixed bug #2 - Not all the js files are loaded
 * Changes to the README.md

### v0.1.1
 * Fixed bug: Empty 'default' parameter in preloadFiles throwing error

### v0.1.0
 * Initial release


## Acknowledgements

Inspired by [wait-on-lib](https://github.com/DerMambo/wait-on-lib)


## Copyright and license

Copyright © 2014-2015 [Miroslav Hibler](http://miro.hibler.me)

_miro:preloader_ is licensed under the [**MIT**](http://miro.mit-license.org) license.
