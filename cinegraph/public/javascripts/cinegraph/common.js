var CINEGRAPH = (function (self) {

    function getMainColor(node){
        if (self.types[node.label] !== undefined && self.types[node.label].color !== undefined)
            return self.types[node.label].color;
        var max = Object.keys(node._relationships)[0];
        for (var r in node._relationships)
            if (node._relationships[r].count > node._relationships[max].count)
                max = r;
        return self.relationships[max].color;
    }

    function getRelationshipsSettings(count){
        var r = {};
        for (var rel in self.relationships) {
            r[rel] = {
                skip: 0,
                limit: self.relationships[rel].limit,
                active: true,
                count: count[rel] !== undefined ? count[rel] : 0
            };
        }
        return r;
    }

    function convertArrayToMap(array){
        var r = {};
        for (var i = 0; i < array.length; i++)
            r[array[i][0]] = array[i][1];
        return r;
    }

    self.addNode = function(id, position){
        return new Promise((resolve, reject) => {
            if (self.findNode(id) === undefined) {
                $http.get('/api/common/' + id).success(function(data) {
                    var node = data.node;
                    node._relationships = getRelationshipsSettings(data.relationships);
                    node._color = getMainColor(node);
                    node._depth = 0;
                    node._neighbours = [];
                    //console.log("addNode", node);
                    var sprite = self.getNodeSprite(node);
                    sprite.scale.set(0, 0, 0);
                    position = position !== undefined ? position : self.getNewPosition();
                    sprite.position.set(position.x, position.y, position.z);
                    self.scene.add(sprite);
                    self.animateNodeScale(sprite);
                    resolve(id);
                });
            } else
                reject('Node not found');
        });
    };

    self.addRelatedNodes = function(id){
        return new Promise((resolve, reject) => {
            var n = self.findNode(id);
            if (n !== undefined) {
                $http.get('/api/common/related/' + id + '/' + JSON.stringify(n.node._relationships)).success(function(res) {
                    var occupiedPositions = self.getOccupiedPositions();
                    // for each relationship
                    for (var i = 0; i < res.length; i++){
                        var node = res[i].node;
                        if (self.findNode(node.id) === undefined){
                            node.label = res[i].label;
                            node._relationships = getRelationshipsSettings(convertArrayToMap(res[i].relationships));
                            node._color = getMainColor(node);
                            node._depth = n._depth + 1;
                            node._neighbours = [n.node.id];
                            n.node._neighbours.push(node.id);
                            //console.log("addRelatedNodes", node);
                            // TO DO: check if duplicate in related nodes
                            // adding node
                            var sprite = self.getNodeSprite(node);
                            sprite.scale.set(0, 0, 0);
                            position = self.getNextPosition(occupiedPositions, n.position);
                            occupiedPositions.push(position);
                            sprite.position.set(n.position.x, n.position.y, n.position.z);
                            self.scene.add(sprite);
                            // adding line
                            var line = getLineGeometry(n.position, res[i].type, node.name);
                            line.endNodeId = sprite.node.id;
                            line.startNodeId = id;
                            self.linesScene.add(line);
                            // animating
                            (function(sprite, line, position, i){
                                setTimeout(function(){
                                    self.animateNodeScale(sprite);
                                    self.animateNodeAndLine(sprite, line, position, 2000);
                                }, 60 * i);
                            })(sprite, line, position, i);
                        }
                    }
                    resolve(id);
                });
            } else
                reject('Node not found');
        });
    };

    self.removeOutOfDepthNodes = function(){
        updateDepth(self.currentNode, -1, []);
        for (var i = 0; i < self.scene.children.length; i++){
            if (self.scene.children[i].node !== undefined){
                var n = self.scene.children[i].node;
                if (n._depth > self.options.maxDepth)
                    self.removeNodeWithRelationships(n.id);
            }
        }
    };

    function updateDepth(node, parentDepth, visited){
        node._depth = parentDepth + 1;
        visited.push(node.id);

        for (var i = node._neighbours.length - 1; i >= 0; i--){
            var neighbour = self.findNode(node._neighbours[i]);
            if (neighbour !== undefined){
                if (visited.indexOf(neighbour.node.id) === -1 || parentDepth + 1 < neighbour.node._depth)
                    updateDepth(neighbour.node, node._depth, visited);
            } else
                node._neighbours.splice(i, 1);
        } 
    }

    self.selectNode = function(id) {
        var n = self.findNode(id);
        if (n !== undefined){
            self.cameraLookAtPosition(n.position);
            self.currentNode = n.node;
            document.getElementById('graph').dispatchEvent(new Event('currentNode'));
            self.updateBackground(n.node);
        }
    };

    function getLineGeometry(position, type, direction){
        var lineGeom = new THREE.Geometry();
        lineGeom.vertices.push(position.clone(), position.clone());
        var startColor, endColor;
        if (direction)
            startColor = self.relationships[type].color, endColor = self.types['Movie'].color;
        else
            startColor = self.types['Movie'].color, endColor = self.relationships[type].color;
        lineGeom.colors.push(new THREE.Color(startColor));
        lineGeom.colors.push(new THREE.Color(endColor));
        return new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true }));
    }

    self.findNode = function(id) {
        for (var i = 0; i < self.scene.children.length; i++)
            if (self.scene.children[i].node.id == id)
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
        return new Promise((resolve, reject) => {
            var r = self.findRelationship(start, end);
            if (r != undefined) {
                r.geometry.dispose();
                r.material.dispose();
                self.linesScene.remove(r);
                resolve();
            } else
                reject('Relationship not found');
        });
    };

    self.removeNode = function(id) {
        return new Promise((resolve, reject) => {
            var n = self.findNode(id);
            if (n != undefined) {
                new TWEEN.Tween(n.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                        n.geometry.dispose();
                        n.material.dispose();
                        n.texture.dispose();
                        self.scene.remove(n);
                        resolve();
                    }).start();
            } else
                reject('Node not found');
        });
    };

    self.removeNodeWithRelationships = function(id){
        self.removeNode(id);
        for (var i = self.linesScene.children.length - 1; i >= 0; i--) {
            var line = self.linesScene.children[i];
            if (line.type == "Line" && (line.startNodeId == id || line.endNodeId == id)){
                line.geometry.dispose();
                line.material.dispose();
                self.linesScene.remove(line);
            }
        }
    };

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
        for (var id in positions){
            var n = self.findNode(id);
            if (n == undefined || n.IsSuggested) {
                self.addNode(id, positions[id]).then(function(id){
                    if (id == Object.keys(positions)[0]) // if first node, select it
                        self.selectNode(id);
                    if (focusOnPath && originalPathNodes.indexOf(parseInt(id)) !== -1) // tagging the node as suggestion
                        setNodeAsSuggestion(id);
                });
            } else if (refreshScene)
                new TWEEN.Tween(n.position).to({x: positions[id].x, y: positions[id].y, z: positions[id].z}, 1000)
                    .easing(TWEEN.Easing.Linear.None).start();
        }
        // drawing lines
        for (var i = 0; i < cinegraphNodes.length; i++){
            var r = cinegraphNodes[i];
            if (r.start != null && r.end != null) {
                var line = self.findRelationship(r.start, r.end);
                if (line === undefined) { // create line if not present
                    line = getLineGeometry(positions[r.end], r.type, true);
                    line.endNodeId = r.end;
                    line.startNodeId = r.start;
                    self.linesScene.add(line);
                    self.animateLine(line, positions[r.end], positions[r.start]);
                } else if (refreshScene)
                    self.animateLine(line, positions[r.start], positions[r.end]);
            }
        }
        // getting camera new position (path barycenter)
        var barycenter = new THREE.Vector3(0,0,0);
        if (focusOnPath){
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
    };

    self.removeSuggestions = function() {
        /*if (self.scope.suggestedNodes.length > 0) {
            for (var i = self.scope.suggestedNodes.length - 1; i >= 0; i--) {
                var id = self.scope.suggestedNodes[i].start;
                if (self.currentNode.type == 'Person')
                    id = self.scope.suggestedNodes[i].end;
                self.removeNode(id);
                self.removeRelationship(self.scope.suggestedNodes[i].start, self.scope.suggestedNodes[i].end);
                self.scope.suggestedNodes.splice(i, 1);
                //removeOneFromScene(self.scope.suggestedNodes, id, self.currentNode.id);
            }
        }*/
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

    return self;
})(CINEGRAPH || {});