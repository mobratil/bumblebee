define([
    'marionette',
    'backbone',
    'js/components/api_request',
    'js/components/api_query',
    'js/widgets/base/base_widget',
    'hbs!./templates/item-template',
    'bootstrap'
  ],

  function (Marionette,
            Backbone,
            ApiRequest,
            ApiQuery,
            BaseWidget,
            ItemTemplate
    ) {

    var ItemView = Marionette.ItemView.extend({
      tagName: "li",
      className: "col-sm-12 s-display-block",
      template: ItemTemplate,

      constructor: function (options) {
        var self = this;
        if (options) {
          _.defaults(options, _.pick(this, ['model', 'collectionEvents', 'modelEvents']));
        }
        return Marionette.ItemView.prototype.constructor.apply(this, arguments);
      },

      render: function () {
        if (this.model.get('visible')) {
          return Marionette.ItemView.prototype.render.apply(this, arguments);
        }
        else if (this.$el) { // it was already rendered, so remove it
          this.$el.empty();
        }
        return this;
      },


      events: {
        'change input[name=identifier]': 'toggleSelect',
        'click .details-control' : "toggleDetails",
        'mouseenter .letter-icon': "showLinks",
        'mouseleave .letter-icon': "hideLinks",
        'click .letter-icon': "pinLinks"
      },

      modelEvents: {
        "change:visible": 'render',
        "change:showDetails" : 'render'
      },

      collectionEvents: {
        "add": "render",
        "change:visible": "render"
      },

      toggleSelect: function () {
        this.$el.toggleClass("chosen");
        this.model.set('chosen', this.model.get('chosen') ? false : true);
      },

      toggleDetails : function(){
        var newValue = this.model.get("showDetails") ? false : true;
        this.model.set("showDetails", newValue);
      },

      /*
       * adding this to make the dropdown
       * accessible, and so people can click to sticky
       * open the quick links
       * */

      removeActiveQuickLinkState: function ($node) {

        $node.removeClass("pinned");
        $node.find("i").removeClass("s-icon-draw-attention")
        $node.find(".link-details").addClass("hidden");
        $node.find('ul').attr('aria-expanded', false);

      },

      addActiveQuickLinkState: function ($node) {

        $node.find("i").addClass("s-icon-draw-attention")
        $node.find(".link-details").removeClass("hidden");
        $node.find('ul').attr('aria-expanded', true);

      },

      deactivateOtherQuickLinks: function ($c) {

        var $hasList = this.$(".letter-icon").filter(function () {
          if ($(this).find("i").hasClass("s-icon-draw-attention")) {
            return true
          }
        }).eq(0);

        //there should be max 1 other icon that is active

        if ($hasList.length && $hasList[0] !== $c[0]) {

          this.removeActiveQuickLinkState($hasList)
        }
      },

      pinLinks: function (e) {
        var $c = $(e.currentTarget);

        if (!$c.find(".active-link").length) {
          return
        }
        $c.toggleClass("pinned");
        if ($c.hasClass("pinned")) {
          this.deactivateOtherQuickLinks($c);
          this.addActiveQuickLinkState($c);
        }
        else {
          this.removeActiveQuickLinkState($c);
        }
      },

      showLinks: function (e) {
        var $c = $(e.currentTarget);
        if (!$c.find(".active-link").length) {
          return;
        }
        if ($c.hasClass("pinned")) {
          return;
        }
        else {
          this.deactivateOtherQuickLinks($c);
          this.addActiveQuickLinkState($c)
        }
      },

      hideLinks: function (e) {
        $c = $(e.currentTarget);
        if ($c.hasClass("pinned")) {
          return
        }
        this.removeActiveQuickLinkState($c)
      }
    });

    return ItemView;
  });