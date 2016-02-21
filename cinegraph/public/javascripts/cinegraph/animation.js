var CINEGRAPH = (function (self) {

    self.animateNodeScale = function(sprite, scale, duration, delay){
        scale = scale !== undefined ? scale : 8;
        duration = duration !== undefined ? duration : 200;
        delay = delay !== undefined ? delay : 940;
        new TWEEN.Tween(sprite.scale)
            .to({x: scale, y: scale, z: scale}, duration)
            .delay(delay)
            .easing(TWEEN.Easing.Linear.None)
            .start();
    };

    self.animateNodePosition = function(sprite, position, duration){
        if (position !== undefined) {
            new TWEEN.Tween(sprite.position).to({x: position.x, y:position.y, z: position.z}, duration)
                .easing(TWEEN.Easing.Elastic.InOut).start();
        };
    }

    self.animateNodeAndLine = function(sprite, line, position, duration) {
        var animObj = new Object();
        animObj.sprite = sprite;
        animObj.line = line;
        new TWEEN.Tween(animObj.sprite.position).to({x: position.x, y:position.y, z: position.z}, duration)
            .easing(TWEEN.Easing.Elastic.InOut)
            .onUpdate(function () {
                animObj.line.geometry.vertices[0].set(sprite.position.x, sprite.position.y, sprite.position.z);
                animObj.line.geometry.verticesNeedUpdate = true;
            }).start();
    };

    self.animateLine = function (line, startPosition, endPosition) {
        new TWEEN.Tween(line.geometry.vertices[1])
            .to({ x: startPosition.x, y: startPosition.y, z: startPosition.z}, 1000)
            .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                line.geometry.verticesNeedUpdate = true;
            }).start();
        new TWEEN.Tween(line.geometry.vertices[0])
            .to({x: endPosition.x, y: endPosition.y, z: endPosition.z}, 1000)
            .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                line.geometry.verticesNeedUpdate = true;
            }).start();
    };

    return self;
})(CINEGRAPH || {});