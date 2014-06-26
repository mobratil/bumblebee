
define(['jquery',
  'underscore',
  'js/components/query_builder/plugin',
  'js/components/generic_module',
  'js/bugutils/minimal_pubsub'
  ], function(
  $,
  _,
  QueryBuilderPlugin,
  GenericModule,
  MinimalPubsub
  ) {

  describe("QueryBuilder (UI Component/plugin)", function () {

      var minsub, expectedQTree;
      beforeEach(function(done) {

        minsub = new (MinimalPubsub.extend({
          request: function(apiRequest) {
            var query = apiRequest.get('query');
            return {'responseHeader': {'status': 0, 'QTime': 0, params: query.toJSON()},
              'qtree': JSON.stringify(expectedQTree)};
          }
        }))({verbose: false});
        done();
      });

      afterEach(function(done) {
        minsub.close();
        var ta = $('#test');
        if (ta) {
          ta.empty();
        }
        done();
      });

      it("returns QueryBuilder object", function () {
        expect(new QueryBuilderPlugin()).to.be.instanceof(QueryBuilderPlugin);
        expect(new QueryBuilderPlugin()).to.be.instanceof(GenericModule);
      });

      it("can load CSS", function() {
        var p = new QueryBuilderPlugin();
        p.loadCss();

        var url = require.toUrl('jquery-querybuilder') + '.css';

        expect($(document.getElementsByTagName("head")[0]).find('link[href=\''+url+'\']').length).to.be.eql(1);
        p.loadCss();
        expect($(document.getElementsByTagName("head")[0]).find('link[href=\''+url+'\']').length).to.be.eql(1);
      });

      it("can insert itself into a page and provides interactive query building", function() {
        var p = new QueryBuilderPlugin({el: '#test'});
        p.activate(minsub.beehive.getHardenedInstance());

        expectedQTree = {"name":"OPERATOR", "label":"AND", "children": [
          {"name":"MODIFIER", "label":"MODIFIER", "children": [
            {"name":"TMODIFIER", "label":"TMODIFIER", "children": [
              {"name":"FIELD", "label":"FIELD", "children": [
                {"name":"TERM_NORMAL", "input":"title", "start":0, "end":4},
                {"name":"QNORMAL", "label":"QNORMAL", "children": [
                  {"name":"TERM_NORMAL", "input":"joe", "start":6, "end":8}]
                }]
              }]
            }]
          },
          {"name":"MODIFIER", "label":"MODIFIER", "children": [
            {"name":"TMODIFIER", "label":"TMODIFIER", "children": [
              {"name":"FIELD", "label":"FIELD", "children": [
                {"name":"QNORMAL", "label":"QNORMAL", "children": [
                  {"name":"TERM_NORMAL", "input":"doe", "start":10, "end":12}]
                }]
              }]
            }]
          }]
        };

        p.updateQueryBuilder('title:joe AND doe');

        // quick check the UI is there
        var $qb = p.$el;

        expect($qb.find('.rule-container:first select:nth(0)').val()).to.eql('title');
        expect($qb.find('.rule-container:first select:nth(1)').val()).to.eql('contains');
        expect($qb.find('.rule-container:first input').val()).to.eql('joe');

        expect($qb.find('.rule-container:nth(1) select:nth(0)').val()).to.eql('__all__');
        expect($qb.find('.rule-container:nth(1) select:nth(1)').val()).to.eql('contains');
        expect($qb.find('.rule-container:nth(1) input').val()).to.eql('doe');

        // update one of the inputs
        $qb.find('.rule-container:nth(1) input').val('woe');

        expect(p.getQuery()).to.eql('title:joe AND woe');

      });
    }
  );
});