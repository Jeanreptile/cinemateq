var CINEGRAPH = (function (self) {

    var scope;

    self.scene = null;
    self.linesScene = null;
    self.viewWidth = 0;
    self.viewHeight = 0;

    function initScope(s) {
        self.scope = s;
        scope = self.scope;
/*        scope.jobsNames = {
            actor: 'Actor',
            writer: 'Writer',
            producer: 'Producer',
            director: 'Director',
            editor: 'Editor',
            dirphotography: 'Director of photography',
            musiccomposer: 'Music composer',
            cosdesigner: 'Costume designer',
            proddesigner: 'Production designer'
        };
        scope.jobsRelationships = {
            actor: 'ACTED_IN',
            writer: 'WROTE',
            producer: 'PRODUCED',
            director: 'DIRECTED',
            editor: 'EDITED',
            dirphotography: 'DIRECTED_PHOTOGRAPHY',
            musiccomposer: 'COMPOSED_MUSIC',
            cosdesigner: 'DESIGNED_COSTUMES',
            proddesigner: 'DESIGNED_PRODUCTION'
        };
        scope.jobsOffset = {
            actor: 0,
            writer: 0,
            producer: 0,
            director: 0,
            dirphotography: 0,
            editor: 0,
            musiccomposer: 0,
            cosdesigner: 0,
            proddesigner: 0
        };
        scope.currentDisplayedNodes = [];
        scope.suggestedNodes = [];*/

        scope.clearOffsets = function () {
            for (var job in scope.jobsOffset)
                scope.jobsOffset[job] = 0;
        };

        scope.paginateBy = function(job, relationship, direction) {
            var nodes = scope.cinegraphId != undefined ? scope.suggestedNodes : scope.currentDisplayedNodes;
            if (scope.selectedJobs[job]) {
                // removing old nodes
                for (var i = nodes.length - 1; i >= 0; i--) {
                    var obj = nodes[i];
                    var startpoint = obj.start, endpoint = obj.end;
                    if (scope.currentNode.type != 'Person') {
                        startpoint = obj.end;
                        endpoint = obj.start;
                    }
                    if (scope.currentNode.id === startpoint && obj.type == relationship)
                        scope.removeOneFromScene(nodes, endpoint, scope.currentNode.id);
                }
                // getting new offset
                var limit = scope.findLimitForJob(relationship);
                if (direction == 'Right')
                    scope.jobsOffset[job] += limit;
                else {
                    scope.jobsOffset[job] -= limit;
                    scope.jobsOffset[job] = Math.max(scope.jobsOffset[job], 0);
                }
                // getting new nodes
                //console.log(job, relationship, direction, scope.jobsOffset);
                scope.getRelatedNodesForType(scope.currentNode, relationship, scope.findLimitForJob(relationship),
                    scope.jobsOffset[job], nodes.length, scope.currentNode.sprite);
            }
        };

        scope.filterBy = function filterBy(job, relationship) {
            var nodes = scope.cinegraphId != undefined ? scope.suggestedNodes : scope.currentDisplayedNodes;
            if (scope.selectedJobs[job]) {
                if (scope.currentNode.type == "Person") {
                  scope.updateTypesAndLimitsFromFilter();
                }
                self.removeByJobType(nodes);
                scope.getRelatedNodesForType(scope.currentNode, relationship, scope.findLimitForJob(relationship), 0,
                    nodes.length, scope.currentNode.sprite);
            }
            else {
                for (var i = nodes.length - 1; i >= 0; i--) {
                    var obj = nodes[i];
                    var startpoint = obj.start, endpoint = obj.end;
                    if (scope.currentNode.type != 'Person') {
                        startpoint = obj.end;
                        endpoint = obj.start;
                    }
                    if (scope.currentNode.id === startpoint && obj.type == relationship)
                        scope.removeOneFromScene(nodes, endpoint, scope.currentNode.id);
                }
            }
        };
        scope.filterByActor = function() { scope.filterBy("actor", "ACTED_IN"); };
        scope.filterByDirector = function() { scope.filterBy("director", "DIRECTED"); };
        scope.filterByProducer = function() { scope.filterBy("producer", "PRODUCED"); };
        scope.filterByWriter = function() { scope.filterBy("writer", "WROTE"); };
        scope.filterByEditor = function() { scope.filterBy("editor", "EDITED"); };
        scope.filterByDirPhotography = function() { scope.filterBy("dirphotography", "DIRECTED_PHOTOGRAPHY"); };
        scope.filterByMusicComposer = function() { scope.filterBy("musiccomposer", "COMPOSED_MUSIC"); };
        scope.filterByCosDesigner = function() { scope.filterBy("cosdesigner", "DESIGNED_COSTUMES"); };
        scope.filterByProdDesigner = function() { scope.filterBy("proddesigner", "DESIGNED_PRODUCTION"); };

        // Clean everything
        scope.$on('$destroy', function(){
            self.destroyRender();
            self.destroyInput();
        });

        scope.removeOneFromScene = self.removeOneFromScene;
        scope.getRelatedNodesForType = self.getRelatedNodesForType;
        scope.sanitizeFileName = self.sanitizeFileName;
        scope.refreshGraph = self.refreshGraph;
    }

    function getFriendsRatings(friends, index, node, currentUserRating) {
        $http.get('/api/user/'+ friends[index].id + '/rating/' + node.id).success(function (rating) {
          $http.get('community-sentences.json').success(function(data) {
            var nodeName = (node.type == 'Person' ? node.name : node.title);
            var friendName = friends[index].username;
            var nodeType = node.type.toLowerCase();

            var sentences = [];
            if (rating.message) // Friend did not rate the node.
              sentences = data.friendHasNotRated;
            else {
              if (rating.love >= 4 && currentUserRating.love >= 4) // bothWellRated
                sentences = data.bothWellRated;
              else if (rating.love >= 4 && currentUserRating.love <= 1) // oppositeRates
                sentences = data.oppositeRates;
              else if (rating.love <= 1 && currentUserRating.love >= 3) // friendHasNotWellRated
                sentences = data.friendHasNotWellRated;
            }
            if (sentences.length)
              pushCommunitySentences(sentences, friendName, nodeName, nodeType);
          });
        });
    }

    function pushCommunitySentences(sentences, friendName, nodeName, nodeType) {
      var JSONsentence = sentences[Math.floor(Math.random() * sentences.length)];
      var sentence = JSONsentence.sentence;
      var sentenceParameters = JSONsentence.parameters;
      var showButton = false;

      for (var i = 0; i < sentenceParameters.length; i++) {
        var parameter = sentenceParameters[i];
        var parameterKey = "parameter" + (i+1);
        var completedSentence = null;
        if (parameter[parameterKey] == "friendName")
            sentence = sentence.replace("{" + parameterKey + "}", friendName);
        else if (parameter[parameterKey] == "nodeName")
            sentence = sentence.replace("{" + parameterKey + "}", nodeName);
        else if (parameter[parameterKey] == "showButton")
            showButton = true;
        else if (parameter[parameterKey] == "nodeType")
            sentence = sentence.replace("{" + parameterKey + "}", nodeType);

        var sentenceObj = {
          showButton: showButton,
          sentence: sentence,
          friendName: friendName
        }

      };
      scope.friendsTastes.push(sentenceObj);
    }

    self.initScene = function() {
        self.scene = new THREE.Scene();
        self.linesScene = new THREE.Scene();
        self.linesScene.add(self.camera);
    };

    self.init = function (s, http, location) {
        $http = http;
        $location = location;
        initScope(s);
        $('#graph').css('opacity', 0);
        //defaultImg.onload = function () {
            self.initCamera();
            self.initScene();
            self.initRender();
            self.initTexture();
            self.initInput();
            self.animate();
            $('#graph').animate({"opacity":1}, 2000);
        //}
    }

    return self;
})(CINEGRAPH || {});