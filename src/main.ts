import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

const bullets = [];
const bulletBodies = [];
let mesh;
let meshBody;

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const light = new THREE.AmbientLight(0xffffff, 15.0);
scene.add(light);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
const world = new CANNON.World();
world.gravity.set(0, -10, 0);

const groundMaterial = new CANNON.Material("groundMaterial");
const groundBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
  shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

function render() {
  renderer.render(scene, camera);
}


const shoot = () => {

  const listenForClick = (event, object) => {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(object);

    if (intersects.length > 0) {
      const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      scene.add(bullet);

      // 计算发射方向
      const direction = new THREE.Vector3();
      raycaster.ray.direction.normalize();
      direction.copy(raycaster.ray.direction);

      const bulletBody = new CANNON.Body({
        mass: 0.1,
        shape: new CANNON.Sphere(0.05),
        material: groundMaterial
      });

      bullets.push(bullet);
      bulletBodies.push(bulletBody);

      // 子弹从相机位置发射
      bullet.position.copy(camera.position);
      bulletBody.position.copy(bullet.position);

      bulletBody.velocity.set(
          direction.x * 20,
          direction.y * 20,
          direction.z * 20
      );

      world.addBody(bulletBody);

      setTimeout(() => {
        scene.remove(bullet);
        world.removeBody(bulletBody);

        const index = bullets.indexOf(bullet);
        if (index > -1) {
          bullets.splice(index, 1);
          bulletBodies.splice(index, 1);
        }
      }, 3000);
    }
  }

  const rerenderBullets = () => {
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].position.copy(bulletBodies[i].position);
      bullets[i].quaternion.copy(bulletBodies[i].quaternion);
    }
  }

  return {listenForClick, rerenderBullets};
}

function updatePhysics() {
  world.step(1 / 60);
  // 使用 cube 代替模型，模型计算body存在问题
  mesh.position.copy(cubeBody.position);
  mesh.quaternion.copy(cubeBody.quaternion);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updatePhysics();

  // 更新子弹位置
  shoot().rerenderBullets();

  render();
}

loader.load('./bucket.glb', (gltf) => {

  mesh = gltf.scene;
  scene.add(mesh);

  const modelSize = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
  const halfExtents = new CANNON.Vec3(modelSize.x / 2, modelSize.y / 2, modelSize.z / 2);
  const modelShape = new CANNON.Box(halfExtents);
  meshBody = new CANNON.Body({
    mass: 1,
    shape: modelShape,
    material: groundMaterial
  });
  meshBody.position.set(0, 0, 0);
  gltf.scene.position.set(0, 0, 0);
  gltf.scene.scale.set(5, 5, 5);
  world.addBody(meshBody);

  camera.position.set(0, 5, 5);

  renderer.domElement.addEventListener('click', function (event) {
    shoot().listenForClick(event, mesh);
  });
}, undefined, (error) => {
  console.error(error);
});

const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const cubeBody = new CANNON.Body({
  mass: 1,
  shape: cubeShape,
  material: groundMaterial
});
cubeBody.position.set(0, 0, 0);
world.addBody(cubeBody);

animate();

