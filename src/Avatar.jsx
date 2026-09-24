import React, { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { buildCharacter } from './character/geometry.js';
import { characterPose } from './character/motion.js';
const toonRamp = new THREE.DataTexture(new Uint8Array([110, 190, 240, 255]), 4, 1, THREE.RedFormat);
toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
toonRamp.needsUpdate = true;
function CharacterMesh({ mesh, highlight }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
    g.setIndex(mesh.triangles);
    return g;
  }, [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const color = highlight.includes(mesh.group) ? '#c2e887' : mesh.color;
  return (
    <group position={mesh.position} rotation={mesh.rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {mesh.unlit ? (
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        ) : (
          <meshToonMaterial color={color} gradientMap={toonRamp} side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
  );
}
function Character({ profile, progress, view, highlight, emote, reducedMotion }) {
  const recipe = useMemo(() => buildCharacter(profile, progress), [profile, progress]);
  const refs = useRef({}),
    turn = useRef(),
    aura = useRef(),
    start = useRef(null);
  useEffect(() => {
    start.current = null;
  }, [emote?.id]);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (start.current === null) start.current = t;
    const pose = characterPose(
      reducedMotion ? null : emote?.kind,
      t - start.current,
      reducedMotion ? 0 : t,
    );
    const r = refs.current;
    if (turn.current)
      turn.current.rotation.y = reducedMotion
        ? view === 'back'
          ? Math.PI
          : view === 'side'
            ? Math.PI / 2
            : -0.13
        : THREE.MathUtils.damp(
            turn.current.rotation.y,
            view === 'back' ? Math.PI : view === 'side' ? Math.PI / 2 : -0.13,
            8,
            delta,
          );
    if (r.torso) {
      r.torso.position.y = 1.87 + pose.torsoY;
      r.torso.rotation.x = pose.torsoX;
    }
    if (r.head) {
      r.head.rotation.x = pose.headX;
      r.head.rotation.y = pose.headY;
    }
    for (const side of ['left', 'right']) {
      const suffix = side === 'left' ? 'Left' : 'Right';
      r['arm-' + side]?.rotation.set(...pose['arm' + suffix]);
      r['forearm-' + side]?.rotation.set(...pose['forearm' + suffix]);
    }
    if (r.root) r.root.position.y = pose.rootY;
    if (r.food) {
      r.food.visible = pose.food;
      r.food.scale.setScalar(pose.foodScale);
    }
    if (aura.current) {
      aura.current.visible = pose.aura > 0.05;
      aura.current.scale.setScalar(1 + pose.aura * 0.07);
      aura.current.children.forEach((x, i) => {
        x.material.opacity = pose.aura * (i === 0 ? 0.08 : 0.35);
      });
    }
  });
  const renderNode = (node) => (
    <group
      key={node.id}
      ref={(ref) => {
        if (ref) refs.current[node.id] = ref;
      }}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      visible={node.id !== 'food'}
    >
      {recipe.meshes
        .filter((m) => m.parent === node.id)
        .map((m) => (
          <CharacterMesh key={m.id} mesh={m} highlight={highlight} />
        ))}
      {recipe.nodes.filter((n) => n.parent === node.id).map(renderNode)}
    </group>
  );
  return (
    <group ref={turn}>
      {recipe.nodes.filter((n) => !n.parent).map(renderNode)}
      <group ref={aura} visible={false} position={[0, 1.85, 0]}>
        <mesh scale={[0.92, 1.9, 0.6]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshBasicMaterial
            color={profile.accentColor || '#d6ed86'}
            transparent
            opacity={0.08}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.74, 0]}>
          <torusGeometry args={[0.82, 0.015, 8, 72]} />
          <meshBasicMaterial
            color={profile.accentColor || '#d6ed86'}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
class CanvasBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="avatar-fallback">
        <span>3D preview unavailable</span>
        <p>Your logs still work. Enable WebGL to see your character.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Avatar({
  profile,
  progress,
  view = 'front',
  highlight = [],
  small = false,
  emote = null,
}) {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <CanvasBoundary>
      <Canvas
        frameloop={reducedMotion ? 'demand' : 'always'}
        shadows
        dpr={[1, 1.25]}
        camera={{ position: [0, 2.0, 7.1], fov: 37 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'none' }}
        aria-label="Interactive anime character. Drag to rotate."
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[-3, 6, 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.001}
          shadow-normalBias={0.035}
        />
        <directionalLight position={[4, 3, -3]} intensity={0.6} color="#d0e7b8" />
        <Suspense fallback={null}>
          <Character
            profile={profile}
            progress={progress}
            view={view}
            highlight={highlight}
            emote={emote}
            reducedMotion={reducedMotion}
          />
          <ContactShadows
            position={[0, 0.012, 0]}
            opacity={0.35}
            scale={5}
            blur={2.5}
            far={4}
            resolution={256}
            frames={1}
          />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.88, 0.887, 90]} />
          <meshBasicMaterial color="#64704a" transparent opacity={0.5} />
        </mesh>
        <OrbitControls
          makeDefault
          target={[0, 2.02, 0]}
          enablePan={false}
          enableZoom={!small}
          minDistance={4.5}
          maxDistance={8}
          minPolarAngle={Math.PI * 0.37}
          maxPolarAngle={Math.PI * 0.59}
        />
      </Canvas>
    </CanvasBoundary>
  );
}
