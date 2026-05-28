import * as THREE from 'three';
import { LANE_POSITIONS, TRACK_SEGMENT_LENGTH, TRACK_VISIBLE_SEGMENTS } from '../config/constants.js';

export class Track {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stage = stageConfig;
    this.segments = [];
    this.decorations = [];
    this.roadWidth = 14;
    this.segmentLength = TRACK_SEGMENT_LENGTH;
    this.totalLength = stageConfig.trackLength;
    this.playerZ = 0;
    this.materials = {};
    this.extraObjects = [];
    this.initMaterials();
    this.buildInitialSegments();
  }

  initMaterials() {
    const env = this.stage.environment;
    let roadColor = 0x333333, lineColor = 0xffffff, sideColor = 0x228822;

    if (env === 'desert') { roadColor = 0x998866; sideColor = 0xcc9944; }
    else if (env === 'forest') { roadColor = 0x2a2a1a; sideColor = 0x1a4a0a; }
    else if (env === 'mountain') { roadColor = 0x555566; sideColor = 0x888899; }
    else if (env === 'bridge') { roadColor = 0x444455; sideColor = 0x888888; }
    else if (env === 'night') { roadColor = 0x1a1a2a; sideColor = 0x111133; }
    else if (env === 'storm') { roadColor = 0x222233; sideColor = 0x111122; }

    this.materials.road = new THREE.MeshLambertMaterial({ color: roadColor });
    this.materials.line = new THREE.MeshLambertMaterial({ color: lineColor });
    this.materials.side = new THREE.MeshLambertMaterial({ color: sideColor });
    this.materials.barrier = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    this.materials.finish = new THREE.MeshLambertMaterial({ color: 0xffffff });
  }

  buildInitialSegments() {
    for (let i = 0; i < TRACK_VISIBLE_SEGMENTS + 2; i++) {
      this.createSegment(i * this.segmentLength);
    }
    this.createFinishLine();
    this.createStartLine();
  }

  createSegment(zPos) {
    const group = new THREE.Group();
    group.userData.z = zPos;

    // Main road
    const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    const road = new THREE.Mesh(roadGeo, this.materials.road);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zPos + this.segmentLength / 2);
    road.receiveShadow = true;
    group.add(road);

    // Lane dividers
    LANE_POSITIONS.forEach((lx, i) => {
      if (i < LANE_POSITIONS.length - 1) {
        const divX = (LANE_POSITIONS[i] + LANE_POSITIONS[i + 1]) / 2;
        for (let d = 0; d < this.segmentLength; d += 8) {
          const dashGeo = new THREE.PlaneGeometry(0.18, 3.5);
          const dash = new THREE.Mesh(dashGeo, this.materials.line);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(divX, 0.01, zPos + d + 3.5);
          group.add(dash);
        }
      }
    });

    // Road edges (white lines)
    [-this.roadWidth / 2, this.roadWidth / 2].forEach(ex => {
      const edgeGeo = new THREE.PlaneGeometry(0.3, this.segmentLength);
      const edge = new THREE.Mesh(edgeGeo, this.materials.line);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(ex, 0.01, zPos + this.segmentLength / 2);
      group.add(edge);
    });

    // Side terrain
    [-1, 1].forEach(side => {
      const sideWidth = 30;
      const sideGeo = new THREE.PlaneGeometry(sideWidth, this.segmentLength);
      const sideMesh = new THREE.Mesh(sideGeo, this.materials.side);
      sideMesh.rotation.x = -Math.PI / 2;
      sideMesh.position.set(side * (this.roadWidth / 2 + sideWidth / 2), -0.05, zPos + this.segmentLength / 2);
      sideMesh.receiveShadow = true;
      group.add(sideMesh);

      // Barriers
      const barrierGeo = new THREE.BoxGeometry(0.5, 1.2, this.segmentLength);
      const barrier = new THREE.Mesh(barrierGeo, this.materials.barrier);
      barrier.position.set(side * (this.roadWidth / 2 + 0.25), 0.6, zPos + this.segmentLength / 2);
      barrier.castShadow = true;
      group.add(barrier);
    });

    // Environment decorations
    this.addDecorations(group, zPos);

    this.scene.add(group);
    this.segments.push(group);
    return group;
  }

  addDecorations(group, zPos) {
    const env = this.stage.environment;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const xBase = side * (this.roadWidth / 2 + 3 + Math.random() * 8);
      const z = zPos + (i / count) * this.segmentLength + Math.random() * 10;

      if (env === 'city' || env === 'night') {
        // Buildings
        const h = 8 + Math.random() * 20;
        const w = 4 + Math.random() * 4;
        const geo = new THREE.BoxGeometry(w, h, w);
        const mat = new THREE.MeshLambertMaterial({
          color: env === 'night' ? new THREE.Color(0.05 + Math.random() * 0.1, 0.05 + Math.random() * 0.1, 0.1 + Math.random() * 0.3) : new THREE.Color(0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.5 + Math.random() * 0.3)
        });
        const building = new THREE.Mesh(geo, mat);
        building.position.set(xBase, h / 2, z);
        building.castShadow = true;
        group.add(building);

        if (env === 'night') {
          const winGeo = new THREE.BoxGeometry(w * 0.8, h * 0.9, 0.1);
          const winMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.3 });
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(xBase, h / 2, z + w / 2 + 0.1);
          group.add(win);
        }
      } else if (env === 'forest' || env === 'mountain') {
        // Trees
        const trunkH = 3 + Math.random() * 2;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, trunkH, 6);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0a });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(xBase, trunkH / 2, z);
        trunk.castShadow = true;
        group.add(trunk);

        const foliageGeo = new THREE.ConeGeometry(1.5 + Math.random(), 4 + Math.random() * 2, 7);
        const foliageMat = new THREE.MeshLambertMaterial({ color: env === 'forest' ? 0x1a5c10 : 0x558855 });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.set(xBase, trunkH + 2, z);
        foliage.castShadow = true;
        group.add(foliage);
      } else if (env === 'desert') {
        // Cacti / rocks
        const rockGeo = new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.2, 0);
        const rockMat = new THREE.MeshLambertMaterial({ color: 0xaa8855 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(xBase, 0.4, z);
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        group.add(rock);
      } else if (env === 'highway') {
        // Lamp posts
        if (i % 3 === 0) {
          const postGeo = new THREE.CylinderGeometry(0.08, 0.12, 7, 6);
          const postMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(side * (this.roadWidth / 2 + 1.2), 3.5, z);
          group.add(post);
          const lampGeo = new THREE.SphereGeometry(0.3, 8, 8);
          const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
          const lamp = new THREE.Mesh(lampGeo, lampMat);
          lamp.position.set(side * (this.roadWidth / 2 + 1.2), 7.2, z);
          group.add(lamp);
        }
      }
    }
  }

  createFinishLine() {
    const z = this.totalLength;
    const checkGeo = new THREE.PlaneGeometry(this.roadWidth, 3);
    const checkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const check = new THREE.Mesh(checkGeo, checkMat);
    check.rotation.x = -Math.PI / 2;
    check.position.set(0, 0.05, z);
    this.scene.add(check);
    this.extraObjects.push(check);

    // Checkered pattern overlay
    for (let cx = -6; cx <= 6; cx += 1.5) {
      for (let cz = -1.5; cz <= 1.5; cz += 1.5) {
        if ((Math.round(cx / 1.5) + Math.round(cz / 1.5)) % 2 === 0) {
          const sq = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          sq.rotation.x = -Math.PI / 2;
          sq.position.set(cx, 0.06, z + cz);
          this.scene.add(sq);
          this.extraObjects.push(sq);
        }
      }
    }

    // Finish arch poles
    [-this.roadWidth / 2 - 0.5, this.roadWidth / 2 + 0.5].forEach(px => {
      const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 8);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, 4, z);
      this.scene.add(pole);
      this.extraObjects.push(pole);
    });

    const archGeo = new THREE.BoxGeometry(this.roadWidth + 3, 0.6, 0.6);
    const arch = new THREE.Mesh(archGeo, new THREE.MeshLambertMaterial({ color: 0xcc0000 }));
    arch.position.set(0, 8, z);
    this.scene.add(arch);
    this.extraObjects.push(arch);
    this.finishZ = z;
  }

  createStartLine() {
    const startGeo = new THREE.PlaneGeometry(this.roadWidth, 2);
    const startMat = new THREE.MeshBasicMaterial({ color: 0x00cc00 });
    const start = new THREE.Mesh(startGeo, startMat);
    start.rotation.x = -Math.PI / 2;
    start.position.set(0, 0.05, 10);
    this.scene.add(start);
    this.extraObjects.push(start);
  }

  update(playerZ) {
    this.playerZ = playerZ;
    // Recycle segments behind player
    this.segments.forEach(seg => {
      if (seg.userData.z + this.segmentLength < playerZ - this.segmentLength * 2) {
        const newZ = seg.userData.z + TRACK_VISIBLE_SEGMENTS * this.segmentLength;
        if (newZ < this.totalLength + this.segmentLength) {
          this.scene.remove(seg);
          this.segments.splice(this.segments.indexOf(seg), 1);
          this.createSegment(newZ);
        }
      }
    });
  }

  dispose() {
    this.segments.forEach(s => this.scene.remove(s));
    this.segments = [];
    this.extraObjects.forEach(o => this.scene.remove(o));
    this.extraObjects = [];
    Object.values(this.materials).forEach(m => m.dispose());
  }
}
