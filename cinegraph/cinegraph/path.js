var CINEGRAPH = (function (self) {

    function removePath(array) {
        for (var i = 0; i < array.length; i++){
            var r1 = array[i];
            var removeLine = true, removeStartNode = true, removeEndNode = true;
            for (var j = 0; j < self.scope.currentCinegraph.nodes.length; j++) {
                var r2 = self.scope.currentCinegraph.nodes[j];
                if (r1.start == r2.start && r1.end == r2.end)
                    removeLine = false;
                if (r1.start == r2.start || r1.start == r2.end)
                    removeStartNode = false;
                if (r1.end == r2.start || r1.end == r2.end)
                    removeEndNode = false;
            }
            if (removeLine)
                self.removeRelationship(r1.start, r1.end);
            if (removeStartNode)
                self.removeNode(r1.start);
            if (removeEndNode)
                self.removeNode(r1.end);
        }
    }

    function mergePathWithCinegraph(array) {
        // merging relationships
        for (var i = 0; i < array.length; i++) {
            var r1 = array[i];
            var add = true;
            for (var j = 0; j < self.scope.currentCinegraph.nodes.length; j++) {
                var r2 = scope.currentCinegraph.nodes[j];
                if (r1.start == r2.start && r1.end == r2.end) {
                    add = false;
                    break;
                }
            }
            if (add)
                scope.currentCinegraph.nodes.push(r1);
        }
        // removing single node relationships when duplicate is found
        for (var i = scope.currentCinegraph.nodes.length - 1; i >= 0; i--){
            var r1 = scope.currentCinegraph.nodes[i];
            if (r1.start == null || r1.end == null) {
                var rId = r1.start != null ? r1.start : r1.end;
                // searching if node is already present in another relationship
                for (var j = 0; j < scope.currentCinegraph.nodes.length; j++) {
                    if (j == i)
                        continue;
                    var r2 = scope.currentCinegraph.nodes[j];
                    if (r2.start == rId || r2.end == rId) {
                        scope.currentCinegraph.nodes.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }

    self.findCinegraphPath = function(startNode, endNode){
        if (startNode == undefined || endNode == undefined)
          return;

        // displaying commands panel
        var pathPanel = $('<div id="canvasPathPanel"><h3 class="inline">Searching for paths...</h3></div>');
        $('#graph').after(pathPanel.hide().slideDown(500));
        
        // getting paths
        $http.get('/api/mycinegraph/path/' + startNode._id + "/" + endNode._id).success(function(paths) {
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                for (var j = 0; j < path.length; j++)
                    path[j] = JSON.parse(path[j]);
            }
            pathPanel.paths = paths;
            pathPanel.current = 0;
            // displaying first path
            pathPanel.find('h3').text('Path 1 of ' + paths.length + ":");
            self.displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
            // updating and binding command panel
            pathPanel.append('<a href="#" class="btn btn-s-md btn-success canvasPathPanelAdd m-l m-t v-top">Add</a>\
                <a href="#" class="btn btn-s-md btn-default canvasPathPanelPrevious m-t v-top">Previous</a>\
                <a href="#" class="btn btn-s-md btn-default canvasPathPanelNext m-t v-top">Next</a>\
                <a href="#" class="btn btn-s-md btn-default canvasPathPanelCancel m-t v-top">Cancel</a>');
            // cancel
            $('.canvasPathPanelCancel').click(function() {
                $('#canvasPathPanel').slideUp().remove();
                removePath(pathPanel.paths[pathPanel.current]);
            });
            // next
            $('.canvasPathPanelNext').click(function() {
                var length = pathPanel.paths.length;
                if (pathPanel.current < length - 1) {
                    removePath(pathPanel.paths[pathPanel.current]);
                    pathPanel.current++;
                    pathPanel.find('h3').text('Path ' + (pathPanel.current + 1) +' of ' + paths.length + ":");
                    self.displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
                }
            });
            // previous
            $('.canvasPathPanelPrevious').click(function() {
                var length = pathPanel.paths.length;
                if (pathPanel.current > 0) {
                    removePath(pathPanel.paths[pathPanel.current]);
                    pathPanel.current--;
                    pathPanel.find('h3').text('Path ' + (pathPanel.current + 1) +' of ' + paths.length + ":");
                    self.displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
                }
            });
            // add
            $('.canvasPathPanelAdd').click(function() {
                mergePathWithCinegraph(pathPanel.paths[pathPanel.current]);
                $http.put('/api/mycinegraph/' + scope.currentCinegraph.id, {
                    titleCinegraph: scope.currentCinegraph.title,
                    cinegraphNodes: JSON.stringify(scope.currentCinegraph.nodes)
                });
                $('#canvasPathPanel').slideUp(500).remove();
            });
        });
    };

    return self;
})(CINEGRAPH || {});