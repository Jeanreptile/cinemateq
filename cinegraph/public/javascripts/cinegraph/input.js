var CINEGRAPH = (function (self) {

    var mouse, mouseClickStart, mouseIsDown, currentIntersected;
    var raycaster, label;

    self.initInput = function () {
        mouse = new THREE.Vector2();
        mouseClickStart = {};
        mouseIsDown = false;
        currentIntersected = null;
        raycaster = new THREE.Raycaster();

        // listeners
        //document.getElementById('graph').addEventListener('change', render, false);
        $('#graph').off('mousedown').on('mousedown', onMouseDown);
        $('#graph').off('mouseup').on('mouseup', onMouseUp);
        $('#graph').off('mousemove').on('mousemove', onMouseMove);
        self.cameraControls.addEventListener('change', function() { self.renderNeedsUpdate = true; });
        $(document).keyup(self.switchRenderMode);
        window.addEventListener('resize', self.onWindowResize, false);

        // label text init
        label = $('<div id="canvasNodeLabel" style="text-align:center;"><div class="labelText"></div></div>');
        label.css({ 'position': 'absolute','z-index': '1','background-color': '#aaaaaa',
            'color': 'white','padding':'10px','left':'-10000'
        });
        $('#graph').parent().css('position','relative');
        $('#graph').after(label);
    };

    self.destroyInput = function(){
        raycaster = null;
        $(document).unbind("keyup", self.switchRenderMode);
        $('#graph').off('mousedown');
        $('#graph').off('mouseup');
        $('#graph').off('mousemove');
    };

    function updateHoverLabel(text){
        $('#canvasNodeLabel .labelText').text(text);
        self.updateHoverLabelPosition();
    }

    self.updateHoverLabelPosition = function(){
        if (currentIntersected != null){
            var v = self.toScreenPosition(currentIntersected.position);
            var spriteRadius = self.getSpriteRadius(currentIntersected.position, currentIntersected.scale.x);
            var y = v.y - spriteRadius - $('#canvasNodeLabel').outerHeight();
            if (y < 0)
                y = v.y + spriteRadius;
            $('#canvasNodeLabel').css({
                top: y,
                left: v.x - $('#canvasNodeLabel').outerWidth() / 2
            });
        }
    };

    function setMousePosition(event) {
        event = event || window.event;
        var target = event.target || event.srcElement, rect = target.getBoundingClientRect(),
            offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
        mouse.x = (offsetX / self.viewWidth) * 2 - 1;
        mouse.y = -(offsetY / self.viewHeight) * 2 + 1;
        mouse.clientX = offsetX;
        mouse.clientY = offsetY;
    }

    function linedraw(x1,y1,x2,y2) {
        if (x2 < x1){
            var temp = x1;
            x1 = x2;
            x2 = temp;
            temp = y1;
            y1 = y2;
            y2 = temp;
        }
        var line;
        if ($('#line').length <= 0)
        {
            line = document.createElement("div");
            line.style.borderBottom = "8px solid";
            line.style.borderColor = "red";
            line.style.position = "absolute";
            line.style.zIndex = "99999";
            line.id = 'line';
            $("#graph").before(line);
            $('#line').mouseup(function () {
                $('#graph').trigger('mouseup');
            });
        }
        else
            line = $('#line')[0];
        var length = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
        line.style.width = length + "px";
        if(navigator.userAgent.indexOf("MSIE") > -1){
            line.style.top = (y2 > y1) ? y1 + "px" : y2 + "px";
            line.style.left = x1 + "px";
            var nCos = (x2-x1)/length;
            var nSin = (y2-y1)/length;
            line.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11="
                + nCos + ", M12=" + -1*nSin + ", M21=" + nSin + ", M22=" + nCos + ")";
        } else {
            var angle = Math.atan((y2-y1)/(x2-x1));
            line.style.top = y1 + 0.5*length*Math.sin(angle) + "px";
            line.style.left = x1 - 0.5*length*(1 - Math.cos(angle)) + "px";
            line.style.transform = line.style.MozTransform = line.style.WebkitTransform = line.style.msTransform = line.style.OTransform= "rotate(" + angle + "rad)";
        }
    }

    function onMouseMove(event) {
        setMousePosition(event);
        if (!mouseIsDown)
            updateIntersection();
        else if (self.options.enablePathfinding && mouseClickStart.onNode){
            var intersected = getIntersection();
            if (intersected.length > 0){
                var id = intersected[0].object._id;
                if (id != undefined && $.inArray(id, mouseClickStart.cinegraphPath) == -1)
                    mouseClickStart.cinegraphPath.push(id);
            }
            linedraw(mouseClickStart.clientX, mouseClickStart.clientY, mouse.clientX, mouse.clientY);
        }
    }

    function onMouseDown(event) {
        setMousePosition(event);
        mouseClickStart.x = mouse.x;
        mouseClickStart.y = mouse.y;
        mouseClickStart.clientX = mouse.clientX;
        mouseClickStart.clientY = mouse.clientY;
        mouseClickStart.onNode = false;
        mouseClickStart.cinegraphPath = [];
        if (self.options.enablePathfinding){
            if (event.which == 1) { // left click
                var intersected = getIntersection();
                if (intersected.length > 0) {
                    mouseClickStart.onNode = true;
                    self.cameraControls.enabled = false;
                }
                mouseIsDown = true;
            } else if (event.which == 3) // right click
                onRightClick(event);
        } else
            mouseIsDown = true;
    }

    function onMouseUp(event) {
        setMousePosition(event);
        mouseIsDown = false;
        self.cameraControls.enabled = true;
        if (self.options.enablePathfinding){
            $('#line').remove();
            if (mouseClickStart.onNode && mouseClickStart.cinegraphPath.length > 1) {
                var startNode = self.findNode(mouseClickStart.cinegraphPath[0]);
                var endNode = self.findNode(mouseClickStart.cinegraphPath[mouseClickStart.cinegraphPath.length - 1]);
                self.findCinegraphPath(startNode, endNode);
            }
        }
        mouseClickStart.onNode = false;
        if (mouse.x != mouseClickStart.x || mouse.y != mouseClickStart.y)
            return;

        // no intersection
        var intersection = getIntersection()[0];
        if (intersection == undefined){
            self.removeSuggestions();
            self.removeFilters(self.currentNode.id);
            return;
        }
        // handling raycasting error
        if (intersection.object.isOutlineSprite || intersection.object.isOverlaySprite)
            intersection.object = intersection.object.parent;
        // intersection with a node
        if (intersection.object.node != undefined) {
            var id = intersection.object.node.id;
            self.removeFilters(self.currentNode.id);
            if (id === self.currentNode.id)
                addFilters(id);
            self.cameraLookAtNode(id);
            self.currentNode.sprite = intersection.object;
            self.selectNode(id);
            self.addRelatedNodes(id).then(function(id){
                self.removeOutOfDepthNodes();
            });
        } else if (intersection.object.isChildButton) {
            console.log(intersection.object);
            intersection.object.onClick();
        }
    }

    function onRightClick(event) {
        setMousePosition(event);
        var intersection = getIntersection()[0];
        if (intersection == undefined)
            return;
        var id = intersection.object._id;
        if (id != null && id != self.currentNode.id) {
            var relationship = null;
            $.each(self.scope.suggestedNodes, function(i, obj) {
                if (id == obj.start || id == obj.end) {
                    relationship = obj;
                    return false;
                }
            });
            if (relationship != null) {
                var nodeToRemoveIndex = null;
                var cinegraphNodes = self.scope.currentCinegraph.nodes;
                $.each(cinegraphNodes, function(i, obj) {
                    if (obj.id == null && (relationship.start == obj.start || relationship.end == obj.end)) {
                        nodeToRemoveIndex = i;
                        return false;
                    }
                });
                if (nodeToRemoveIndex != null)
                    cinegraphNodes.splice(nodeToRemoveIndex, 1);
                cinegraphNodes.push(relationship);
                // saving updated cinegraph
                $http.put('/api/mycinegraph/' + self.scope.currentCinegraph.id, {
                    titleCinegraph: self.scope.currentCinegraph.title,
                    cinegraphNodes: JSON.stringify(cinegraphNodes)
                }).success(function(res) {
                    for (var i = self.scope.suggestedNodes.length - 1; i >= 0; i--) {
                        var point = self.scope.suggestedNodes[i].start;
                        if (self.currentNode.type == 'Person')
                            point = self.scope.suggestedNodes[i].end;
                        if (self.scope.suggestedNodes[i].id != relationship.id)
                            self.scope.removeOneFromScene(self.scope.suggestedNodes, point, self.currentNode.id);
                        else {
                            // setting line opacity to 1
                            for (var k = self.linesScene.children.length - 1; k >= 0; k--)
                                if(self.linesScene.children[k].startNodeId == point || self.linesScene.children[k].endNodeId == point)
                                    self.linesScene.children[k].material.opacity = 1;
                            // removing suggestion style
                            unsetNodeAsSuggestion(id);
                        }
                    };
                    self.scope.suggestedNodes = [];
                    $http.get('/api/mycinegraph/' + self.scope.cinegraphId).success(function (cinegraph) {
                        cinegraph.nodes = JSON.parse(cinegraph.nodes);
                        self.scope.currentCinegraph = cinegraph;
                    });
                    $location.path('/cinegraph/' + self.scope.currentCinegraph.id);
                });
            }
        }
    }

    self.addChildButton = function(sprite, distance, angle, scale, text, color, callback){
        var buttonSprite = self.getButtonSprite(text, color);
        buttonSprite.scale.set(0, 0, 0);
        buttonSprite.position.set(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            0
        );
        buttonSprite.onClick = callback;
        buttonSprite.transition = 0;
        buttonSprite.onHover = function(){
            $('#graph').css({'cursor':'pointer'});
            if (buttonSprite.transition === 0){
                console.log("onHover");
                new TWEEN.Tween(buttonSprite).to({transition: 1 }, 100)
                    .easing(TWEEN.Easing.Linear.None).onUpdate(function (){
                        self.updateButtonSprite(buttonSprite, this.transition);
                    }).start();
            }
        };
        buttonSprite.onLeave = function(){
            $('#graph').css({'cursor':'default'});
            if (buttonSprite.transition !== 0){
                console.log("onLeave");
                new TWEEN.Tween(buttonSprite).to({transition: 0 }, 100)
                    .easing(TWEEN.Easing.Linear.None).onUpdate(function (){
                        self.updateButtonSprite(buttonSprite, this.transition);
                    }).start();
            }
        }
        sprite.add(buttonSprite);
        self.animateNodeScale(buttonSprite, scale, 180, 0);
    };

    function addFilters(id) {
        var n = self.findNode(id);
        var slice = Math.PI / 6;
        if (n != undefined){
            var i = 4;
            for (job in self.relationships){
                i++;
                var callback = function(){
                    alert(job);
                }
                self.addChildButton(n, 0.667, slice * i, 0.33, job, self.relationships[job].color, callback);
            }
        }
    }

    self.removeFilters = function(id) {
        var n = self.findNode(id);
        if (n !== undefined){
            for (var j = n.children.length - 1; j >= 0; j--){
                var child = n.children[j];
                if (child.isChildButton){
                    (function(child){
                        new TWEEN.Tween(child.scale).to({x: 0, y:0, z:0}, 180)
                            .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                                child.geometry.dispose();
                                child.material.dispose();
                                n.remove(child);
                            }).start();
                    })(child);
                }
            }   
        }
    };

    function unsetNodeAsFilter(id){
        var n = self.findNode(id);
        if (n != undefined){
            for (var i = n.children.length - 1; i >= 0; i--){
                var child = n.children[i];
                if (child.isFilterBackground || child.isFilterBackgroundButton) {
                    child.geometry.dispose();
                    child.material.dispose();
                    n.remove(child);
                } else if (child.isFilterButton)
                    self.updateFilterButtonSprite(child, n.node._relationships[child.filterButtonJob].active);
            }
            self.renderNeedsUpdate = true;
            n.isSetAsFilter = null;
        }
    }

    function setNodeAsFilter(id, job){
        var n = self.findNode(id);
        if (n != undefined && n.isSetAsFilter != job){
            var addBackground = true, addSwitchButton = true, addRightButton = true, addLeftButton = true;
            for (var i = 0; i < n.children.length; i++){
                var child = n.children[i];
                if (child.isFilterBackground == true) {
                    addBackground = false;
                    if (child.filterBackgroundJob != job){
                        self.updateSpriteFilterBackground(child.material.map.image.getContext('2d'), job);
                        child.material.map.needsUpdate = true;
                        child.filterBackgroundJob = job;
                    }
                } else if (child.isFilterButton)
                    self.updateFilterButtonSprite(child, child.filterButtonJob == job || self.scope.selectedJobs[child.filterButtonJob]);
                else if (child.isFilterBackgroundButton) {
                    if (child.isSwitchButton) {
                        addSwitchButton = false;
                        self.updateFilterBackgroundButtonSprite(child, self.scope.selectedJobs[job]);
                    }
                    else if (child.isLeftButton)
                        addLeftButton = false;
                    else if (child.isRightButton)
                        addRightButton = false;
                    child.filterBackgroundJob = job;
                }
            }
            // creating new filter background sprite
            if (addBackground) {
                var sprite = self.generateSpriteFilterBackground(job);
                sprite.isFilterBackground = true;
                sprite.filterBackgroundJob= job;
                sprite.position.z = 0.001;
                sprite.scale.set(0.92,0.92,0.92);
                sprite.filterBackgroundJob = job;
                n.add(sprite);
            }
            if (addSwitchButton){
                var btn = self.generateFilterBackgroundButtonSprite("✔");
                var scale = 0.23;
                btn.scale.set(scale, scale, scale);
                btn.position.z = 0.002;
                btn.position.y = -0.25
                btn.filterBackgroundJob = job;
                btn.isSwitchButton = true;
                n.add(btn);
            }
            if (addLeftButton){
                var btn = self.generateFilterBackgroundButtonSprite("◄");
                var scale = 0.23;
                btn.scale.set(scale, scale, scale);
                btn.position.x = -0.23;
                btn.position.z = 0.002;
                btn.position.y = -0.25
                btn.filterBackgroundJob = job;
                btn.isLeftButton = true;
                n.add(btn);
            }
            if (addRightButton){
                var btn = self.generateFilterBackgroundButtonSprite("►");
                var scale = 0.23;
                btn.scale.set(scale, scale, scale);
                btn.position.x = 0.23;
                btn.position.z = 0.002;
                btn.position.y = -0.25
                btn.filterBackgroundJob = job;
                btn.isRightButton = true;
                n.add(btn);
            }
            n.isSetAsFilter = job;
        }
        self.renderNeedsUpdate = true;
    }

    // overriding Sprite raycasting with custom values
    THREE.Sprite.prototype.raycast = (function () {
        var matrixPosition = new THREE.Vector3();
        return function raycast(raycaster, intersects) {
            matrixPosition.setFromMatrixPosition( this.matrixWorld );
            var distanceSq = raycaster.ray.distanceSqToPoint( matrixPosition );
            var guessSizeSq = this.scale.x * this.scale.y;
            if (this.scale.x == 8)
                guessSizeSq = 14;
            else if (this.scale.x == 0.33)
                guessSizeSq = 1.63;
            else if (this.scale.x == 0.23)
                guessSizeSq = 0.8;
            if (distanceSq > guessSizeSq)
                return;
            intersects.push({
                distance: Math.sqrt(distanceSq),
                point: this.position,
                face: null,
                object: this
            });
        };
    }());

    function getIntersection() {
        raycaster.setFromCamera(mouse, self.camera);
        return raycaster.intersectObjects(self.scene.children, true);
    }

    function updateIntersection() {
        var intersects = getIntersection();
        if (intersects.length > 0){
            var intersected = intersects[0].object;
            if (intersected.isOverlaySprite){
                intersected = intersected.parent;
            }
            if (intersected == currentIntersected){
                return;
            }
            // node intersection
            if (intersected.node !== undefined) {
                if (currentIntersected && (currentIntersected.isChildButton || currentIntersected.node))
                    currentIntersected.onLeave();
                currentIntersected = intersected;
                updateHoverLabel(currentIntersected.name);
                currentIntersected.onHover();
            }
            // filter button intersection
            else if (intersected.isChildButton){
                intersected.onHover();
                currentIntersected = intersected;
            }
        } else {
            if (currentIntersected && currentIntersected.isChildButton)
                currentIntersected.onLeave();
        }
    }

    return self;
})(CINEGRAPH || {});