import '../index.css';
import * as THREE from 'three';
// nachanalen setup

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.x -= 100;

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);
camera.position.setX(-3);

renderer.render(scene, camera);

// torus

const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshStandardMaterial({ color: 0xff6347});
const torus = new THREE.Mesh(geometry, material);
torus.position.set(6,-1,-3)


// lights
const pointLight = new THREE.PointLight(0xffffff,0.5);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff,1);
scene.add(pointLight, ambientLight);




function addStar() {
  const geometry = new THREE.SphereGeometry(0.1, 24, 24);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff1a });
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3)
    .fill()
    .map(() => THREE.MathUtils.randFloatSpread(200));

  star.position.set(x, y, z);
  scene.add(star);
}

Array(1000).fill().forEach(addStar);

// background


const wiremat = new THREE.MeshStandardMaterial( {
	color: 0x00ff1a,
  wireframe: true
} );

//isosahedron

const isosahedron = new THREE.Mesh(new THREE.IcosahedronGeometry(5,1),wiremat);

scene.add(isosahedron);

isosahedron.position.z = 7.5;
isosahedron.position.setX(-12);
isosahedron.position.setY(-6);

//isosahedron2
const isosahadron2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(10,1),
    wiremat
);
scene.add(isosahadron2)
isosahadron2.position.z = 70;
isosahadron2.position.setX(-75)
isosahadron2.position.setY(-10)


// scroll animation

function moveCamera() {
  const t = document.body.getBoundingClientRect().top -1350;
  camera.position.z = t * -0.01;
  camera.position.x = t * -0.0002;
  camera.rotation.y = t * -0.0002;
  isosahedron.rotation.x = t * -0.001;
  isosahedron.rotation.z = t * -0.001;
  isosahedron.rotation.y = t * -0.001;
  isosahadron2.rotation.x = t * -0.001;
  isosahadron2.rotation.z = t * -0.001;
  isosahadron2.rotation.y = t * -0.001;
  
}

document.body.onscroll = moveCamera;
moveCamera();

// Animation Loop

function animate() {
  requestAnimationFrame(animate);

  torus.rotation.x += 0.01;
  torus.rotation.y += 0.01;
  torus.rotation.z += 0.01;

  isosahedron.rotation.x += 0.001;
  isosahedron.rotation.y += 0.001;
  isosahedron.rotation.z += 0.001;
  isosahadron2.rotation.x += 0.001;
  isosahadron2.rotation.y += 0.001;
  isosahadron2.rotation.z += 0.001;  

  //controls.update();

  renderer.render(scene, camera);
}

animate();