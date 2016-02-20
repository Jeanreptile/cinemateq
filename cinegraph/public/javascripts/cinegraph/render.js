var CINEGRAPH = (function (self) {

    var renderer, composerLines, composer, blendComposer;
    var performanceTotal;
    var performanceSampleCount;
    var idAnimationFrame;
    var stats;
    var rendererStats;
    var renderMode;
    var qualityScale;
    var tweenCount;
    const sampleRatio = 1;
    const lineThickness = 5;

    self.renderNeedsUpdate = false;

    self.initRender = function(){
        performanceTotal = 0;
        performanceSampleCount = 0;
        idAnimationFrame = 0;
        renderMode = 0;
        qualityScale = 1;
        tweenCount = 0;
        self.renderNeedsUpdate = false;
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha:true, autoClear: false });
        renderer.setSize(self.viewWidth, self.viewHeight);
        document.getElementById('graph').appendChild(renderer.domElement);

        // over sampling for antialiasing
        var parameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false
        };

        // lines
        var renderLinesTarget = new THREE.WebGLRenderTarget(self.viewWidth * sampleRatio, self.viewHeight * sampleRatio, parameters);
        var renderLinesScene = new THREE.RenderPass(self.linesScene, self.camera);
        var lineShader = new THREE.ShaderPass(THREE.ThickLineShader);
        lineShader.uniforms.totalWidth.value = self.viewWidth * sampleRatio;
        lineShader.uniforms.totalHeight.value = self.viewHeight * sampleRatio;
        lineShader.uniforms['edgeWidth'].value = lineThickness * sampleRatio;
        composerLines = new THREE.EffectComposer(renderer, renderLinesTarget);
        composerLines.addPass(renderLinesScene);
        composerLines.addPass(lineShader);

        // main self.scene
        var renderTarget = new THREE.WebGLRenderTarget(self.viewWidth * sampleRatio, self.viewHeight * sampleRatio, parameters);
        var renderScene = new THREE.RenderPass(self.scene, self.camera);
        var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
        composer = new THREE.EffectComposer(renderer, renderTarget);
        composer.addPass(renderScene);
        composer.addPass(effectCopy);

        // blend
        var blendPass = new THREE.ShaderPass(THREE.BlendShader);
        blendPass.uniforms['tBase'].value = composerLines.renderTarget1;
        blendPass.uniforms['tAdd'].value = composer.renderTarget1;
        blendPass.renderToScreen = true;
        blendComposer = new THREE.EffectComposer(renderer);
        blendComposer.addPass(blendPass);

        // statistics
        initStats();
    };

    self.destroyRender = function(){
        cancelAnimationFrame(idAnimationFrame);
        self.scene = null;
        self.linesScene = null;
        self.cameraControls = null;
        document.body.removeChild(stats.domElement);
        document.body.removeChild(rendererStats.domElement);
        stats = null;
        rendererStats = null;
    };

    function initStats(){
        rendererStats = new THREEx.RendererStats();
        rendererStats.domElement.style.position = 'absolute';
        rendererStats.domElement.style.right = '0px';
        rendererStats.domElement.style.bottom = '0px';
        rendererStats.domElement.style.display = "none";
        rendererStats.domElement.id = "rendererStats";
        stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms, 2: mb
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.right = '80px';
        stats.domElement.style.bottom = '0px';
        stats.domElement.style.display = "none";
        document.body.appendChild(rendererStats.domElement);
        document.body.appendChild(stats.domElement);
    };

    self.animate = function() {
        idAnimationFrame = requestAnimationFrame(self.animate);
        stats.begin();
        rendererStats.update(renderer);
        var startTime = new Date().getTime();
        TWEEN.update();
        self.cameraControls.update();

        var oldTweenCount = tweenCount;
        tweenCount = TWEEN.getAll().length;
        if (self.renderNeedsUpdate || tweenCount > 0 || oldTweenCount > 0 && tweenCount == 0){
            for (var i = 0; i < self.scene.children.length; i++){
                var sprite = self.scene.children[i];
                if (sprite.type == 'Sprite') {
                    sprite.lookAt(self.camera.position);
                    sprite.quaternion.copy(self.camera.quaternion);
                }
            }
            render();
            self.renderNeedsUpdate = false;
            // getting average frame render time to dynamically adjust quality
            var endTime = new Date().getTime();
            if (performanceSampleCount < 120) { // 120-frame sample
                performanceSampleCount++;
                performanceTotal += (endTime - startTime);
            }
            else {
                var avg = performanceTotal / 120;
                //console.log("average is: ", avg);
                if (avg > 33.33 && qualityScale > 0.5) { // < 30 fps
                    qualityScale = Math.max(0.5, qualityScale * 0.75);
                    onWindowResize();
                    //console.log('decreasing quality: ', qualityScale);
                }
                else if (avg < 20 && qualityScale < 1){ // > 50 fps
                    qualityScale = Math.min(1, qualityScale * 1.25);
                    onWindowResize();
                    //console.log('increasing quality: ', qualityScale);
                }
                performanceTotal = 0;
                performanceSampleCount = 0;
            }
        }
        stats.end();
    }

    function render() {
        renderer.clear();
        composerLines.render();
        self.updateHoverLabelPosition();
        self.updateGradientLayer();
        composer.render();
        blendComposer.render();
    }

    self.onWindowResize = function() {
        self.viewWidth = $('#graph').find('canvas').width(0).parent().width();
        self.viewHeight = $('#graph').find('canvas').height(0).parent().height();
        self.camera.aspect = self.viewWidth / self.viewHeight;
        self.camera.updateProjectionMatrix();
        renderer.setSize(self.viewWidth, self.viewHeight);
        var vW = self.viewWidth * sampleRatio * qualityScale, vH = self.viewHeight * sampleRatio * qualityScale;

        composerLines.setSize(vW, vH);
        var lineShader = composerLines.passes[1];
        lineShader.uniforms.totalWidth.value = vW;
        lineShader.uniforms.totalHeight.value = vH;
        lineShader.uniforms['edgeWidth'].value = lineThickness * sampleRatio * qualityScale;
        composer.setSize(vW, vH);
        blendComposer.setSize(vW / sampleRatio, vH / sampleRatio);

        var blendPass = blendComposer.passes[0];
        blendPass.uniforms['tBase'].value = composerLines.renderTarget1;
        blendPass.uniforms['tAdd'].value = composer.renderTarget1;

        self.renderNeedsUpdate = true;
    };

    self.switchRenderMode = function(e) {
        switch(e.which) {
            case 112: // F1
                renderMode = (renderMode + 1) % 3;
                composerLines.passes[composerLines.passes.length - 1].renderToScreen = (renderMode == 1);
                composer.passes[composer.passes.length - 1].renderToScreen = (renderMode == 2);
                blendComposer.passes[blendComposer.passes.length - 1].renderToScreen = (renderMode == 0);
                self.renderNeedsUpdate = true;
                break;
            case 113: // F2
                $('#stats, #rendererStats').toggle();
                break;
            default:
                return;
        }
        e.preventDefault();
    };

    return self;
})(CINEGRAPH || {});