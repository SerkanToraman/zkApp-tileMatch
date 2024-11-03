import { useRef, useState, useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TileProps {
  id: string;
  url: string;
  position: [number, number, number];
  offset: number;
  isFlippedExternally: boolean;
  canFlip: boolean;
  isMatched: boolean; // Prop to determine if tile is matched
  onTileFlip: (id: string, url: string) => void;
  onTileDisappear: (id: string) => void; // Callback for when the tile disappears
}

export function Tile({
  id,
  url,
  position,
  offset,
  isFlippedExternally,
  canFlip,
  isMatched,
  onTileFlip,
  onTileDisappear,
}: TileProps) {
  const gltf = useLoader(GLTFLoader, url);
  const meshRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [scale, setScale] = useState(15); // Initial scale for the tile

  // Flip the tile back when `isFlippedExternally` changes
  useEffect(() => {
    if (!isFlippedExternally) {
      setIsFlipped(false);
    }
  }, [isFlippedExternally]);

  useEffect(() => {
    if (gltf && meshRef.current) {
      const clonedScene = gltf.scene.clone();
      meshRef.current.add(clonedScene);

      const box = new THREE.Box3().setFromObject(clonedScene);
      const center = box.getCenter(new THREE.Vector3());
      clonedScene.position.set(-center.x, -center.y, -center.z);
      clonedScene.rotation.x = -Math.PI / 2;
      clonedScene.rotation.y = Math.PI / 2;
      meshRef.current.position.set(0, 0, -0.5); // Adjust Z position
    } else {
      console.log("No model loaded");
    }
  }, [gltf]);

  // Animate scaling down when the tile is matched and disappear when done
  useEffect(() => {
    if (isMatched) {
      let frame: number;
      const animateScaleDown = () => {
        setScale((prev) => Math.max(prev - 0.02, 0)); // Scale down to 0
        if (scale > 0) {
          frame = requestAnimationFrame(animateScaleDown); // Keep animating until scale is 0
        } else {
          onTileDisappear(id); // Once scaled to 0, call disappear callback
        }
      };
      animateScaleDown();
      return () => cancelAnimationFrame(frame); // Clean up the animation frame
    } else {
      // Reset the scale to the initial value when the tile is not matched
      setScale(15);
    }
  }, [isMatched, scale, id, onTileDisappear]);

  // Use `useFrame` to handle flipping logic
  useFrame(() => {
    if (pivotRef.current) {
      const targetRotationY = isFlipped ? Math.PI : 0; // Flip 180 degrees
      pivotRef.current.rotation.y = THREE.MathUtils.lerp(
        pivotRef.current.rotation.y,
        targetRotationY,
        0.1 // Speed of flipping
      );

      // Apply scaling to the mesh
      if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale); // Apply the shrinking scale
      }
    }
  });

  // Handle tile flip on click
  const handleFlip = () => {
    if (canFlip && !isFlipped) {
      setIsFlipped(true); // Flip the tile
      onTileFlip(id, url); // Notify the parent that this tile has flipped
    }
  };

  return (
    <group ref={pivotRef} position={position} onPointerDown={handleFlip}>
      <group ref={meshRef} position={[0, 0, offset]} />
    </group>
  );
}
