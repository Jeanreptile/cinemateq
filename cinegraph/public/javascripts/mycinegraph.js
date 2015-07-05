cinegraphApp.controller('MyCinegraphCtrl', function($scope, $http, $window, $location, AuthService, $routeParams, $modal) {

	$scope.cinegraphId = $routeParams.id;

	if (AuthService.isLoggedIn()) {
		$http.get('/api/mycinegraph/all/' + AuthService.currentUser().id).success(function (data, status, headers, config) {
			$scope.mycinegraphs = data;
		})
		.error(function (data, status, headers, config) {
			// Erase the token if the user fails to log in
			console.log('error');
			// Handle login errors here
			if (data.message) {
			  //$scope.message = data.message;
			}
			else {
			  //$scope.message = 'Error: Invalid user or password';
			}
		});
	}

    $scope.suggestedNodes = [];

    $scope.updateTypesAndLimits = function() {
        if ($scope.currentNode.type == "Person")
        {
            $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                                    { type: 'PRODUCED', limit: 2},
                                    { type: 'DIRECTED', limit: 2},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1},
                                    { type: 'WROTE', limit: 5},
                                    { type: 'EDITED', limit: 3},
                                    { type: 'DESIGNED_PRODUCTION', limit: 3},
                                    { type: 'DESIGNED_COSTUMES', limit: 2} ];
        }
        else
        {
            $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                                    { type: 'DIRECTED', limit: 1},
                                    { type: 'PRODUCED', limit: 1},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1},
                                    { type: 'WROTE', limit: 1},
                                    { type: 'EDITED', limit: 1},
                                    { type: 'DESIGNED_PRODUCTION', limit: 1},
                                    { type: 'DESIGNED_COSTUMES', limit: 1} ];
        }
    };

    $scope.updateSelectedJobs = function() {
        if ($scope.currentNode.type == 'Person') {
            $scope.selectedJobs = {
                    actor: $scope.currentNode.jobs[0].name == 'ACTED_IN',
                    writer: $scope.currentNode.jobs[0].name == 'WROTE',
                    producer: $scope.currentNode.jobs[0].name == 'PRODUCED',
                    director: $scope.currentNode.jobs[0].name == 'DIRECTED',
                    editor: $scope.currentNode.jobs[0].name == 'EDITED',
                    dirphotography: $scope.currentNode.jobs[0].name == 'DIRECTED_PHOTOGRAPHY',
                    musiccomposer: $scope.currentNode.jobs[0].name == 'COMPOSED_MUSIC',
                    cosdesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_COSTUMES',
                    proddesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_PRODUCTION' };
        }
        else {
            $scope.selectedJobs = {
                    actor: true,
                    writer: false,
                    producer: false,
                    director: true,
                    editor: false,
                    dirphotography: false,
                    musiccomposer: false,
                    cosdesigner: false,
                    proddesigner: false };
        }
    };

    $scope.findLimitForJob = function(type) {
        for (var i = 0 ; i < $scope.typesAndLimits.length; i++) {
            if ($scope.typesAndLimits[i].type == type) {
                return $scope.typesAndLimits[i].limit;
            }
        }
    };

    $scope.filterByActor = function() {
        if ($scope.selectedJobs.actor) {
            $scope.getRelatedNodesForType($scope.currentNode, 'ACTED_IN', $scope.findLimitForJob('ACTED_IN'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "ACTED_IN") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByDirector = function() {
        if ($scope.selectedJobs.director) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED', $scope.findLimitForJob('DIRECTED'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "DIRECTED") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByProducer = function() {
        if ($scope.selectedJobs.producer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'PRODUCED', $scope.findLimitForJob('PRODUCED'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "PRODUCED") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByWriter = function() {
        if ($scope.selectedJobs.writer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'WROTE', $scope.findLimitForJob('WROTE'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "WROTE") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByEditor = function() {
        if ($scope.selectedJobs.editor) {
            $scope.getRelatedNodesForType($scope.currentNode, 'EDITED', $scope.findLimitForJob('EDITED'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "EDITED") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByDirPhotography = function() {
        if ($scope.selectedJobs.dirphotography) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED_PHOTOGRAPHY', $scope.findLimitForJob('DIRECTED_PHOTOGRAPHY'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "DIRECTED_PHOTOGRAPHY") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByMusicComposer = function() {
        if ($scope.selectedJobs.musiccomposer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'COMPOSED_MUSIC', $scope.findLimitForJob('COMPOSED_MUSIC'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "COMPOSED_MUSIC") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByCosDesigner = function() {
        if ($scope.selectedJobs.cosdesigner) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_COSTUMES', $scope.findLimitForJob('DESIGNED_COSTUMES'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "DESIGNED_COSTUMES") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByProdDesigner = function() {
        if ($scope.selectedJobs.proddesigner) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_PRODUCTION', $scope.findLimitForJob('DESIGNED_PRODUCTION'),
                $scope.suggestedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.suggestedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.suggestedNodes[i];
                var startpoint = obj.start;
                var endpoint = obj.end;
                if ($scope.currentNode.type != 'Person') {
                    startpoint = obj.end;
                    endpoint = obj.start;
                }
                if ($scope.currentNode.id === startpoint && obj.type == "WROTE") {
                    $scope.removeOneFromScene($scope.suggestedNodes, endpoint, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.open = function (size) {
        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'partials/detailed-sheet',
            controller: 'ModalInstanceCtrl',
            size: size,
            resolve: {
                currentNode: function() {
                    return $scope.currentNode;
                }
            }
        });
    };

    $scope.openCreateCinegraphModal = function() {

        var createCinegraphModal = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'partials/create-cinegraph',
            controller: 'CRUDCinegraphCtrl',
            size: 'md',
            resolve: {
                mycinegraphs: function() {
                    return $scope.mycinegraphs;
                },
                currentCinegraph: function() {
                    return $scope.currentCinegraph;
                },
                currentNode: function() {
                    return $scope.currentNode;
                }
            }
        });

        createCinegraphModal.result.then(function(newCinegraph) {
            $scope.mycinegraphs.push(newCinegraph);
        }, function () {
            console.log("Error");
        });
    };

    $scope.openEditCinegraphTitleModal = function() {

        var editCinegraphModal = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'partials/edit-cinegraph',
            controller: 'CRUDCinegraphCtrl',
            size: 'md',
            resolve: {
                mycinegraphs: function() {
                    return $scope.mycinegraphs;
                },
                currentCinegraph: function() {
                    return $scope.currentCinegraph;
                },
                currentNode: function() {
                    return $scope.currentNode;
                }
            }
        });

        editCinegraphModal.result.then(function(editedCinegraph) {
            $scope.currentCinegraph = editedCinegraph;
        }, function () {
            console.log("Error");
        });
    };

    $scope.openDeleteCinegraphModal = function() {

        var deleteCinegraphModal = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'partials/delete-cinegraph',
            controller: 'CRUDCinegraphCtrl',
            size: 'sm',
            resolve: {
                mycinegraphs: function() {
                    return $scope.mycinegraphs;
                },
                currentCinegraph: function() {
                    return $scope.currentCinegraph;
                },
                currentNode: function() {
                    return $scope.currentNode;
                }
            }
        });

        deleteCinegraphModal.result.then(function() {
            $location.path('/mycinegraph');
        }, function () {
            console.log("Error");
        });
    };

    $scope.openAddToCinegraphModal = function() {
        var addToCinegraphModal = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'partials/add-node-to-cinegraph',
            controller: 'CRUDCinegraphCtrl',
            size: 'md',
            scope: $scope,
            resolve: {
                mycinegraphs: function() {
                    return $scope.mycinegraphs;
                },
                currentCinegraph: function() {
                    return $scope.currentCinegraph;
                },
                currentNode: function() {
                    return $scope.currentNode;
                }
            }
        });

        addToCinegraphModal.result.then(function() {
            $location.path('/mycinegraph');
        }, function () {
            console.log("Error");
        });
    };


});

cinegraphApp.controller('CRUDCinegraphCtrl', function($scope, $http, AuthService, $modalInstance, mycinegraphs, currentCinegraph, currentNode) {

    $scope.mycinegraphs = mycinegraphs;
    $scope.currentCinegraph = currentCinegraph;
    $scope.currentNode = currentNode;

    $scope.close = function () {
        $modalInstance.dismiss("close");
    };

    $scope.createCinegraph = function() {
        var currentUser = AuthService.currentUser();
        $http.post('/api/mycinegraph/', { titleCinegraph: $scope.cinegraphTitle, idUser: currentUser.id }).success(function(res) {
            $modalInstance.close(res);
        });
    };

    $scope.createAndAddToCinegraph = function() {
        var currentUser = AuthService.currentUser();
        $http.post('/api/mycinegraph/', { titleCinegraph: $scope.cinegraphTitle, idUser: currentUser.id }).success(function(res) {
            if ($scope.currentNode.type == 'Person') {
                res.nodes.push({"start": $scope.currentNode.id, "end": null, "type": null, "properties": {},"id": null});
            }
            else {
                res.nodes.push({"start": null, "end": $scope.currentNode.id, "type": null, "properties": {},"id": null});
            }
            $http.put('/api/mycinegraph/' + res.id,
                { titleCinegraph: res.title, cinegraphNodes: JSON.stringify(res.nodes) }).success(function(res) {
                    $modalInstance.close();
            });
        });
    };

    $scope.editCinegraphTitle = function() {
        var currentUser = AuthService.currentUser();
        $http.put('/api/mycinegraph/' + currentCinegraph.id, { titleCinegraph: $scope.cinegraphTitle, cinegraphNodes: currentCinegraph.nodes }).success(function(res) {
            $modalInstance.close(res);
        });
    };

    $scope.deleteCinegraph = function() {
        $http.delete('/api/mycinegraph/' + currentCinegraph.id).success(function() {
            $modalInstance.close();
        });
    };

    $scope.selectedCinegraph = {};
    $scope.addCurrentNodeToCinegraph = function() {
        var found = false;
        $.each($scope.selectedCinegraph.c.nodes, function(i, obj) {
            if ($scope.currentNode.id == obj.start
                || $scope.currentNode.id == obj.end) {
                found = true;
            }
        });
        if (!found) {
            if ($scope.currentNode.type == 'Person') {
                $scope.selectedCinegraph.c.nodes.push({"start": $scope.currentNode.id, "end": null, "type": null, "properties": {},"id": null});
            }
            else {
                $scope.selectedCinegraph.c.nodes.push({"start": null, "end": $scope.currentNode.id, "type": null, "properties": {},"id": null});
            }
        }
        $http.put('/api/mycinegraph/' + $scope.selectedCinegraph.c.id,
            { titleCinegraph: $scope.selectedCinegraph.c.title, cinegraphNodes: JSON.stringify($scope.selectedCinegraph.c.nodes) }).success(function(res) {
                $modalInstance.close();
        });

    };
});