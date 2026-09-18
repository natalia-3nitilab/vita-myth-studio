/**
 * Mixamo FBX motion -> VRM humanoid clip.
 *
 * Mixamo animates its own skeleton in its own rest pose. A VRM has a different rest pose,
 * a different bone naming scheme and (for VRM 0.x) faces the other way down -Z. So the
 * keyframes cannot be renamed onto the VRM and played; every rotation has to be rebased
 * out of Mixamo's rest frame and into the VRM's, and the hip translation has to be scaled
 * by the height ratio or a short character skates and a tall one sinks through the floor.
 *
 * This is three-vrm's documented conversion, kept here as a file we own so the scene has
 * no network dependency at render time.
 */
import * as THREE from 'three';

// three's FBXLoader strips the colon: the FBX bone "mixamorig:Hips" arrives as "mixamorigHips".
const RIG_MAP = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',

  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
  mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',

  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal',
  mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',

  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

/**
 * @param {THREE.Group} asset  the FBXLoader result for one Mixamo download
 * @param {VRM} vrm
 * @param {string} name        clip name to give the result
 * @returns {THREE.AnimationClip}
 */
export function mixamoToVRMClip(asset, vrm, name = 'mixamo', { inPlace = true } = {}) {
  const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') ?? asset.animations[0];
  if (!clip) throw new Error('no animation in FBX');

  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();

  // Height ratio. Mixamo's hips sit at roughly 100 units; a VRM's at ~0.9 metres.
  const hipsNode = asset.getObjectByName('mixamorigHips');
  if (!hipsNode) throw new Error('FBX has no mixamorigHips — is this a Mixamo export?');
  const motionHipsHeight = hipsNode.position.y;
  const vrmHipsY = vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(_v).y;
  const vrmRootY = vrm.scene.getWorldPosition(_v).y;
  const hipsPositionScale = Math.abs(vrmHipsY - vrmRootY) / motionHipsHeight;

  // VRM 0.x models face +Z in their own space but are rendered rotated 180°, so X and Z
  // have to be negated. VRM 1.0 does not. Getting this wrong mirrors the whole animation,
  // which looks almost right and is therefore easy to ship by accident.
  const isVRM0 = vrm.meta?.metaVersion === '0';

  for (const track of clip.tracks) {
    const [mixamoRigName, propertyName] = track.name.split('.');
    const vrmBoneName = RIG_MAP[mixamoRigName];
    const vrmNodeName = vrm.humanoid.getNormalizedBoneNode(vrmBoneName)?.name;
    const mixamoRigNode = asset.getObjectByName(mixamoRigName);
    if (vrmNodeName == null || mixamoRigNode == null) continue;

    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
    mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const values = Float32Array.from(track.values);
      for (let i = 0; i < values.length; i += 4) {
        _q.fromArray(values, i);
        // Rebase: out of Mixamo's rest frame, into the parent's world frame.
        _q.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
        _q.toArray(values, i);
        if (isVRM0) { values[i] = -values[i]; values[i + 2] = -values[i + 2]; }
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, values));
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      const values = Float32Array.from(track.values);
      for (let i = 0; i < values.length; i++) {
        const axis = i % 3;               // 0=x 1=y 2=z
        const flip = isVRM0 && axis !== 1 ? -1 : 1;
        values[i] = values[i] * flip * hipsPositionScale;
      }
      // Root motion has to go for a fixed-camera shot list. "Talking Phone Pacing" walks
      // several metres, so the character simply leaves frame and the shot renders an empty
      // room — which is exactly what it did. Y is kept: it carries the sit and the bob.
      if (inPlace) {
        for (let i = 0; i < values.length; i += 3) {
          values[i] = values[0];
          values[i + 2] = values[2];
        }
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, values));
    }
  }

  if (!tracks.length) throw new Error('retarget produced no tracks — bone names did not match');
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

export { RIG_MAP };
