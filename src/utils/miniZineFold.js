import * as THREE from 'three';

export const MINI_ZINE_STACKS = [
  { index: 0, x: -1.5, topPage: 5, bottomPage: 6, bookletDepth: -1.5 },
  { index: 1, x: -0.5, topPage: 4, bottomPage: 7, bookletDepth: -0.5 },
  { index: 2, x: 0.5, topPage: 3, bottomPage: 8, bookletDepth: 0.5 },
  { index: 3, x: 1.5, topPage: 2, bottomPage: 1, bookletDepth: 1.5 }
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
const TMP_VEC_B = new THREE.Vector3();

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - (2 * t));
}

function poseToQuaternion(rotation) {
  TMP_EULER.set(rotation.x, rotation.y, rotation.z, 'XYZ');
  return TMP_QUAT_A.setFromEuler(TMP_EULER).clone();
}

function getRotatedHorizontalOffset(angle, offsetX) {
  return TMP_VEC_B.set(offsetX, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).clone();
}

function computeStackOrigins(stackAngles, w, stackDepthStep, bookletClose) {
  const origins = [
    { x: MINI_ZINE_STACKS[0].x * w, z: 0 }
  ];

  for (let index = 1; index < MINI_ZINE_STACKS.length; index += 1) {
    const prevOrigin = origins[index - 1];
    const prevRight = getRotatedHorizontalOffset(stackAngles[index - 1], w / 2);
    const nextLeft = getRotatedHorizontalOffset(stackAngles[index], -w / 2);

    origins.push({
      x: prevOrigin.x + prevRight.x - nextLeft.x,
      z: prevOrigin.z + prevRight.z - nextLeft.z
    });
  }

  const bounds = origins.reduce((acc, origin) => ({
    minX: Math.min(acc.minX, origin.x),
    maxX: Math.max(acc.maxX, origin.x),
    minZ: Math.min(acc.minZ, origin.z),
    maxZ: Math.max(acc.maxZ, origin.z)
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  });

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return origins.map((origin, index) => ({
    x: origin.x - centerX,
    z: (origin.z - centerZ) + (MINI_ZINE_STACKS[index].bookletDepth * stackDepthStep * bookletClose)
  }));
}

function buildPageState(args) {
  const pageId = args.pageId;
  const stackIndex = args.stackIndex;
  const stackPose = args.stackPose;
  const localCenter = args.localCenter;
  const localRotationX = args.localRotationX;
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
  const w = dimensions.w;
  const h = dimensions.h;
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

function computeBounds(pageStates, dimensions) {
  const w = dimensions.w;
  const h = dimensions.h;
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
  const diamondOpen = smoothstep(clamp01(progress - 1));
  const bookletClose = smoothstep(clamp01(progress - 2));
  const topFoldAngle = -Math.PI * horizontalFold;
  const stackAngles = [
    -(Math.PI / 2) * bookletClose,
    -(Math.PI / 2) * diamondOpen,
    (Math.PI / 2) * diamondOpen,
    (Math.PI / 2) * bookletClose
  ];
  const stackOrigins = computeStackOrigins(stackAngles, w, stackDepthStep, bookletClose);

  const stackStates = MINI_ZINE_STACKS.map((stack, index) => ({
    ...stack,
    pose: {
      position: {
        x: stackOrigins[index].x,
        y: 0,
        z: stackOrigins[index].z
      },
      rotation: {
        x: 0,
        y: stackAngles[index],
        z: 0
      }
    }
  }));

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
      diamondOpen,
      bookletClose
    },
    topFoldAngle,
    stacks: stackStates,
    pages,
    seamGaps,
    bounds: computeBounds(pages, { w, h })
  };
}
