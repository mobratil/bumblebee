/**
 * The main 'navigation' enpoints (the part executed inside
 * the applicaiton) - this is a companion to the 'router'
 */

define([
    'jquery',
    'backbone',
    'js/components/navigator'],
  function ($, Backbone, Navigator) {

    "use strict";

    var NavigatorService = Navigator.extend({

      start: function(app) {
        /**
         * These 'transitions' are what happens inside 'discovery' application
         */

        this.set('index-page', function() { app.getObject('MasterPageManager').show('LandingPage')});
        this.set('results-page', function() { app.getObject('MasterPageManager').show('SearchPage')});
        this.set('abstract-page', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:abstract', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:citations', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:references', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:coreads', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:toc', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:similar', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:bibtex', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:endnote', function() { app.getObject('MasterPageManager').show('DetailsPage')});
        this.set('abstract-page:metrics', function() { app.getObject('MasterPageManager').show('DetailsPage')});
      }


    });

    return NavigatorService;

  });

