var CINEGRAPH = (function (self) {

    self.findNode = function(id) {
        for (var i = 0; i < self.scene.children.length; i++)
            if (self.scene.children[i]._id == id)
                return self.scene.children[i];
        return undefined;
    }

    self.findRelationship = function(start, end) {
        for (var i = 0; i < self.linesScene.children.length; i++) {
            var line = self.linesScene.children[i];
            if (line.type == "Line")
                if (start == line.startNodeId && end == line.endNodeId
                    || end == line.startNodeId && start == line.endNodeId)
                    return line;
        }
        return undefined;
    }

    self.removeRelationship = function(start, end) {
        var r = self.findRelationship(start, end);
        if (r != undefined) {
            r.geometry.dispose();
            r.material.dispose();
            self.linesScene.remove(r);
        }
    }

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
    }

    return self;
})(CINEGRAPH || {});