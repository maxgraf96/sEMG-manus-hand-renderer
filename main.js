import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import { io } from "socket.io-client";

import {read_csv_file} from "./csv_reader";

const scene = new THREE.Scene();
const loader = new FBXLoader();

let MODE = "animation";

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

	// Load the temp CSV file
	let jointData = await read_csv_file("./resources/csvs/temp.csv");
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
		'thumb01R': 'Thumb_CMC',
		'thumb02R': 'Thumb_MCP',
		'thumb03R': 'Thumb_TIP',
	};


    const mixer = new THREE.AnimationMixer(object);

    // For each bone, create a keyframe track for rotation
    // This is an example for one bone
	const FPS = 50;
	// times should be in seconds
    const times = [];
	// look at how many frames we have
	const numFrames = jointData.length;
	console.log("Number of frames: " + numFrames);
	const totalDuration = numFrames / FPS; // Total duration of the animation in seconds
	for (let i = 0; i < numFrames; i++) {
		times.push(i / FPS);
	}

	// Create KeyframeTracks
    const tracks = [];
	for (let boneName in boneToJoint) {
		let jointName = boneToJoint[boneName];
		for (let axis of ['X', 'Y', 'Z']) {

			let trackName = boneName + '.rotation[' + axis.toLowerCase() + ']';
			let values = [];
			for (let i = 0; i < numFrames; i++) {
				let value = parseFloat(jointData[i][jointName + '_' + axis]);

				if(boneName.includes('thumb01') && axis === 'X'){
					value = 160 - value;
					values.push(radians(value));
				}
				else if(boneName.includes('thumb') && axis === 'X'){
					values.push(radians(value));
				}

				if(boneName.includes('thumb') && axis === 'Y'){
					values.push(radians(value));
				}

				if(boneName.includes('thumb01') && axis === 'Z'){
					value = value - 90;
					values.push(radians(value));
				}
				if(boneName.includes('thumb02') && axis === 'Z'){
					value = value + 90;
					values.push(radians(value));
				}
				if(boneName.includes('thumb03') && axis === 'Z'){
					value = value + 90;
					values.push(radians(value));
				}

				if(!boneName.includes('thumb')){
					if(value < 0)
						value = -value;

					// Only for visualizing - the 3D model clips with values > 100
					value = Math.min(value, 100);

					values.push(radians(value));
				}
			}
			let track = new THREE.KeyframeTrack(trackName, times, values);
			tracks.push(track);
		}
	}

    // Create an AnimationClip
    const clip = new THREE.AnimationClip('HandAnimation', totalDuration, tracks);
	console.log("Creating animation clip with total duration: " + totalDuration + " seconds.");
    // Play the Animation
    const action = mixer.clipAction(clip);
	action.timeScale = 1.0;
    action.play();

    // Update the mixer in your render loop
    const clock = new THREE.Clock();
	let i = 0;
	let delta = 0;
	// This has to be JS's 60 FPS, not the animation's 50 FPS
	let interval = 1 / 60;
	let clockDelta = 0;

	let cumulDelta = 0;
	let timerclock;

    function animate() {
		if(MODE === "live"){
			action.stop();

			renderer.render(scene, camera);
        	requestAnimationFrame(animate);
			return;
		}
		clockDelta = clock.getDelta();
		cumulDelta += clockDelta;

		mixer.update(clockDelta);

		if(cumulDelta > interval){
			i = (i + 1) % numFrames;
			cumulDelta = 0;
			// console.log("Frame: " + i);

		}
		controls.update();
		renderer.render(scene, camera);


		if(i === numFrames - 1){
			i = 0;

			timerclock.stop();
			console.log("Animation finished. Total time: " + timerclock.elapsedTime + " seconds.)");
			timerclock.start();
		}

        requestAnimationFrame(animate);
    }

	let r = "./resources/skybox/";

    let urls = [
        r + "px.png", //r + "right.png",
        r + "nx.png", //r + "left.png",
        r + "py.png", //r + "top.png",
        r + "ny.png", //r + "bottom.png",
        r + "pz.png", //r + "front.png",
        r + "nz.png" //r + "back.png"
    ];

	scene.background = new THREE.CubeTextureLoader().load(urls);

	timerclock = new THREE.Clock();
	timerclock.start();
    animate(jointData);

	// Connect to the Socket.IO server
	const socket = io('http://localhost:5173'); // Adjust the URL/port as necessary

	// Listen for 'joint_angles' events from the server
	socket.on('joint_angles', (data) => {
		MODE = "live"
		// console.log('Received joint_angles:', data);

		// Update the bone rotations - we get index mcp and pip, middle mcp and pip, ring mcp and pip, pinky mcp and pip -> 8 values
		let bone_name;
		for(let i = 0; i < 8; i++){
			switch (i) {
				case 0:
					bone_name = 'finger_index01R';
					break;
				case 1:
					bone_name = 'finger_index02R';
					break;
				case 2:
					bone_name = 'finger_middle01R';
					break;
				case 3:
					bone_name = 'finger_middle02R';
					break;
				case 4:
					bone_name = 'finger_ring01R';
					break;
				case 5:
					bone_name = 'finger_ring02R';
					break;
				case 6:
					bone_name = 'finger_pinky01R';
					break;
				case 7:
					bone_name = 'finger_pinky02R';
					break;
			}
			for (let axis of ['X']) {
				let value = parseFloat(data[i]);
				if(value < 0)
					value = -value;

				// Only for visualizing - the 3D model clips with values > 100
				value = Math.min(value, 100);

				bones[bone_name].rotation[axis.toLowerCase()] = radians(value);
				bones[bone_name].rotation['y'] = radians(0);
				bones[bone_name].rotation['z'] = radians(0);
			}
		}
	});
});




