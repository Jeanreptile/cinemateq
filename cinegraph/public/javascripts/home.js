var cinegraphApp = angular.module('cinegraphApp', []);

cinegraphApp.service('ModelDataService', ['$http', function ($http) {
    this.getData = function () {
        return {
            async: function() {
                    return $http.get('/api/persons/all');
                }
            };
        }
    }]);

var cinegraphController = cinegraphApp.controller('cinegraphController', ['ModelDataService', '$scope', '$http', function(ModelDataService, $scope, $http) {
    $scope.currentNode = {};
    //ModelDataService.getData().async().then(function(d) { $scope.persons = d.data; });
}]);

cinegraphApp.directive("cinegraph", [ 'ModelDataService', '$http', function(ModelDataService, $http) {
	return {
		link: function link(scope, element, attrs) {
			// global vars            
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(45, document.getElementById('graph').offsetWidth / window.innerHeight, 0.1, 1000);
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();

            function init() {
                renderer.setSize(document.getElementById('graph').offsetWidth, window.innerHeight);
                renderer.setClearColor(0xf0f0f0);
                document.getElementById('graph').appendChild(renderer.domElement);
                camera.position.z = 1;

                // cube
                var geometry = new THREE.BoxGeometry(1, 1, 1);
                var material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                var cube = new THREE.Mesh(geometry, material);
                scene.add(cube);

                $http.get('/api/persons/all').success(function(d) {
                    var response = d;
                    for (var i = 0; i < (response.length / 10); i++) {
                        var obj = response[i];
                        var material = new THREE.MeshBasicMaterial({ color: 0xaaaaff });
                        var radius = 0.55;
                        var segments = 32;
                        var circleGeometry = new THREE.CircleGeometry(radius, segments);
                        var particle = new THREE.Mesh(circleGeometry, material);


                        particle.position.x = Math.random() * 60 - 30;
                        particle.position.y = Math.random() * 60 - 30;
                        particle.position.z = Math.random() * 60 - 30;
                        particle.scale.x = particle.scale.y = Math.random() * 20;

                        // images
                        var texture = new THREE.Texture(generateTexture(obj));
                        texture.needsUpdate = true;
                        var material = new THREE.SpriteMaterial({ map: texture });
                        sprite = new THREE.Sprite(material);
                        sprite.name = obj.id;
                        sprite.position.set(particle.position.x, particle.position.y, particle.position.z + 0.5);
                        sprite.scale.set(4, 4, 4);
                        scene.add(sprite);

                        // line
                        var material = new THREE.LineBasicMaterial({ color: 0x000000 });
                        var geometry = new THREE.Geometry();
                        geometry.vertices.push(sprite.position, cube.position);
                        var line = new THREE.Line(geometry, material);
                        scene.add(line);
                    }

                });

            // listeners
            //document.addEventListener('click', onMouseMove, false);
            document.getElementById('graph').addEventListener('click', onClick, false);
        }

        var img = new Image();
        img.src = 'images/scorsese.jpg';

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            var words = text.split(' ');
            var line = '';

            for(var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                }
                else {
                    line = testLine;
                }
            }
            context.fillText(line, x, y);
        }

        function generateTexture(obj) {
        	var canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 800;
            console.log(canvas.height);
        	var context = canvas.getContext('2d');
            context.fillStyle = "#FFF";
            roundRect(context, 0, 0, canvas.width, canvas.height, 30);

            context.fillStyle = "#000";
            context.font = "bold 160px Arial";
            var text = obj.name;
            console.log(context.measureText(text).width);
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, canvas.height / 2, canvas.width - 10, canvas.height / 5);
            return canvas;
        }

        var radius = 50;
        var theta = 0;
        var render = function () {
        	requestAnimationFrame(render);

        	theta += 0.0;
        	camera.position.x = radius * Math.sin(THREE.Math.degToRad(theta));
        	camera.position.y = radius * Math.sin(THREE.Math.degToRad(theta));
        	camera.position.z = radius * Math.cos(THREE.Math.degToRad(theta));
        	camera.lookAt(scene.position);

        	renderer.render(scene, camera);
        };

        function onMouseMove(event) {
        	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        	raycaster.setFromCamera(mouse, camera);
        	var intersects = raycaster.intersectObjects(scene.children);
        	for (var intersect in intersects) {
        		intersects[0].object.material.color.setHex(Math.random() * 0xffffff);
        	}
        }

        function onClick(event) {
            console.log(event.offsetX + " / " + event.offsetY);
            mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            intersects[0].object.material.color.setHex(Math.random() * 0xffffff);
/*            for (var i = 0; i < intersects.length; i++) {
*/              var intersection = intersects[0];
                var name = intersection.object.name;
                $http.get('/api/persons/' + name).success(function(person) {
                    scope.currentNode = {};
                    scope.currentNode.person = person;
                    scope.currentNode.rolesAndMovies = [];
                    $http.get('/api/persons/' + name + '/actor').success(function(relationships) {
                        scope.currentNode.relationships = relationships;
                        $http.get('/api/persons/' + name + '/actor/movies').success(function(movies) {
                            scope.currentNode.movies = movies;
                            for (var i = 0; i < scope.currentNode.relationships.length; i++) {
                                var single = { role: scope.currentNode.relationships[i].properties.roles[0],
                                    movie: scope.currentNode.movies[i] };
                                scope.currentNode.rolesAndMovies.push(single);
                            }
                        });
                    });
                });
            }

        function makeTextSprite(message, parameters) {
        	if (parameters === undefined) parameters = {};
        	var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        	var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
        	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
        	var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r: 0, g: 0, b: 0, a: 1.0 };
        	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r: 255, g: 255, b: 255, a: 1.0 };
        	var textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 0, g: 0, b: 0, a: 1.0 };

        	var canvas = document.createElement('canvas');
        	var context = canvas.getContext('2d');
        	context.font = "Bold " + fontsize + "px " + fontface;
        	var metrics = context.measureText(message);
        	var textWidth = metrics.width;

            //context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
            //context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

            //context.lineWidth = borderThickness;
            //roundRect(context, borderThickness / 2, borderThickness / 2, (textWidth + borderThickness) * 1.1, fontsize * 1.4 + borderThickness, 8);

            context.fillStyle = "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
            context.fillText(message, borderThickness, fontsize + borderThickness);

            var texture = new THREE.Texture(canvas)
            texture.needsUpdate = true;

            var spriteMaterial = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });
            var sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
            return sprite;
        }

        // function for drawing rounded rectangles
        function roundRect(ctx, x, y, w, h, r) {
        	ctx.beginPath();
        	ctx.moveTo(x + r, y);
        	ctx.lineTo(x + w - r, y);
        	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        	ctx.lineTo(x + w, y + h - r);
        	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        	ctx.lineTo(x + r, y + h);
        	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        	ctx.lineTo(x, y + r);
        	ctx.quadraticCurveTo(x, y, x + r, y);
        	ctx.closePath();
        	ctx.fill();
        	ctx.stroke();
        }

        img.onload = function(e) {
        	init();
        	render();
        }
    }
}
}]);