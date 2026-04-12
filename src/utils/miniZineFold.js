import * as THREE from 'three';

export const MINI_ZINE_STACKS = [
  { index: 0, x: -1.5, topPage: 5, bottomPage: 6, bookletSide: -1, bookletDepth: -1.5 },
  { index: 1, x: -0.5, topPage: 4, bottomPage: 7, bookletSide: -1, bookletDepth: -0.5 },
  { index: 2, x: 0.5, topPage: 3, bottomPage: 8, bookletSide: 1, bookletDepth: 0.5 },
  { index: 3, x: 1.5, topPage: 2, bottomPage: 1, bookletSide: 1, bookletDepth: 1.5 }
];

const CONNECTIONS = [
  { from: 5, to: 4, orientation: 'horizontal' },
  { from: 4, to: 3, orientation: 'horizontal' },
  { from: 3, to: 2, orientation: 'horizontal' },
  { from: 6, to: 7, orientation: 'horizontal' },
  { from: 7, to: 8, orientation: 'horizontal' },
  { from: 8, to: 1, orientation: 'horizontal' },
  { from: 5, to: 6, orientation: 'vertical' },
  { from: 2, to: 1, orientation: 'vertical' }
];

const TMP_VEC_A = new THREE.Vector3();
const TMP_QUAT_A = new THREE.Quaternion();
const TMP_QUAT_B = new THREE.Quaternion();
const TMP_EULER = new THREE.Euler(0, 0, 0, 'XYZ');

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - (2 * t));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function interpolatePose(fromPose, toPose, t) {
  return {
    position: {
      x: lerp(fromPose.position.x, toPose.position.x, t),
      y: lerp(fromPose.position.y, toPose.position.y, t),
      z: lerp(fromPose.position.z, toPose.position.z, t)
    },
    rotation: {
      x: lerp(fromPose.rotation.x, toPose.rotation.x, t),
      y: lerp(fromPose.rotation.y, toPose.rotation.y, t),
      z: lerp(fromPose.rotation.z, toPose.rotation.z, t)
    }
  };
}

function poseToQuaternion(rotation) {
  TMP_EULER.set(rotation.x, rotation.y, rotation.z, 'XYZ');
  return TMP_QUAT_A.setFromEuler(TMP_EULER).clone();
}

function buildPageState({
  pageId,
  stackIndex,
  stackPose,
  localCenter,
  localRotationX
}) {
  const stackQuaternion = poseToQuaternion(stackPose.rotation);
  const localQuaternion = TMP_QUAT_B.setFromAxisAngle(new THREE.Vector3(1, 0, 0), localRotationX).clone();
  const worldQuaternion = stackQuaternion.clone().multiply(localQuaternion);
  const worldCenter = TMP_VEC_A.copy(localCenter).applyQuaternion(worldQuaternion).add(new THREE.Vector3(
    stackPose.position.x,
    stackPose.position.y,
    stackPose.position.z
  ));
  const worldEuler = new THREE.Euler().setFromQuaternion(worldQuaternion, 'XYZ');

  return {
    id: pageId,
    stackIndex,
    position: {
      x: worldCenter.x,
      y: worldCenter.y,
      z: worldCenter.z
    },
    rotation: {
      x: worldEuler.x,
      y: worldEuler.y,
      z: worldEuler.z
    },
    quaternion: {
      x: worldQuaternion.x,
      y: worldQuaternion.y,
      z: worldQuaternion.z,
      w: worldQuaternion.w
    }
  };
}

function getEdgePoint(pageState, edge, dimensions) {
  const { w, h } = dimensions;
  const localPoint = new THREE.Vector3(
    edge === 'left' ? -w / 2 : edge === 'right' ? w / 2 : 0,
    edge === 'top' ? h / 2 : edge === 'bottom' ? -h / 2 : 0,
    0
  );
  const worldQuaternion = new THREE.Quaternion(
    pageState.quaternion.x,
    pageState.quaternion.y,
    pageState.quaternion.z,
    pageState.quaternion.w
  );

  return localPoint.applyQuaternion(worldQuaternion).add(new THREE.Vector3(
    pageState.position.x,
    pageState.position.y,
    pageState.position.z
  ));
}

function computeBounds(pageStates, { w, h }) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  Object.values(pageStates).forEach((pageState) => {
    const corners = [
      new THREE.Vector3(-w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, h / 2, 0),
      new THREE.Vector3(-w / 2, h / 2, 0)
    ];
    const quaternion = new THREE.Quaternion(
      pageState.quaternion.x,
      pageState.quaternion.y,
      pageState.quaternion.z,
      pageState.quaternion.w
    );

    corners.forEach((corner) => {
      corner.applyQuaternion(quaternion).add(new THREE.Vector3(
        pageState.position.x,
        pageState.position.y,
        pageState.position.z
      ));

      min.x = Math.min(min.x, corner.x);
      min.y = Math.min(min.y, corner.y);
      min.z = Math.min(min.z, corner.z);
      max.x = Math.max(max.x, corner.x);
      max.y = Math.max(max.y, corner.y);
      max.z = Math.max(max.z, corner.z);
    });
  });

  return { min, max };
}

export function computeMiniZineFoldState(progress, dimensions = {}) {
  const w = dimensions.w ?? 1;
  const h = dimensions.h ?? 1.414;
  const stackDepthStep = dimensions.stackDepthStep ?? 0.008;

  const horizontalFold = smoothstep(clamp01(progress));
  const crossCollapse = smoothstep(clamp01(progress - 1));
  const bookletClose = smoothstep(clamp01(progress - 2));
  const topFoldAngle = -Math.PI * horizontalFold;
  const crossYOffset = w * 0.5;

  const stackStates = MINI_ZINE_STACKS.map((stack) => {
    const stripPose = {
      position: { x: stack.x * w, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    };

    const crossPose = (() => {
      if (stack.index === 0) {
        return {
          position: { x: -w, y: 0, z: -stackDepthStep },
          rotation: { x: 0, y: 0, z: 0 }
        };
      }
      if (stack.index === 1) {
        return {
          position: { x: -w / 2, y: crossYOffset, z: -stackDepthStep * 0.5 },
          rotation: { x: 0, y: 0, z: Math.PI / 2 }
        };
      }
      if (stack.index === 2) {
        return {
          position: { x: w / 2, y: -crossYOffset, z: stackDepthStep * 0.5 },
          rotation: { x: 0, y: 0, z: -Math.PI / 2 }
        };
      }

      return {
        position: { x: w, y: 0, z: stackDepthStep },
        rotation: { x: 0, y: 0, z: 0 }
      };
    })();

    const bookletPose = {
      position: {
        x: stack.bookletSide * (stackDepthStep * 0.35),
        y: 0,
        z: stack.bookletDepth * stackDepthStep
      },
      rotation: {
        x: 0,
        y: stack.bookletSide * (Math.PI / 2),
        z: 0
      }
    };

    let pose = stripPose;
    if (progress > 1 && progress <= 2) {
      pose = interpolatePose(stripPose, crossPose, crossCollapse);
    } else if (progress > 2) {
      pose = interpolatePose(crossPose, bookletPose, bookletClose);
    }

    return {
      ...stack,
      pose
    };
  });

  const pages = {};
  stackStates.forEach((stackState) => {
    pages[stackState.bottomPage] = buildPageState({
      pageId: stackState.bottomPage,
      stackIndex: stackState.index,
      stackPose: stackState.pose,
      localCenter: new THREE.Vector3(0, -h / 2, 0),
      localRotationX: 0
    });
    pages[stackState.topPage] = buildPageState({
      pageId: stackState.topPage,
      stackIndex: stackState.index,
      stackPose: stackState.pose,
      localCenter: new THREE.Vector3(0, h / 2, 0),
      localRotationX: topFoldAngle
    });
  });

  const seamGaps = CONNECTIONS.map((connection) => {
    const pageA = pages[connection.from];
    const pageB = pages[connection.to];
    const start = connection.orientation === 'horizontal'
      ? getEdgePoint(pageA, 'right', { w, h })
      : getEdgePoint(pageA, 'bottom', { w, h });
    const end = connection.orientation === 'horizontal'
      ? getEdgePoint(pageB, 'left', { w, h })
      : getEdgePoint(pageB, 'top', { w, h });

    return {
      ...connection,
      gap: start.distanceTo(end),
      start: { x: start.x, y: start.y, z: start.z },
      end: { x: end.x, y: end.y, z: end.z }
    };
  });

  return {
    progress,
    stages: {
      horizontalFold,
      crossCollapse,
      bookletClose
    },
    topFoldAngle,
    stacks: stackStates,
    pages,
    seamGaps,
    bounds: computeBounds(pages, { w, h })
  };
}
