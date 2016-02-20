var CINEGRAPH = (function (self) {

    const cameraFov = 70;
    const cameraDist = 33;
    const nearDistance = 1;

    self.cameraControls = null;
    self.camera = null;

    self.initCamera = function(){
        self.camera = new THREE.PerspectiveCamera(cameraFov, self.viewWidth / self.viewHeight, nearDistance, 1000);
        self.camera.position.set(0, 0, cameraDist);
        self.cameraControls = new THREE.TrackballControls(self.camera, document.getElementById('graph'));
        self.cameraControls.rotateSpeed = 2.0;
        self.cameraControls.zoomSpeed = 1.2;
        self.cameraControls.panSpeed = 0.8;
        self.cameraControls.noZoom = false;
        self.cameraControls.noPan = false;
        self.cameraControls.staticMoving = true;
        self.cameraControls.dynamicDampingFactor = 0.3;
        self.cameraControls.keys = [65, 83, 68];
    };

    self.cameraLookAtPosition = function(pos){
        var p = new THREE.Vector3().copy(self.camera.position).sub(pos).setLength(cameraDist).add(pos);
        new TWEEN.Tween(self.camera.position).to({ x: p.x, y: p.y, z: p.z }, 1000)
            .easing(TWEEN.Easing.Exponential.Out).start();
        new TWEEN.Tween(self.cameraControls.target).to({ x: pos.x, y: pos.y, z: pos.z }, 1000)
            .easing(TWEEN.Easing.Exponential.Out).start();
    };

    self.cameraLookAtNode = function(id){
        var n = self.findNode(id);
        if (n != undefined)
            self.cameraLookAtPosition(n.position);
    }

    self.getSpriteRadius = function(spritePosition, spriteScale) {
        var camDir = new THREE.Vector3();
        var camDir2 = new THREE.Vector3(0, 0, -1);
        var crossProduct = new THREE.Vector3();
        var posOffset = new THREE.Vector3();
        camDir.copy(spritePosition).sub(self.camera.position);
        camDir2.applyQuaternion(self.camera.quaternion);
        if (camDir.angleTo(camDir2) == 0)
            camDir.x += 0.00001;
        crossProduct.crossVectors(camDir, camDir2).setLength(4);
        posOffset.copy(spritePosition).add(crossProduct);
        return (self.toScreenPosition(posOffset).distanceTo(self.toScreenPosition(spritePosition))) * spriteScale / 8;
    };

    self.toScreenPosition = function(v){
        var vector = new THREE.Vector3();
        vector.copy(v);
        var widthHalf = 0.5 * self.viewWidth;
        var heightHalf = 0.5 * self.viewHeight;
        vector.project(self.camera);
        vector.x = (vector.x * widthHalf) + widthHalf;
        vector.y = - (vector.y * heightHalf) + heightHalf;
        return new THREE.Vector3(vector.x,  vector.y, 0);
    };

    return self;
})(CINEGRAPH || {});