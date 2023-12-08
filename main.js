import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {Vector3} from "three";
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const scene = new THREE.Scene();
const loader = new FBXLoader();
// const loader = new GLTFLoader();

// Degrees to radians function
let radians = function(degrees) {
	return degrees * Math.PI / 180;
};




// Load the FBX model
loader.load('./resources/Rigged Hand.fbx', (object) => {
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	const controls = new OrbitControls(camera, renderer.domElement);

	scene.add(object);

	camera.position.z = 5;
	camera.lookAt( object.position);

	const texture = new THREE.TextureLoader().load( "resources/textures/HAND_C.jpg" );

	object.traverse(function (child) {
		object.scale.set(10, 10, 10);
		object.position.set(-7.5, -14.5, -1.5);
		// child.scale.set(1, 1, 1);
		if(child instanceof THREE.SkinnedMesh){
			child.material = new THREE.MeshStandardMaterial();
			// child.material.emissive.set(0.1, 0.1, 0.1);
			child.material.map = texture;
		}
	});

	// Remove any point lights from the scene
	// object.remove(scene.getObjectByName('Hemi'));
	scene.getObjectByName('Hemi').intensity = 2.5;
	scene.getObjectByName('Point').intensity = 10.5;

	object.traverse(function (child) {
		if (!(child instanceof THREE.Bone)) {
			console.log(child);
		}
	});

    const mixer = new THREE.AnimationMixer(object);
	//
    // // Assuming you have identified the bones
    const bone1 = object.getObjectByName('finger_index01L');
	console.log(bone1);
    // ... other bones

    // Create KeyframeTracks
    const tracks = [];

    // For each bone, create a keyframe track for rotation
    // This is an example for one bone
    const times = [0, 1, 2]; // times in seconds
    const values = [
		0, radians(50), radians(90)
	]; // rotation values (x, y, z) in radians
    const track = new THREE.KeyframeTrack('finger_index02R.rotation[x]', times, values);
    tracks.push(track);
    // ... other tracks for other bones

    // Create an AnimationClip
    const clip = new THREE.AnimationClip('HandAnimation', -1, tracks);
    // Play the Animation
    const action = mixer.clipAction(clip);
    action.play();

    // Update the mixer in your render loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        mixer.update(clock.getDelta());
		// required if controls.enableDamping or controls.autoRotate are set to true
		controls.update();
        renderer.render(scene, camera);
    }

	var r = "./resources/skybox/";

    var urls = [
        r + "right.png",
        r + "left.png",
        r + "top.png",
        r + "bottom.png",
        r + "front.png",
        r + "back.png"
    ];
	console.log(urls);

    var textureCube = new THREE.CubeTextureLoader().load( urls );
    scene.background = textureCube;

    animate();
});


