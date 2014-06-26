/**
 * Created by rchyla on 6/23/14.
 */

define(['underscore',
    'js/components/generic_module',
    'js/components/api_query_updater'],
  function (_,
            GenericModule,
            ApiQueryUpdater) {


    var TreeNode = function (operator, value) {
      this.operator = operator;
      this.value = value;
      this.children = [];
    };
    TreeNode.prototype.addChild = function (childNode) {
      this.children.push(childNode);
    };
    TreeNode.prototype.addChildren = function (childNodes) {
      this.children = _.union(this.children, childNodes);
    };
    TreeNode.prototype.toString = function (level) {
      if (_.isUndefined(level))
        level = 0; // root

      if (this.value) { // leaf node
        return this.value;
      }

      var queries = [];
      _.each(this.children, function (child, index, list) {
        queries.push(child.toString(level+1));
      });

      var q = queries.join(' ' + this.operator + ' ');
      if (level > 0)
        q = "(" + q + ")";
      return q;
    };

    var validOperators = {'AND': 'AND', 'OR': 'OR', 'DEFOP': 'DEFOP'}
    var RuleNode = function() {

    };
    _.extend(RuleNode.prototype, {
      setCondition: function(val) {
        this.rules = this.rules || [];
        if (!val) {
          this.condition = validOperators.DEFOP;
          return;
        }
        if (!validOperators.hasOwnProperty(val))
          throw new Error("Unknown operator: " + val);
        this.condition = validOperators[val];
      },
      _serializeValue: function() {
        if (!this.value)
          return;
        var v = this.value;
        if (this.fuzzy)
          v += '~' + this.fuzzy;
        if (this.boost)
          v += '^' + this.boost;
        return v;
      },
      _modifyOperator: function(ret) {
        if (this.modifier) {
          if (this.modifier == '-') {
            ret.operator = ret.operator + '_not';
          }
          else if (this.modifier == '=') {
            ret.operator = ret.operator + '_exactly';
          }
        }
        return ret;
      },
      toJSON: function() {
        var ret = _.clone(_.pick(this, ['condition', 'id', 'field', 'type', 'input', 'operator']));
        var v = this._serializeValue();
        if (v)
          ret.value = v;
        this._modifyOperator(ret);
        if (this.rules) {
          ret.rules = [];
          _.each(this.rules, function(rule) {
            ret.rules.push(rule.toJSON());
          });
        }
        return ret;
      },
      setValue: function(val, type) {
        this.value = val;
        this.type = type || 'string';
      },
      setOffset: function(x) {
        this.offset = x;
      },
      setType: function(t) {
        this.type = t;
      },
      setEnd: function(x) {
        this.end = x;
      },
      setField: function(f) {
        this.field = f;
        this.id = f;
      },
      setModifier: function(m) {
        this.modifier = m;
      },
      setFuzzy: function(f) {
        this.fuzzy = f.replace('~', '');
      },
      setBoost: function(v) {
        this.boost = v.replace('^', '');
      },
      setOperator: function(o) {
        this.operator = o;
      },
      addGroup: function(ruleNode) {
        this.rules = this.rules || [];
        this.rules.push(ruleNode);
      }
    });


    var RulesTranslator = GenericModule.extend({
      initialize: function(options) {
        this.apiQueryUpdater = new ApiQueryUpdater('rulesTranslator');
      },

      /**
       * Converts QTree into the UI Rules. SOLR query parser returns
       * the QTree representation of the query string; which we turn
       * into rules that UI builder can use
       *
       * Original query:
       *    author:Roman AND (title:galaxy OR abstract:42)
       *
       * Typical QTree input:
       *
       * {"name":"OPERATOR", "label":"DEFOP", "children": [
       *   {"name":"MODIFIER", "label":"MODIFIER", "children": [
       *     {"name":"TMODIFIER", "label":"TMODIFIER", "children": [
       *       {"name":"FIELD", "label":"FIELD", "children": [
       *         {"name":"TERM_NORMAL", "input":"title", "start":0, "end":4},
       *         {"name":"QNORMAL", "label":"QNORMAL", "children": [
       *           {"name":"TERM_NORMAL", "input":"joe", "start":6, "end":8}]
       *         }]
       *       }]
       *     }]
       *   },
       *   {"name":"MODIFIER", "label":"MODIFIER", "children": [
       *     {"name":"TMODIFIER", "label":"TMODIFIER", "children": [
       *       {"name":"FIELD", "label":"FIELD", "children": [
       *         {"name":"QNORMAL", "label":"QNORMAL", "children": [
       *           {"name":"TERM_NORMAL", "input":"doe", "start":10, "end":12}]
       *         }]
       *       }]
       *     }]
       *   }]
       * };
       *
       * Output: see docstring for `buildQuery()`
       *
       * @param qtree
       */
      convertQTreeToRules: function(qtree) {

        if (!qtree)
          throw new Error("Empty qtree");

        this._parentize(qtree, qtree);

        var root = new RuleNode();
        if (qtree.name == 'OPERATOR') {
          root.setCondition(qtree.label);
          this._extractRules(qtree.children, root);
        }
        else {
          root.setCondition('DEFOP');
          this._extractRules(qtree, root);
        }


        return root.toJSON();
      },

      _parentize: function(qtree, parent) {
        var self = this;
        qtree.parent = parent;
        _.each(qtree, function(node) {
          if (node.children) {
            _.each(node.children), function(n) {
              self._parentize(node);
            };
          }
        })
      },

      _extractRules: function(qtree, ruleNode) {
        var self = this;
        if (_.isArray(qtree)) {
          _.each(qtree, function(r) {
            var rn = new RuleNode();
            self._extractRule(r, rn);
            ruleNode.addGroup(rn);
          });
        }
        else {
          var node = this._extractRule(qtree, ruleNode);
        }
      },

      _extractRule: function(qtree, ruleNode) { // ruleNode can be null
        var ruleNode, inputNode;
        var self = this;
        console.log('extracting', qtree.name, ruleNode);

        switch (qtree.name) {
          case 'OPERATOR':
            var newGroup = new RuleNode();
            newGroup.setCondition(qtree.label);
            ruleNode.addGroup(newGroup);
            this._extractRules(qtree.children, newGroup);
            break;
          case 'FIELD':
            if (qtree.children.length == 2) {

              if (qtree.children[1].name == 'OPERATOR') { // field:(foo bar)
                var field = qtree.children[0].input;
                this._extractRules(qtree.children[1].children, ruleNode);
                _.each(ruleNode, function(n) {
                  if (n instanceof RuleNode) {
                    n.setField(field);
                  }
                })
              }
              else {
                ruleNode.setField(qtree.children[0].input);
                this._extractRule(qtree.children[qtree.children.length-1], ruleNode);
              }
            }
            else { // unfielded search
              ruleNode.setField('__all__');
              this._extractRule(qtree.children[qtree.children.length-1], ruleNode);
            }
            break;
          case 'MODIFIER':
            if (qtree.children.length == 2)
              ruleNode.setModifier(qtree.children[0].label);
            this._extractRule(qtree.children[qtree.children.length-1], ruleNode);
            break;
          case 'TMODIFIER':
            _.each(qtree.children, function(c) {
              self._extractRule(c, ruleNode);
            });
            break;
          case 'BOOST':
            if (qtree.children.length > 0)
              ruleNode.setBoost(qtree.children[0].label);
            break;
          case 'FUZZY':
            if (qtree.children.length > 0)
              ruleNode.setFuzzy(qtree.children[0].label);
            break;
          case 'QNORMAL':
            ruleNode.setValue(qtree.children[0].input);
            ruleNode.setOffset(qtree.children[0].start);
            ruleNode.setEnd(qtree.children[0].end);
            ruleNode.setOperator('contains');
            break;
          case 'QPHRASE':
            var input =  qtree.children[0].input;
            ruleNode.setValue(input.substring(1, input-1));
            ruleNode.setOffset(qtree.children[0].start+1);
            ruleNode.setEnd(qtree.children[0].end-1);
            ruleNode.setOperator('is');
            break;
          case 'QPHRASETRUNC':
            var input =  qtree.children[0].input;
            ruleNode.setValue(input.substring(1, input-1));
            ruleNode.setOffset(qtree.children[0].start+1);
            ruleNode.setEnd(qtree.children[0].end-1);
            ruleNode.setOperator('starts_with');
            break;
          case 'QTRUNCATED':
            var input =  qtree.children[0].input;
            ruleNode.setValue(input);
            ruleNode.setOffset(qtree.children[0].start);
            ruleNode.setEnd(qtree.children[0].end);
            ruleNode.setOperator('starts_with');
            break;
          case 'QRANGEEX':
          case 'QRANGEIN':
          case 'QANYTHING':
          case 'QDATE':
          case 'QPOSITION':
          case 'QFUNC':
          case 'QDELIMITER':
          case 'QIDENTIFIER':
          case 'QCOORDINATE':
          case 'QREGEX':
            throw new Error('Not yet ready for: ' + JSON.stringify(qtree));
            break;
          default:
            console.log('skipping', qtree);
            break;

        }


        return ruleNode;
      },


      /**
       * This function can construrct a query (as a string) from the
       * UIQueryBuilder rules. Typically, this is the how the input
       * looks like:
       *
       * {
       *   "condition": "AND",
       *   "rules": [
       *     {
       *       "id": "author",
       *       "field": "author",
       *       "type": "string",
       *       "input": "text",
       *       "operator": "is",
       *       "value": "Roman"
       *     },
       *     {
       *       "condition": "OR",
       *       "rules": [
       *         {
       *           "id": "title",
       *           "field": "title",
       *           "type": "string",
       *           "input": "text",
       *           "operator": "contains",
       *           "value": "galaxy"
       *         },
       *         {
       *           "id": "abstract",
       *           "field": "abstract",
       *           "type": "string",
       *           "input": "text",
       *           "operator": "contains",
       *           "value": "42"
       *         }
       *       ]
       *     }
       *   ]
       * }
       *
       * And the output will be:
       *
       *   author:Roman AND (title:galaxy OR abstract:42)
       *
       * @param rules
       * @returns {*}
       */
      buildQuery: function (rules) {

        if (rules.rules) {
          var root = new TreeNode(rules.condition);
          var tree = this._buildQueryTree(root, rules.rules);
          if (tree) {
            return tree.toString();
          }
          return '';
        }
      },

      _buildQueryTree: function (treeNode, rules) {
        var self = this;
        if (rules && rules.length > 0) {
          _.each(rules, function(rule){
            if (rule.condition) {
              var node = new TreeNode(rule.condition);
              treeNode.addChild(node);
              self._buildQueryTree(node, rule.rules);
            }
            else {
              var node = self._buildOneRule(rule);
              if (node) {
                treeNode.addChild(node);
              }
            }
          });
        }
        return treeNode;
      },

      _buildOneRule: function(rule) {
        var val, q, field;
        if (rule.type == 'string') {
          var input = rule.value.trim();
          switch(rule.operator) {
            case 'is':
            case 'is_not':
              field = rule.field;
              val = this.apiQueryUpdater.quoteIfNecessary(input);
              if (field) {
                q = field + ':' + val;
              }
              else {
                q = val;
              }
              if (rule.operator.indexOf('_not') > -1)
                q = '-' + q;
              break;
            case 'contains':
            case 'contains_not':
              field = rule.field;
              val = this.apiQueryUpdater.quoteIfNecessary(input, '(', ')');
              if (field) {
                q = field + ':' + val;
              }
              else {
                q = val;
              }
              if (rule.operator.indexOf('_not') > -1)
                q = '-' + q;
              break;
            case 'is_exactly':
            case 'is_not_exactly':
              field = rule.field || '__all__';
              q = '=' + field + ':' + this.apiQueryUpdater.quoteIfNecessary(input);
              if (rule.operator.indexOf('_not_') > -1)
                q = 'NOT ' + q;
              break;
            case 'starts_with':
            case 'starts_not_with':
              field = rule.field || '__all__';
              if (input.indexOf('*') > -1) { // user input contains '*' - they should know what they do
                input = this.apiQueryUpdater.quoteIfNecessary(input);
              }
              else {
                var newInput = this.apiQueryUpdater.quoteIfNecessary(input);
                if (newInput.length != input.length) {
                  input = newInput.substring(0, newInput.length-1) + "*\"";
                }
                else {
                  input += '*';
                }
              }

              q = field + ':' + input;
              if (rule.operator.indexOf('_not_') > -1)
                q = '-' + q;
              break;


            default:
              throw new Error('Unknow operator: ' + rule.operator);
          }
          return new TreeNode('', q);
        }
      }

    });

    return RulesTranslator;
  });