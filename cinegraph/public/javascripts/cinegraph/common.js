var CINEGRAPH = (function (self) {

    self.getNode = function(id, nodePosition) {
        if (id != self.scope.currentNode.id) {
            clearScene(self.scope.currentDisplayedNodes, id);
            $http.get('/api/common/' + id).success(function(node) {
                $location.search('id', id);
                var sprite = self.scope.currentNode.sprite;
                self.scope.currentNode = node;
                self.scope.currentNode.sprite = sprite;
                self.scope.updateTypesAndLimits();
                self.updateBackground(node);
                displayFriendsTastes();
                draw(node, nodePosition);
            });
        }
    }

    self.getNodeCinegraphMode = function(id, nodePosition, shouldDrawRelatedNodes) {
        $http.get('/api/common/' + id).success(function(node) {
            var sprite = self.scope.currentNode.sprite;
            self.scope.currentNode = node;
            self.scope.currentNode.sprite = sprite;
            self.scope.updateTypesAndLimits();
            self.updateBackground(node);
            if (!self.scope.lightMode)
                draw(node, nodePosition, shouldDrawRelatedNodes);
        });
    };

    function getRelatedNodes(startNode, startNodeSprite, typesAndLimits) {
        var index = 0;
        var limit, job;
        if (startNode.type == "Person") {
            job = startNode.jobs[0].name;
            limit = self.scope.findLimitForJob(job);
            self.getRelatedNodesForType(startNode, job, limit, 0, index, startNodeSprite);
        }
        else {
            for (var i = 0; i < 2; i++) {
                job = typesAndLimits[i].type;
                limit = typesAndLimits[i].limit;
                self.getRelatedNodesForType(startNode, job, limit, 0, index, startNodeSprite);
                index += limit;
            }
        }
    }

    /* callback called when getting a node from the API */
    function draw(node, nodePosition) {
        var nodeSprite;
        if (node.id == self.scope.currentNode.id) {
            if (self.scope.currentNode.sprite == null)
                self.scope.currentNode.sprite = drawNode(node, nodePosition).sprite;
            nodeSprite = self.scope.currentNode.sprite;
        }
        else
            nodeSprite = drawNode(node, nodePosition).sprite;
        getRelatedNodes(node, nodeSprite, self.scope.typesAndLimits);
    }

    function drawCinegraphMode(node, nodePosition, shouldDrawRelatedNodes) {
        var nodeSprite = drawNode(node, nodePosition);
        if (shouldDrawRelatedNodes) {
            getRelatedNodes(node, nodeSprite.sprite, self.scope.typesAndLimits);
        }
    }

    function drawNode(node, position, startNodeSprite, type) {
        var text = node.name ? (node.firstname + " " + node.lastname) : node.title
        var canvas = self.generateTexture(node.jobs != undefined ? node.jobs[0].name : undefined,
            self.getDefaultImage(), text);
        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
        sprite._id = node.id;
        sprite.name = text;
        sprite.canvas = canvas;
        sprite.texture = texture;
        sprite.mainJob = node.jobs != undefined ? node.jobs[0].name : undefined;
        // image loading
        if (node.img == undefined || node.img == false)
            sprite.nodeImage = self.getDefaultImage();
        else {
            sprite.nodeImage = new Image();
            if (node.title == undefined)
                sprite.nodeImage.src = 'images/persons/' + self.sanitizeFileName(node.fullname) + '.jpg';
            else
                sprite.nodeImage.src = 'images/movies/' + self.sanitizeFileName(node.title + node.released) + '/poster.jpg';
            sprite.nodeImage.onerror = function () { this.src = 'images/default.jpg'; };
            sprite.nodeImage.onload = function () {
                self.updateTexture(sprite.mainJob, sprite.nodeImage, sprite.canvas, sprite.name);
                sprite.texture.needsUpdate = true;
            };
        }
        sprite.scale.set(0, 0, 0);
        // outline
        var gradientSprite = self.generateSpriteBackground(sprite.mainJob);
        gradientSprite.material.depthWrite = false;
        gradientSprite.isOutlineSprite = true;
        gradientSprite.position.set(0,0,-0.000001);
        sprite.add(gradientSprite);
        // adding sprite
        self.scene.add(sprite);
        if (startNodeSprite !== undefined){
            sprite.position.set(startNodeSprite.position.x, startNodeSprite.position.y, startNodeSprite.position.z);
            if (self.scope.cinegraphId != undefined)
                setNodeAsSuggestion(sprite._id);
        } else
            sprite.position.set(position.x, position.y, position.z);
        // animating scale
        new TWEEN.Tween(sprite.scale).to({x: 8, y: 8, z: 8}, 200)
            .delay(800).easing(TWEEN.Easing.Linear.None).start();
        // animating position
        if (startNodeSprite !== undefined) {
            // drawing line
            var lineGeom = new THREE.Geometry();
            lineGeom.vertices.push(sprite.position, startNodeSprite.position);
            var startColor, endColor;
            if (node.name)
                startColor = self.colors[type], endColor = self.orangeColor;
            else
                startColor = self.orangeColor, endColor = self.colors[type];
            lineGeom.colors.push(new THREE.Color(startColor));
            lineGeom.colors.push(new THREE.Color(endColor));
            var lineMat = new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true });
            if (self.scope.cinegraphId != undefined)
                lineMat.opacity = 0.3;
            line = new THREE.Line(lineGeom, lineMat);
            line.endNodeId = sprite._id;
            line.startNodeId = startNodeSprite._id;
            self.linesScene.add(line);
            // animation object
            var animObj = new Object();
            animObj.sprite = sprite;
            animObj.line = lineGeom;
            new TWEEN.Tween(animObj.sprite.position).to({x: position.x, y:position.y, z: position.z}, 2000)
                .easing(TWEEN.Easing.Elastic.InOut)
                .onUpdate(function () {
                    animObj.line.vertices[0].set(sprite.position.x, sprite.position.y, sprite.position.z);
                    animObj.line.verticesNeedUpdate = true;
                }).start();
        }
        return {sprite: sprite};
    }

    function drawRelatedNodes(startNodeSprite, relatedNodes, index, limit, type) {
        if (limit > relatedNodes.length)
            limit = relatedNodes.length;
        var occupiedPositions = self.getOccupiedPositions();
        for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
            var relatedNodePosition = self.getNextPosition(occupiedPositions, startNodeSprite.position);
            occupiedPositions.push(relatedNodePosition);
            var relatedNodeSprite = drawNode(relatedNodes[j], relatedNodePosition, startNodeSprite, type);
        }
        self.scope.updateSelectedJobs();
    }

    function pushRelations(array, index, count, direction, relationships, rels, callback) {
        var endpoint = relationships[index].start;
        if (direction == "out") {
            endpoint = relationships[index].end;
        }
        $http.get('/api/common/' + endpoint).success(function(node) {
            var found = false;
            for (var j = 0; j < array.length; j++) {
              var endpoint2 = array[j].start;
                if (direction == "out") {
                    endpoint2 = array[j].end;
                }
                if (endpoint === endpoint2) {
                    found = true;
                    break;
                }
            }
            if (self.scope.cinegraphId != undefined) {
                $.each(self.scope.suggestedNodes, function(j, obj) {
                    var endpoint2 = obj.start;
                    if (direction == "out") {
                        endpoint2 = obj.end;
                    }
                    if (endpoint === endpoint2) {
                        found = true;
                        return false;
                    }
                });
            }

            if (!found) {
                rels.push(node);
                if (self.scope.cinegraphId != undefined)
                    self.scope.suggestedNodes.push(relationships[index]);
                else
                    self.scope.currentDisplayedNodes.push(relationships[index]);
            }
            count.val++;
            if (count.val == relationships.length) {
                callback(rels);
            }
        });
    }

    self.getRelatedNodesForType = function(startNode, type, limit, offset, index, startNodeSprite) {
        var direction = 'in';
        if (startNode.type == 'Person') {
            direction = 'out';
        }
        $http.get('/api/common/' + startNode.id + '/relationshipsRaw/' + direction + '/' + type + '/' + limit + '/' + offset)
            .success(function(relationships) {
                if (relationships.length > 0) {
                    var rels = [];
                    if (self.scope.suggestedNodes == undefined || self.scope.suggestedNodes.length == 0) {
                        self.scope.suggestedNodes = [];
                    }
                    var count = { val: 0 };
                    for (var i = 0; i < relationships.length; i++) {
                        var found = false;
                        var array = null;
                        if (self.scope.cinegraphId != undefined) {
                            array = self.scope.currentCinegraph.nodes;
                        }
                        else {
                            array = self.scope.currentDisplayedNodes;
                        }
                        for (var j = 0; j < array.length; j++) {
                          if (relationships[i].id === array[j].id) {
                                found = true;
                                count.val++;
                                break;
                            }
                        }
                        if (found == false) {
                            pushRelations(array, i, count, direction, relationships, rels, function(relsResult) {
                                drawRelatedNodes(startNodeSprite, relsResult, index, limit, type);
                            });
                        }
                    }
                }
        });
    };

    self.findNode = function(id) {
        for (var i = 0; i < self.scene.children.length; i++)
            if (self.scene.children[i]._id == id)
                return self.scene.children[i];
        return undefined;
    };

    self.findRelationship = function(start, end) {
        for (var i = 0; i < self.linesScene.children.length; i++) {
            var line = self.linesScene.children[i];
            if (line.type == "Line")
                if (start == line.startNodeId && end == line.endNodeId
                    || end == line.startNodeId && start == line.endNodeId)
                    return line;
        }
        return undefined;
    };

    self.removeRelationship = function(start, end) {
        var r = self.findRelationship(start, end);
        if (r != undefined) {
            r.geometry.dispose();
            r.material.dispose();
            self.linesScene.remove(r);
        }
    };

    self.removeNode = function(id) {
        var n = self.findNode(id);
        if (n != undefined) {
            new TWEEN.Tween(n.scale).to({x: 0, y:0, z:0}, 500)
                .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                    n.geometry.dispose();
                    n.material.dispose();
                    n.texture.dispose();
                    self.scene.remove(n);
                }).start();
        }
    };

    self.removeByJobType = function(array) {
        var jobs = {
            'ACTED_IN': [],
            'WROTE': [],
            'PRODUCED': [],
            'DIRECTED': [],
            'EDITED': [],
            'DIRECTED_PHOTOGRAPHY': [],
            'COMPOSED_MUSIC': [],
            'DESIGNED_COSTUMES': [],
            'DESIGNED_PRODUCTION': []
        }
        for (var i = 0; i < array.length; i++) {
            jobs[array[i].type].push(array[i]);
        };
        for (var job in jobs) {
            if (self.scope.findLimitForJob(job) < jobs[job].length) {
                for (var i = self.scope.findLimitForJob(job); i < jobs[job].length; i++) {
                    var endpoint = jobs[job][i].end;
                    if (self.scope.currentNode.type != 'Person') {
                        endpoint = jobs[job][i].start;
                    }
                    self.removeOneFromScene(self.scope.currentDisplayedNodes, endpoint, self.scope.currentNode.id);
                };
            }
        }
    };

    self.removeOneFromScene = function(array, idToRemove, excludedId) {
        var length = self.linesScene.children.length;
        for (var i = length - 1; i >= 0; i--)
        {
            var line = self.linesScene.children[i];
            if (line.endNodeId == idToRemove || line.startNodeId == idToRemove) {
                self.linesScene.remove(line);
            }
        }

        length = self.scene.children.length;
        for (var i = length - 1; i >= 0; i--)
        {
            var node = self.scene.children[i];
            var index = -1;
            $.each(array, function(j, obj) {
                var endpoint = obj.start;
                if (self.scope.currentNode.type == "Person") {
                    endpoint = obj.end;
                }
                if (node._id === idToRemove && endpoint == idToRemove) {
                    index = j;
                    return false;
                }
            });
            if (node._id != excludedId && index !== -1)
            {
                array.splice(index, 1);
                var n = node;
                new TWEEN.Tween(n.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None)
                    .onComplete(function (){
                        self.scene.remove(n);
                    }).start();
            }
        }
    };

    function clearScene(array, targetId)
    {
        // getting id of center node to keep
        var originId;
        for (var i = 0; i < self.linesScene.children.length; i++)
        {
            var line = self.linesScene.children[i];
            if (line.startNodeId == targetId)
                originId = line.endNodeId;
            else if (line.endNodeId == targetId)
                originId = line.startNodeId;
        }
        // removing lines
        var length = self.linesScene.children.length;
        for (var i = length - 1; i >= 0; i--)
        {
            var line = self.linesScene.children[i];
            if (line.type == "Line" && line.startNodeId != targetId && line.endNodeId != targetId){
                line.geometry.dispose();
                line.material.dispose();
                self.linesScene.remove(line);
            }
        }
        // removing sprites
        length = self.scene.children.length;
        toRemove = [];
        for (var i = length - 1; i >= 0; i--)
        {
            var node = self.scene.children[i];
            var index = -1;
            $.each(array, function(j, obj) {
                if (node._id == obj.start || node._id == obj.end) {
                    index = j;
                    return false;
                }
            });
            if (node._id != targetId && node._id != originId && index !== -1)
            {
                array.splice(index, 1);
                toRemove.push(node);
                new TWEEN.Tween(node.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None)
                    .onComplete(function (){
                        toRemove[0].geometry.dispose();
                        toRemove[0].material.dispose();
                        toRemove[0].texture.dispose();
                        self.scene.remove(toRemove[0]);
                        toRemove.splice(0,1);
                    }).start();
            }
        }
    }

    function displayLines(i, cinegraphNodes, lineGeom) {
        var relation = cinegraphNodes[i], type = relation.type;
        $http.get('/api/common/' + relation.end).success(function(endNode) {
            if (self.findRelationship(relation.start, relation.end) != undefined)
                return;
            if (endNode.name)
                var startColor = self.colors[type], endColor = self.orangeColor;
            else
                var startColor = self.orangeColor, endColor = self.colors[type];
            lineGeom.colors.push(new THREE.Color(startColor));
            lineGeom.colors.push(new THREE.Color(endColor));
            var lineMat = new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true });
            line = new THREE.Line(lineGeom, lineMat);
            line.endNodeId = relation.end;
            line.startNodeId = relation.start;
            self.linesScene.add(line);
        });
    }

    self.displayCinegraphNodes= function(cinegraphNodes, refreshScene) {
        var focusOnPath = refreshScene && cinegraphNodes.length > 0;
        if (focusOnPath){
            // getting path's nodes id to tag them later
            var originalPathNodes = [];
            for (var i = 0; i < cinegraphNodes.length; i++){
                var r = cinegraphNodes[i];
                if (r.start != null && originalPathNodes.indexOf(r.start) == -1)
                    originalPathNodes.push(r.start);
                if (r.end != null && originalPathNodes.indexOf(r.end) == -1)
                    originalPathNodes.push(r.end);
            }
        }
        // if refreshScene current nodes positions will be recalculated
        if (refreshScene && self.scope.currentCinegraph.nodes != undefined)
            cinegraphNodes = cinegraphNodes.concat(self.scope.currentCinegraph.nodes);
        var positions = self.getCinegraphPositions(cinegraphNodes, refreshScene);
        // drawing nodes
        for (var i in positions){
            var n = self.findNode(i);
            if (n == undefined || n.IsSuggested) {
                (function (i) {
                    $http.get('/api/common/' + i).success(function(node) {
                        if (i == Object.keys(positions)[0]) {
                            self.scope.currentNode = node;
                            self.scope.updateTypesAndLimits();
                            self.updateBackground(node);
                            self.scope.currentNode.sprite = drawNode(node, positions[i]).sprite;
                            self.scope.updateSelectedJobs();
                        }
                        else
                            drawNode(node, positions[i]);
                        // tagging the node as suggestion
                        if (focusOnPath && originalPathNodes.indexOf(parseInt(i)) != -1)
                            setTimeout(function() {setNodeAsSuggestion(i);}, 800);
                    });
                })(i);
            } else if (refreshScene)
                new TWEEN.Tween(n.position).to({x: positions[i].x, y: positions[i].y, z: positions[i].z}, 1000)
                    .easing(TWEEN.Easing.Linear.None).start();
        }
        // drawing lines
        for (var i = 0; i < cinegraphNodes.length; i++){
            var relation = cinegraphNodes[i];
            if (relation.start != null && relation.end != null) {
                var line = self.findRelationship(relation.start, relation.end);
                if (line == undefined) { // create line if not present
                    var lineGeom = new THREE.Geometry();
                    lineGeom.vertices.push(positions[relation.end], positions[relation.start]);
                    displayLines(i, cinegraphNodes, lineGeom);
                } else if (refreshScene) { // update line position if present
                    (function (line) {
                        var pStart = positions[relation.start];
                        new TWEEN.Tween(line.geometry.vertices[1]).to({x:pStart.x, y:pStart.y, z:pStart.z}, 1000)
                            .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                                line.geometry.verticesNeedUpdate = true;
                            }).start();
                        var pEnd = positions[relation.end];
                        new TWEEN.Tween(line.geometry.vertices[0]).to({x:pEnd.x, y:pEnd.y, z:pEnd.z}, 1000)
                            .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                                line.geometry.verticesNeedUpdate = true;
                            }).start();
                    })(line);
                }
            }
        }
        // getting camera new position (path barycenter)
        var barycenter = new THREE.Vector3(0,0,0);
        if (focusOnPath)
        {
            for (var i = 0; i < originalPathNodes.length; i++)
                barycenter.add(positions[originalPathNodes[i]]);
            barycenter.divideScalar(originalPathNodes.length > 0 ? originalPathNodes.length : 1);
        } else {
            for (var id in positions)
                barycenter.add(positions[id]);
            barycenter.divideScalar(Object.keys(positions).length);
        }
        self.cameraLookAtPosition(barycenter);
    };

    self.refreshGraph = function() {
        self.removeFilters();
        self.removeSuggestions();
        self.displayCinegraphNodes([], true);
    }

    /* ----------------------- */
    /*        SUGGESTIONS      */
    /* ----------------------- */

    self.removeSuggestions = function() {
        if (self.scope.suggestedNodes.length > 0) {
            for (var i = self.scope.suggestedNodes.length - 1; i >= 0; i--) {
                var id = self.scope.suggestedNodes[i].start;
                if (self.scope.currentNode.type == 'Person')
                    id = self.scope.suggestedNodes[i].end;
                self.removeNode(id);
                self.removeRelationship(self.scope.suggestedNodes[i].start, self.scope.suggestedNodes[i].end);
                self.scope.suggestedNodes.splice(i, 1);
                //removeOneFromScene(self.scope.suggestedNodes, id, self.scope.currentNode.id);
            }
        }
    };

    function setNodeAsSuggestion(id) {
        var n = self.findNode(id);
        if (n != undefined){
            var material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(n.mainJob != undefined ? self.colors[n.mainJob] : self.orangeColor),
                transparent: true,
                opacity: 0.5,
                depthWrite: false
            });
            var c = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), material);
            c.scale.set(0.9,0.9,0.9);
            c.tween = new TWEEN.Tween(c.scale).to({x: 1, y:1, z:1}, 1300)
                .easing(TWEEN.Easing.Quartic.InOut).onComplete(function (){
            }).yoyo(true).repeat(Infinity);
            c.tween.start();
            c.IsSuggestionCircle = true;
            c.gradientRemoveDisable = true;
            n.IsSuggested = true;
            n.add(c);
        }
    }

    function unsetNodeAsSuggestion(id) {
        var n = self.findNode(id);
        if (n != undefined){
            var c = null;
            for (var i = n.children.length - 1; i >= 0; i--)
                if (n.children[i].IsSuggestionCircle)
                    c = n.children[i];
            if (c != null) {
                c.tween.stop();
                new TWEEN.Tween(c.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                        c.geometry.dispose();
                        c.material.dispose();
                        n.remove(c);
                    }).start();
            }
            n.IsSuggested = false;
        }
    }

    function displayFriendsTastes() {
        $http.get('/api/user/rating/' + self.scope.currentNode.id).success(function (rating) {
            if (!rating.message) {
                self.scope.friendsTastes = [];
                $http.get('/api/friends/' + self.scope.currentUser.id).success(function (friends) {
                    for (var i = 0; i < friends.length; i++) {
                        getFriendsRatings(friends, i, self.scope.currentNode, rating);
                    };
                });
            }
            else {
                self.scope.friendsTastes = [];
                var sentenceObj = {
                    showButton: false,
                    sentence: "Hey buddy, rate this " + self.scope.currentNode.type.toLowerCase()
                        + " to compare it with your friends."
                };
                self.scope.friendsTastes.push(sentenceObj);
            }
        });
    }

    return self;
})(CINEGRAPH || {});