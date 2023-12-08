import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {read_csv_file} from "./csv_reader";

const scene = new THREE.Scene();
const loader = new FBXLoader();

// Degrees to radians function
let radians = function(degrees) {
	return degrees * Math.PI / 180;
};


// Load the FBX model and set up the scene
loader.load('./resources/Rigged Hand.fbx', async (object) => {
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	// Add camera
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	// Controls for the camera
	const controls = new OrbitControls(camera, renderer.domElement);

	// Add hand object to the scene
	scene.add(object);

	camera.position.z = 3;
	camera.lookAt( object.position);

	// Load the texture for the hand
	const texture = new THREE.TextureLoader().load( "resources/textures/HAND_C.jpg" );

	// Position the object (model is offset)
	object.scale.set(10, 10, 10);
	object.position.set(-7.5, -14.5, -1.5);

	// Set the object's material to the texture
	object.traverse(function (child) {
		// child.scale.set(1, 1, 1);
		if(child instanceof THREE.SkinnedMesh){
			child.material = new THREE.MeshStandardMaterial();
			// child.material.emissive.set(0.1, 0.1, 0.1);
			// child.material.map = texture;
			child.material.wireframe = true;
		}
	});

	// Tweak the lights (come with the model)
	scene.getObjectByName('Hemi').intensity = 2.5;
	scene.getObjectByName('Point').intensity = 10.5;

	// Hide left hand
	scene.getObjectByName('Cube005').visible = false;

	// Look at what we have
	object.traverse(function (child) {
		if (!(child instanceof THREE.Bone)) {
			console.log(child);
		}
	});

	// Now, let's get all the finger bones of the right hand so we can animate them
	let bones = {};
	object.traverse(function (child) {
		if (child instanceof THREE.Bone
			&& (child.name.includes('finger') || child.name.includes('thumb'))
			&& child.name[child.name.length - 1] === 'R') {
			if(!(child.name in bones)){
				bones[child.name] = child;
			}
		}
	});
	console.log(bones);

	// Load the joint data
	let jointData = await read_csv_file("./resources/csvs/Untitled_2023-12-08_15-08-13_max_R001.csv");
	console.log(jointData);

	// Map from bone name to joint data name
	let boneToJoint = {
		'finger_index01R': 'Index_MCP',
		'finger_index02R': 'Index_PIP',
		'finger_index03R': 'Index_DIP',
		'finger_middle01R': 'Middle_MCP',
		'finger_middle02R': 'Middle_PIP',
		'finger_middle03R': 'Middle_DIP',
		'finger_ring01R': 'Ring_MCP',
		'finger_ring02R': 'Ring_PIP',
		'finger_ring03R': 'Ring_DIP',
		'finger_pinky01R': 'Pinky_MCP',
		'finger_pinky02R': 'Pinky_PIP',
		'finger_pinky03R': 'Pinky_DIP',
		'thumb01R': 'Thumb_MCP',
		'thumb02R': 'Thumb_DIP',
		'thumb03R': 'Thumb_TIP',
	};


    const mixer = new THREE.AnimationMixer(object);

    // For each bone, create a keyframe track for rotation
    // This is an example for one bone
	const FPS = 60;
	// times should be in seconds
    const times = [];
	// look at how many frames we have
	const numFrames = jointData.length;
	for (let i = 0; i < numFrames; i++) {
		times.push(i / FPS);
	}

	// Create KeyframeTracks
    const tracks = [];
	for (let boneName in boneToJoint) {
		let jointName = boneToJoint[boneName];
		// for (let axis of ['X', 'Y', 'Z']) {
		for (let axis of ['X']) {
			let trackName = boneName + '.rotation[' + axis.toLowerCase() + ']';
			let values = [];
			for (let i = 0; i < numFrames; i++) {
				if(boneName.includes('thumb') && axis === 'Z'){
					values.push(radians(0));
				}
				else{
					let value = jointData[i][jointName + '_' + axis];
					values.push(radians(value));
				}
			}
			let track = new THREE.KeyframeTrack(trackName, times, values);
			tracks.push(track);
		}
	}

    // Create an AnimationClip
    const clip = new THREE.AnimationClip('HandAnimation', -1, tracks);
    // Play the Animation
    const action = mixer.clipAction(clip);
	action.timeScale = 0.8;
    action.play();

    // Update the mixer in your render loop
    const clock = new THREE.Clock();
	let i = 0;
    function animate() {
        requestAnimationFrame(animate);
        mixer.update(clock.getDelta());
		// required if controls.enableDamping or controls.autoRotate are set to true
		controls.update();
        renderer.render(scene, camera);

		// Print current index tip rotation values
		let jointName = boneToJoint["finger_index03R"];
		let joint = jointData[i][jointName + '_' + "X"]
		// console.log("Index tip rotation: " + joint);

		i = (i + 1) % numFrames;
    }

	let r = "./resources/skybox/";

    let urls = [
        r + "right.png",
        r + "left.png",
        r + "top.png",
        r + "bottom.png",
        r + "front.png",
        r + "back.png"
    ];

	scene.background = new THREE.CubeTextureLoader().load(urls);

    animate(jointData);
});


