# meteor-preloader

#### A _synchronous_ Meteor preloader for external .js and .css libraries.

Inspired by [wait-on-lib](https://github.com/DerMambo/wait-on-lib)


## Dependencies

 * [iron-router](https://github.com/EventedMind/iron-router) - _A client and server side router designed specifically for Meteor_.


## TL;DR;

_meteor-preloader_ extends the [iron-router](https://github.com/EventedMind/iron-router) with _**synchronous**_ external file loader - after loading the file, and if a user's callback method is defined, it will **_block_ the page load**, and _repeatedly_ call the callback method to check whether the library has finished it's initialization. It will stop calling the callback method if not getting the positive (boolean true) response from it for 2 seconds, and continue with the rest of the files.


## What?!

Meteor [gathers](http://docs.meteor.com/#structuringyourapp) all JavaScript files in the application tree, with the exception of the _server_, _public_, and _private_ subdirectories, for the client. It minifies this bundle and serves it to each new client.

That's fine for small (one-page) applications with a few (dozen) custom .js files, but when you're building a large, structured application that has many different screens, like a CMS application for example, things are getting more complicated.

The problem in large aplications is that you usually don't want to serve all libraries (and .css files) to **ALL** pages. A login page or a user profile page doesn't need fairly large mapping or graph visualization libraries or extensive styling, for example.

Also, to improve the page loading speed and responsiveness, you'd often want to load 3rd party libraries from CDN (or author's server) instead of your own server.

To load such files, a usual approach is to use AJAX loader, for example jQuery's `$.ajax`, or a higher-level alternatives like `$.get()` and `$.load()`. Main problem with those methods is that they work - asynchronously - meaning they _will not block the page loading_, which may be a problem for depending libraries and user defined methods - successful AJAX load doesn't guarantee that the library has finished self-initialization, therefore may not be available to other libraries and custom methods when they load or being invoked.

_meteor-preloader's_ main task is to fix that problem.


## How?
(in case you were TL even for _TL;DR;_)

_meteor-preloader_ extends the [iron-router](https://github.com/EventedMind/iron-router) with _**synchronous**_ external file loader - after loading the file, and if a user's callback method is defined, it will **_block_ the page load**, and _repeatedly_ call the callback method to check whether the library has finished it's initialization. It will stop calling the callback method if not getting the positive (boolean true) response from it for 2 seconds, and continue with the rest of the files.


## KEWL!

Yeah! Now, go ahead, use [Meteorite](https://github.com/oortcloud/meteorite) - _Installer & smart package manager for Meteor_ to add it to your app:

```sh
$ mrt add preloader
```


## Bring it on!

_**NOTE:** **.css**_ files will be just appended to the `<head>` section which will cause their immediate loading.

_meteor-preloader_ adds a couple of parameters to the (Iron) Router object:
 * `preloadFiles` The object containing two parameters - objects with their own parameters - lists of files to be (pre)loaded on each page, in the order they appear in the list

```javascript
preloadFiles: {	// parameters can be a string (file path) or an array of strings
	// Use these on *ALL* pages
	'common': {		// You can omit any of these objects...
		js: [],
		css: []
	},
	// Use these (on top of 'common') if no others are defined
	// These can get overridden by each route's PreloadController
	'default': {	// ...but omitting both won't make you any smarter.
		js: [],
		css: []
	}
}
```

 * `preloadHandler` (optional) User-defined method called on each _loaded_ library to check whether it finished _initialization_

```javascript
preloadHandler: function ( filePath ) {	// current loaded library to be checked
	// Check if library finished initialization
}
```

It also adds a method:

 * `preload` Method which will do the actual loading; should be called from within the `waitOn` method; it takes two parameters:

```javascript
preload(
	{	// Lists of files to load
		// js: []		<-- If undefined, load the libraries defined in `Router.preloadFiles.default.js`
		js: [],		//	<-- If empty, DON'T load the libraries defined in `Router.preloadFiles.default.js`
		// css: []		<-- If undefined, the libraries defined in `Router.preloadFiles.default.css`
		css: []		//	<-- If empty, DON'T load the libraries defined in `Router.preloadFiles.default.css`
	} /*, OPTIONAL
	function ( filePath ) {
		// Return `true` if library finished initialization
	} */
);
```

**NOTE:** If both `preloadHandler` and route-specific handler in `preload()` method are defined, BOTH will be called unless any of them returns `true`!

Also, to be able to use _meteor-preloader_'s functionality in a specific route, you have to define it as route's controller:

```javascript
Router.map(function(){
	this.route( 'home', {
		controller: PreloadController
	}
}
```


## Put your code where your mouth is!

Ok, because YOU asked for it!

```javascript
Router.configure({
	layoutTemplate	: 'layout',
	loadingTemplate	: 'loading',
	preloadFiles	: {
		// Use these on *ALL* pages
		'common'	: {
			js	: '/library/modernizr/modernizr.js',
			css	: '/library/icons/fontawesome/assets/css/font-awesome.min.css'
		},
		// Use these (on top of 'common') if no others are defined
		// These can get overridden by each route's preload controller
		'default'	: {
			js	: [],
			css	: []
		}
	},
	preloadHandler	: function ( filePath ) {
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
});

// *NOTE*
// preloader will NOT block page loading unless:
// https://github.com/EventedMind/iron-router/issues/554
Router.onBeforeAction( 'loading' );

// Main
Router.map(function(){
	this.route( 'home', {
		path			: '/',
		template		: 'main',
		controller		: PreloadController,
		yieldTemplates	: {
			'news': {
				to: 'mainContent'
			}
		},
		waitOn			: function () {
			return this.preload({
				js: '/plugins/yet_another_fancy_schmancy.js' /*,
				css: []	<-- No route-specific CSS */
			}, function ( filePath ) {
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
			});
		}
	});
});
```


## Oh, no, not again!

Oh yes - you can cache AJAX loading by:
```javascript
$.ajaxSetup({
	cache: true
});
```

## Changelog

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
