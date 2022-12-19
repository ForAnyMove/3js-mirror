import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CANNON from 'cannon';
import { Reflector } from 'three/examples/jsm/objects/Reflector';
import * as dat from 'dat.gui';
import doorTexture from '../static/textures/door/color.jpg'
import doorNormalTexture from '../static/textures/door/normal.jpg'
// import gifrURL from '../static/source/gift.gltf'
const gui = new dat.GUI();
const debugObject = {};

debugObject.jump = () => {
	giftBody.position.y += 3;
};

gui.add(debugObject, 'jump');

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

const canvas = document.querySelector('canvas.webgl');

const scene = new THREE.Scene();

window.addEventListener('resize', () => {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.set(0, 4, 6);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

const pointLight = new THREE.PointLight('yellow', 0.5);
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(3, 3, 3);
scene.add(directionalLight);
// experiments

const loadingManager = new THREE.LoadingManager();

const textureLoader = new THREE.TextureLoader(loadingManager);

const texture = textureLoader.load(doorTexture);
const floorTexture = textureLoader.load(doorNormalTexture);


const material = new THREE.MeshStandardMaterial({
	map: texture ? texture : null,
	color: texture ? null : 'grey',
	metalness: 0.5,
	roughness: 0,
});

//physics

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const defoultMaterial = new CANNON.Material('defoult');
const defoultContactMaterial = new CANNON.ContactMaterial(
	defoultMaterial,
	defoultMaterial,
	{
		friction: 0.1,
		restitution: 0.7,
	}
);

world.addContactMaterial(defoultContactMaterial);
world.defaultContactMaterial = defoultContactMaterial;

const giftShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
const giftBody = new CANNON.Body({
	mass: 1,
	position: new CANNON.Vec3(0, 2, 0),
	shape: giftShape,
});

world.addBody(giftBody);

const floorBody = new CANNON.Body({
	mass: 0,
	position: new CANNON.Vec3(0, 0, 0),
	shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

const plane = new THREE.Mesh(
	new THREE.PlaneGeometry(9, 9),
	new THREE.MeshStandardMaterial()
);
plane.rotation.x = -Math.PI * 0.5;
plane.position.y = 0.99;
plane.material.color = {
	r: Math.random(),
	g: Math.random(),
	b: Math.random(),
};
plane.material.map = floorTexture;
plane.material.roughness = 0;
plane.material.metalness = 0.5;
plane.material.side = THREE.DoubleSide;
scene.add(plane);

const mirror = new Reflector(new THREE.PlaneGeometry(5, 5), {
	color: new THREE.Color(0x7f7f7f),
	textureWidth: window.innerWidth * window.devicePixelRatio,
	textureHeight: window.innerHeight * window.devicePixelRatio,
});

mirror.rotation.x = -Math.PI * 0.5;
mirror.position.y = 1;
scene.add(mirror);

const sun = new THREE.Mesh(
	new THREE.SphereGeometry(0.3),
	new THREE.MeshBasicMaterial({
		color: 0xffff00,
	})
);
sun.position.y = 2;
scene.add(sun);

const towers = [];

const gltfLoader = new GLTFLoader();
let model = null;

gltfLoader.load('./source/gift.gltf', (gltf) => {
	model = gltf.scene;
	model.scale.set(0.5, 0.5, 0.5);
	scene.add(model);
});

const createTowerBody = () => {
	return new CANNON.Body({
		mass: 1,
		position: new CANNON.Vec3(0, 2, 0),
		shape: giftShape,
	});
};
const createTowerMesh = () => {
	return new THREE.Mesh(new THREE.BoxGeometry(), material);
};

window.addEventListener('keydown', (event) => {
	if (event.code === 'Space') {
		const tower = {
			mesh: createTowerMesh(),
			body: createTowerBody(),
		};

		towers.push(tower);
	}
	// gltfLoader.load('/source/gift.gltf', (gltf) => {
	// 	tower.mesh = gltf.scene;
	// 	tower.mesh.scale.set(0.5, 0.5, 0.5);
	//     tower.mesh.position.copy(tower.body.position)
	// 	scene.add(tower.mesh);
	// });
	console.log(towers);
});

// const model = new THREE.Mesh(
//     new THREE.BoxGeometry(),
//     new THREE.MeshStandardMaterial({
//         map: texture? texture : null,
//         color: texture? null : 'grey',
//         metalness: .5,
//         roughness: 0
//     })
// )
// scene.add(model)

// render

const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const clock = new THREE.Clock();
let oldElapsedTime = 0;
const tick = () => {
	const elapsedTime = clock.getElapsedTime();
	const deltaTime = elapsedTime - oldElapsedTime;
	oldElapsedTime = elapsedTime;

	sun.position.x = Math.sin(elapsedTime) * 4;
	sun.position.z = Math.cos(elapsedTime) * 4;

	pointLight.position.copy(sun.position);

	world.step(1 / 60, deltaTime, 3);
	if (towers.length > 0) {
		towers.map((el) => {
			el.mesh.position.copy(el.body.position);
		});
	}

	if (model) {
		model.position.copy(giftBody.position);
		// model.quaternion.copy(giftBody.quaternion)
	}
	controls.update();

	renderer.render(scene, camera);

	window.requestAnimationFrame(tick);
};

tick();
