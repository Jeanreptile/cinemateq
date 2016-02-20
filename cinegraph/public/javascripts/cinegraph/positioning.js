var CINEGRAPH = (function (self) {

    const nodeSpacing = 200;

    function positionIsValid(array, vector){
        var index;
        for (index = 0; index < array.length; ++index)
            if (array[index].distanceToSquared(vector) <= nodeSpacing)
                return false;
        return true;
    }

    self.getOccupiedPositions = function(){
        var positions = [];
        // sprites already on the self.scene
        for (var i = self.scene.children.length - 1; i >= 0; i--)
            if (self.scene.children[i].type == "Sprite")
                positions.push(self.scene.children[i].position);
        // sprites to be added
        for (var i = TWEEN.getAll().length - 1; i >= 0; i--){
            var targetPos = TWEEN.getAll()[i].getValuesEnd();
            if (targetPos.x != undefined && targetPos.y != undefined && targetPos.z != undefined)
                positions.push(new THREE.Vector3(targetPos.x,targetPos.y,targetPos.z));
        }
        return positions;
    };

    self.getNextPosition = function(occupiedPositions, centerNodePosition){
        var slice = Math.PI / 5;
        var sphereRadius = 18;
        var nextPosition = centerNodePosition.clone();
        var i = 0;
        do {
            if (i < 10 && self.scope.cinegraphId == undefined){
                nextPosition.x = Math.round(centerNodePosition.x + sphereRadius * Math.cos(slice * i));
                nextPosition.y = Math.round(centerNodePosition.y + sphereRadius * Math.sin(slice * i));
                nextPosition.z = 0;
            }
            else {
                nextPosition.x = Math.random() * 2 - 1;
                nextPosition.y = Math.random() * 2 - 1;
                nextPosition.z = Math.random() * 2 - 1;
                nextPosition.setLength(sphereRadius).round().add(centerNodePosition);
            }
            i++;
            if (i % 50 == 0)
                sphereRadius = 18 * (1 + i / 50);
        } while (!positionIsValid(occupiedPositions, nextPosition))
        return nextPosition;
    };

    function handleRelation(relation, positions, occupiedPositions, refreshScene){
        var start = relation.start, end = relation.end;
        if (start != null && positions[start] == undefined){
            var centerPos = positions[end] != undefined ? positions[end] : new THREE.Vector3(0,0,0);
            var n = self.findNode(start);
            positions[start] = (n != undefined && !refreshScene) ?
                n.position : self.getNextPosition(occupiedPositions, centerPos);
            occupiedPositions.push(positions[start]);
        }
        if (end != null && positions[end] == undefined) {
            var centerPos = positions[start] != undefined ? positions[start] : new THREE.Vector3(0,0,0);
            var n = self.findNode(end);
            positions[end] = (n != undefined && !refreshScene) ?
                n.position : self.getNextPosition(occupiedPositions, centerPos);
            occupiedPositions.push(positions[end]);
        }
    }

    self.getCinegraphPositions = function(cinegraphNodes, refreshScene){
        positions = [];
        var occupiedPositions = refreshScene == true ? [] : self.getOccupiedPositions();
        for (var i = 0; i < cinegraphNodes.length; i++)
        {
            handleRelation(cinegraphNodes[i], positions, occupiedPositions, refreshScene);
            var start = cinegraphNodes[i].start, end = cinegraphNodes[i].end;
            // exploring relations containing start node
            for (var j = i + 1; j < cinegraphNodes.length; j++)
                if (cinegraphNodes[j].start == start || cinegraphNodes[j].end == start)
                    handleRelation(cinegraphNodes[j], positions, occupiedPositions, refreshScene);
            // exploring relations containing end node
            for (var j = i + 1; j < cinegraphNodes.length; j++)
                if (cinegraphNodes[j].start == end || cinegraphNodes[j].end == end)
                    handleRelation(cinegraphNodes[j], positions, occupiedPositions, refreshScene);
        }
        return positions;
    };

    return self;
})(CINEGRAPH || {});