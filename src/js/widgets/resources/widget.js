define(['underscore',
  'jquery',
  'backbone',
  'marionette',
  'js/components/api_query',
  'js/widgets/base/base_widget',
  'hbs!./templates/resources_template',
  'js/mixins/link_generator_mixin'
], function(_, $, Backbone, Marionette, ApiQuery, BaseWidget, ResourcesTemplate, LinkGenerator){


  var ResourcesModel = Backbone.Model.extend({
  });


  var ResourcesView = Marionette.ItemView.extend({
    template : ResourcesTemplate,
    modelEvents: {
      "change": "render"
    }
  });


  var ResourcesWidget = BaseWidget.extend({
    initialize : function(options){
      options = options || {};
      this.model = new ResourcesModel();
      this.view = new ResourcesView({model : this.model});
      this._bibcode = options.bibcode || undefined;
      this.showLoad = true;
    },

    activate: function (beehive) {
      this.pubsub = beehive.Services.get('PubSub');
      _.bindAll(this, ['onNewQuery', 'processResponse', 'onDisplayDocuments']);
      this.pubsub.subscribe(this.pubsub.START_SEARCH, this.onNewQuery);
      this.pubsub.subscribe(this.pubsub.DISPLAY_DOCUMENTS, this.onDisplayDocuments);
      this.pubsub.subscribe(this.pubsub.DELIVERING_RESPONSE, this.processResponse);
    },

    onNewQuery: function() {
      this.model.clear();
    },
    onDisplayDocuments: function(apiQuery) {
      var bibcode = apiQuery.get('q');
      var self = this;
      if (bibcode.length > 0 && bibcode[0].indexOf('bibcode:') > -1) {
        bibcode = bibcode[0].replace('bibcode:', '');
        this.loadBibcodeData(bibcode).done(function(data) {
          self.trigger('page-manager-event', 'widget-ready', {'isActive': true, numFound: data});
        });
      }
    },

    loadBibcodeData : function(bibcode){

      if (bibcode === this._bibcode){
        this.deferredObject =  $.Deferred();
        this.deferredObject.resolve(this.model);
        return this.deferredObject.promise();
      }
      else {
        this._bibcode = bibcode;
        var searchTerm = "bibcode:"+this._bibcode;
        this.deferredObject =  $.Deferred();
        //abstractPageFields comes from the LinkGenerator Mixin
        this.dispatchRequest(new ApiQuery({'q': searchTerm, fl : "links_data,ids_data,[citations],property,bibcode"}));
        return this.deferredObject.promise();
      }

    },

    processResponse : function(apiResponse){

      var data = apiResponse.get("response.docs[0]");
      //from link mixin
      data = this.parseResourcesData(data);

      this.model.set(data);

      //resolving the promises generated by "loadBibcodeData"
      if (this.deferredObject){
        this.deferredObject.resolve(this.model)
      }
    }

  });

  _.extend(ResourcesWidget.prototype, LinkGenerator);
  return ResourcesWidget
});