import { normalizeProfile } from './config.js';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const mix = (a, b, t) => a + (b - a) * t;
const cat = (a, b, c, d, t) =>
  0.5 *
  (2 * b +
    (-a + c) * t +
    (2 * a - 5 * b + 4 * c - d) * t * t +
    (-a + 3 * b - 3 * c + d) * t * t * t);
const gauss = (v, c, s) => Math.exp(-(((v - c) / s) ** 2));
const normalize = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((n) => n / l);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function normalsFor(vertices, triangles) {
  const normals = Array(vertices.length).fill(0);
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * 3,
      b = triangles[i + 1] * 3,
      c = triangles[i + 2] * 3;
    const n = cross(
      [
        vertices[b] - vertices[a],
        vertices[b + 1] - vertices[a + 1],
        vertices[b + 2] - vertices[a + 2],
      ],
      [
        vertices[c] - vertices[a],
        vertices[c + 1] - vertices[a + 1],
        vertices[c + 2] - vertices[a + 2],
      ],
    );
    for (const j of [a, b, c]) for (let k = 0; k < 3; k++) normals[j + k] += n[k];
  }
  for (let i = 0; i < normals.length; i += 3) {
    const n = normalize(normals.slice(i, i + 3));
    normals.splice(i, 3, ...n);
  }
  return normals;
}
function surface(rings, segments = 32, detail = 4, deform) {
  const vertices = [],
    triangles = [];
  const rows = (rings.length - 1) * detail;
  for (let i = 0; i <= rows; i++) {
    const f = i / detail,
      j = Math.min(Math.floor(f), rings.length - 2),
      t = f - j;
    const r = Array.from({ length: 4 }, (_, k) =>
      cat(
        rings[Math.max(0, j - 1)][k] || 0,
        rings[j][k] || 0,
        rings[j + 1][k] || 0,
        rings[Math.min(rings.length - 1, j + 2)][k] || 0,
        t,
      ),
    );
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * TAU;
      let v = [
        Math.cos(a) * Math.max(0.001, r[1]),
        r[0],
        Math.sin(a) * Math.max(0.001, r[2]) + r[3],
      ];
      if (deform) v = deform(v, a);
      vertices.push(...v.map((x) => Math.round(x * 100000) / 100000));
      if (i < rows && s < segments) {
        const n = i * (segments + 1) + s;
        triangles.push(n, n + segments + 1, n + 1, n + 1, n + segments + 1, n + segments + 2);
      }
    }
  }
  if (rings.at(-1)[0] < rings[0][0])
    for (let i = 0; i < triangles.length; i += 3)
      [triangles[i + 1], triangles[i + 2]] = [triangles[i + 2], triangles[i + 1]];
  return { vertices, triangles, normals: normalsFor(vertices, triangles) };
}
function ellipsoid(scale, segments = 24) {
  const r = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    r.push([-Math.cos(a) * scale[1], Math.sin(a) * scale[0], Math.sin(a) * scale[2]]);
  }
  return surface(r, segments, 1);
}
function ribbon(points, width = 0.006) {
  const v = [],
    indices = [];
  points.forEach((p, i) => {
    v.push(p[0], p[1] - width, p[2], p[0], p[1] + width, p[2]);
    if (i < points.length - 1) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  });
  return { vertices: v, triangles: indices, normals: v.map((_, i) => (i % 3 === 2 ? 1 : 0)) };
}
function blade(start, mid, end, width = 0.09, depth = 0.06) {
  const vertices = [],
    triangles = [],
    steps = 8,
    sides = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      r = Math.sin((0.15 + t * 0.85) * Math.PI) * (0.95 - t * 0.3);
    const p = start.map((v, k) => (1 - t) ** 2 * v + 2 * (1 - t) * t * mid[k] + t * t * end[k]);
    const tangent = normalize(
      start.map((v, k) => 2 * (1 - t) * (mid[k] - v) + 2 * t * (end[k] - mid[k])),
    );
    const normal = normalize(cross(tangent, [0, 0, 1]));
    const binormal = normalize(cross(tangent, normal));
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * TAU;
      vertices.push(
        ...p.map(
          (v, k) => v + normal[k] * Math.cos(a) * width * r + binormal[k] * Math.sin(a) * depth * r,
        ),
      );
      if (i < steps && j < sides) {
        const n = i * (sides + 1) + j;
        triangles.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2);
      }
    }
  }
  return { vertices, triangles, normals: normalsFor(vertices, triangles) };
}
export function buildCharacter(input, progress) {
  const p = normalizeProfile(input),
    nodes = [],
    meshes = [];
  const m = clamp(Number(p.muscle) || 0.57, 0.1, 1.3),
    fat = clamp((progress?.bodyFat ?? p.bodyFat) / 100, 0.05, 0.55),
    wide = p.frame === 'curved';
  const gain = (name) => (progress?.muscle?.[name] || 0) * 3;
  const chest = 0.36 + (m + gain('Chest')) * 0.12,
    waist = 0.235 + fat * 0.52,
    hip = (wide ? 0.37 : 0.3) + fat * 0.2;
  const skin = p.skin === '#b6afa0' ? '#d3a17c' : p.skin,
    outline = '#24232c',
    contour = '#8d5b4d';
  const node = (
    id,
    parent = 'root',
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  ) => nodes.push({ id, parent, position, rotation, scale });
  const add = (
    id,
    parent,
    geo,
    color,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    group = '',
    unlit = false,
  ) => {
    meshes.push({ id, parent, ...geo, color, position, rotation, group, unlit });
  };
  const ball = (id, parent, position, scale, color, group = '') =>
    add(id, parent, ellipsoid(scale), color, position, [0, 0, 0], group);
  const ring = (
    id,
    parent,
    rings,
    color,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    group = '',
    deform,
  ) => add(id, parent, surface(rings, 36, 4, deform), color, position, rotation, group);
  const stroke = (id, parent, points, color = contour, width = 0.005) =>
    add(id, parent, ribbon(points, width), color, [0, 0, 0], [0, 0, 0], '', true);
  node('root', '', [0, 0, 0], [0, 0, 0], [1, clamp(p.height / 178, 0.8, 1.2), 1]);
  node('torso', 'root', [0, 1.87, 0]);
  const chestY = 0.82;
  ring(
    'body',
    'torso',
    [
      [0, hip, 0.185],
      [0.12, hip, 0.195],
      [0.25, waist, 0.16 + fat * 0.23],
      [0.45, waist + 0.014, 0.185 + fat * 0.18],
      [0.64, chest * 0.94, 0.225],
      [0.84, chest, 0.245],
      [1.04, chest * 0.97, 0.215],
      [1.14, 0.26, 0.147],
      [1.22, 0.12, 0.105],
    ],
    skin,
    [0, 0, 0],
    [0, 0, 0],
    'Chest',
    ([x, y, z], a) => {
      if (Math.sin(a) > 0) {
        const pec = gauss(Math.abs(x), 0.205, 0.15) * gauss(y, 0.91, 0.115);
        const abs = [0.26, 0.4, 0.54, 0.68].reduce(
          (sum, c) => sum + gauss(Math.abs(x), 0.075, 0.072) * gauss(y, c, 0.048),
          0,
        );
        z += Math.sin(a) ** 3 * (pec * (0.04 + m * 0.035) + abs * Math.max(0, 0.035 - fat * 0.105));
      }
      if (y > 0.5 && y < 1.05) {
        x *= 1 + gain('Back') * 0.11;
        if (z < 0) z -= gain('Back') * 0.035;
      }
      if (z > 0 && y > 0.23 && y < 0.7) z += gain('Core') * 0.016;
      return [x, y, z];
    },
  );
  // Partition the continuous torso so training highlights identify the actual region.
  const torsoMesh = meshes.pop();
  const regions = { Chest: [], Back: [], Core: [] };
  for (let i = 0; i < torsoMesh.triangles.length; i += 3) {
    const tri = torsoMesh.triangles.slice(i, i + 3);
    const y = tri.reduce((sum, index) => sum + torsoMesh.vertices[index * 3 + 1], 0) / 3;
    const z = tri.reduce((sum, index) => sum + torsoMesh.vertices[index * 3 + 2], 0) / 3;
    regions[z < 0 ? 'Back' : y < 0.73 ? 'Core' : 'Chest'].push(...tri);
  }
  for (const [group, triangles] of Object.entries(regions))
    meshes.push({ ...torsoMesh, id: 'body-' + group.toLowerCase(), group, triangles });
  ring(
    'neck',
    'torso',
    [
      [1.08, 0.132, 0.105],
      [1.22, 0.115, 0.105],
      [1.32, 0.12, 0.11],
    ],
    skin,
  );
  node('head', 'torso', [0, 1.39, 0], [0, 0, 0], [1.09, 1.09, 1.09]);
  ring(
    'face',
    'head',
    [
      [-0.17, 0.025, 0.035, 0.015],
      [-0.14, 0.105, 0.094, 0.008],
      [-0.045, 0.17, 0.145],
      [0.06, 0.2, 0.17],
      [0.18, 0.198, 0.17],
      [0.3, 0.166, 0.146],
      [0.355, 0.082, 0.081],
      [0.368, 0.001, 0.001],
    ],
    skin,
  );
  ball('nose', 'head', [0, 0.012, 0.157], [0.023, 0.041, 0.04], skin);
  stroke(
    'mouth',
    'head',
    [
      [-0.052, -0.086, 0.119],
      [-0.02, -0.091, 0.143],
      [0.023, -0.091, 0.141],
      [0.053, -0.084, 0.117],
    ],
    '#775147',
    0.0035,
  );
  stroke(
    'nose-line',
    'head',
    [
      [0.009, -0.02, 0.181],
      [0.026, -0.025, 0.176],
    ],
    '#94624e',
    0.0025,
  );
  for (const s of [-1, 1]) {
    const side = s === 1 ? 'right' : 'left';
    ball('ear-' + side, 'head', [s * 0.183, 0.03, -0.005], [0.028, 0.065, 0.027], skin);
    ball('ear-inner-' + side, 'head', [s * 0.201, 0.03, 0.012], [0.009, 0.033, 0.009], contour);
    const shape = {
      vertices: [
        s * 0.026,
        0.073,
        0.157,
        s * 0.154,
        0.101,
        0.127,
        s * 0.148,
        0.044,
        0.139,
        s * 0.047,
        0.035,
        0.16,
      ],
      triangles: s === 1 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3],
    };
    shape.normals = shape.vertices.map((_, i) => (i % 3 === 2 ? 1 : 0));
    add('eye-white-' + side, 'head', shape, '#f8f2e9', [0, 0, 0], [0, 0, 0], '', true);
    ball('iris-' + side, 'head', [s * 0.087, 0.066, 0.158], [0.022, 0.029, 0.006], p.eyeColor);
    ball('pupil-' + side, 'head', [s * 0.085, 0.066, 0.164], [0.008, 0.019, 0.003], outline);
    ball('eye-glint-' + side, 'head', [s * 0.078, 0.078, 0.167], [0.005, 0.006, 0.002], '#ffffff');
    stroke(
      'eye-top-' + side,
      'head',
      [
        [s * 0.027, 0.081, 0.16],
        [s * 0.087, 0.096, 0.152],
        [s * 0.151, 0.107, 0.127],
      ],
      outline,
      0.0055,
    );
    stroke(
      'eyebrow-' + side,
      'head',
      [
        [s * 0.026, 0.126, 0.157],
        [s * 0.086, 0.15, 0.159],
        [s * 0.151, 0.15, 0.13],
      ],
      p.hairColor,
      0.012,
    );
    const shoulderX = 0.44 + (m + gain('Shoulders')) * 0.075;
    node('arm-' + side, 'torso', [s * shoulderX, 1.03, 0], [0, 0, s * 0.15]);
    ball(
      'deltoid-' + side,
      'arm-' + side,
      [0, -0.055, 0],
      [0.137 + (m + gain('Shoulders')) * 0.052, 0.174, 0.145 + (m + gain('Shoulders')) * 0.018],
      skin,
      'Shoulders',
    );
    ring(
      'upperarm-' + side,
      'arm-' + side,
      [
        [0, 0.095, 0.101],
        [-0.12, 0.14 + (m + gain('Arms')) * 0.03, 0.14],
        [-0.32, 0.126 + m * 0.02, 0.128],
        [-0.48, 0.077, 0.079],
        [-0.51, 0.072, 0.073],
      ],
      skin,
      [0, 0, 0],
      [0, 0, 0],
      'Arms',
    );
    node('forearm-' + side, 'arm-' + side, [0, -0.49, 0], [-0.07, 0, -s * 0.02]);
    ring(
      'forearm-skin-' + side,
      'forearm-' + side,
      [
        [0.03, 0.075, 0.076],
        [-0.08, 0.09, 0.09],
        [-0.24, 0.077, 0.079],
        [-0.43, 0.046, 0.05],
        [-0.49, 0.044, 0.047],
      ],
      skin,
      [0, 0, 0],
      [0, 0, 0],
      'Arms',
    );
    node('hand-' + side, 'forearm-' + side, [0, -0.55, 0.003]);
    ball('palm-' + side, 'hand-' + side, [0, 0, 0], [0.06, 0.095, 0.037], skin);
    for (let i = 0; i < 4; i++)
      ball(
        'finger-' + side + i,
        'hand-' + side,
        [s * (-0.039 + i * 0.024), -0.063, 0.003],
        [0.012, 0.055 - (i === 0 || i === 3 ? 0.012 : 0), 0.02],
        skin,
      );
    ball('thumb-' + side, 'hand-' + side, [-s * 0.057, 0.008, 0.02], [0.024, 0.053, 0.025], skin);
    node('leg-' + side, 'root', [s * (wide ? 0.205 : 0.183), 1.95, 0], [0, 0, s * 0.016]);
    ring(
      'thigh-' + side,
      'leg-' + side,
      [
        [0.025, 0.155, 0.168],
        [-0.11, 0.181 + (m + gain('Legs')) * 0.033, 0.19],
        [-0.34, 0.171 + m * 0.03, 0.181],
        [-0.63, 0.123, 0.13],
        [-0.78, 0.083, 0.095],
        [-0.82, 0.08, 0.085],
      ],
      skin,
      [0, 0, 0],
      [0, 0, 0],
      'Legs',
    );
    node('shin-' + side, 'leg-' + side, [0, -0.8, 0]);
    ring(
      'calf-' + side,
      'shin-' + side,
      [
        [0.035, 0.08, 0.085],
        [-0.1, 0.105, 0.113, -0.012],
        [-0.25, 0.112 + m * 0.012, 0.113, -0.018],
        [-0.48, 0.073, 0.078, -0.013],
        [-0.72, 0.047, 0.055],
        [-0.85, 0.048, 0.055],
      ],
      skin,
      [0, 0, 0],
      [0, 0, 0],
      'Legs',
    );
    ball('foot-' + side, 'shin-' + side, [0, -0.868, 0.08], [0.081, 0.074, 0.173], skin);
    if (fat < 0.27) {
      stroke(
        'pec-line-' + side,
        'torso',
        [
          [s * 0.035, 0.81, 0.247],
          [s * 0.15, 0.79, 0.273],
          [s * 0.265, 0.79, 0.245],
          [s * 0.355, 0.84, 0.178],
        ],
        contour,
        0.003,
      );
      stroke(
        'collar-' + side,
        'torso',
        [
          [s * 0.06, 1.15, 0.125],
          [s * 0.19, 1.11, 0.168],
          [s * 0.31, 1.12, 0.156],
        ],
        contour,
        0.003,
      );
      stroke(
        'oblique-' + side,
        'torso',
        [
          [s * (waist - 0.023), 0.32, 0.14],
          [s * 0.192, 0.16, 0.17],
          [s * 0.055, 0.06, 0.19],
        ],
        contour,
        0.003,
      );
    }
  }
  if (fat < 0.25) {
    stroke(
      'sternum',
      'torso',
      [
        [0, 0.84, 0.248],
        [0, 1.0, 0.244],
      ],
      contour,
      0.002,
    );
    for (let i = 0; i < 3; i++)
      stroke(
        'abs-' + i,
        'torso',
        [
          [-0.135, 0.3 + i * 0.14, 0.207],
          [0, 0.285 + i * 0.14, 0.229],
          [0.135, 0.3 + i * 0.14, 0.207],
        ],
        contour,
        0.002,
      );
  }
  // Smooth, non-sexual mannequin anatomy in the unclothed physique view.
  ball('pelvis', 'root', [0, 1.89, 0], [hip, 0.2, 0.183], skin);
  addHair(p, node, add, ball);
  addClothing(p, { node, add, ball, ring, stroke }, { m, fat, chest, waist, hip, wide });
  // The food prop lives with the right hand so both engines animate the same hierarchy.
  node('food', 'hand-right', [0, -0.015, 0.055]);
  ball('food-bun', 'food', [0, 0, 0], [0.085, 0.065, 0.064], '#dca754');
  ring(
    'food-filling',
    'food',
    [
      [-0.015, 0.08, 0.061],
      [0.009, 0.08, 0.061],
    ],
    '#6a8c4c',
  );
  return { version: 2, height: p.height, nodes, meshes };
}
function addHair(p, node, add, ball) {
  const h = p.hairStyle,
    c = p.hairColor;
  if (h === 'bald') return;
  const cap = surface(
    [
      [0.085, 0.19, 0.15, -0.012],
      [0.21, 0.215, 0.18, -0.012],
      [0.32, 0.18, 0.155, -0.005],
      [0.39, 0.07, 0.075],
      [0.395, 0.001, 0.001],
    ],
    32,
    3,
  );
  add('hair-cap', 'head', cap, c);
  const tuft = (id, a, b, d, w = 0.09, z = 0.06) =>
    add('hair-' + id, 'head', blade(a, b, d, w, z), c);
  if (h === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.056;
      tuft(
        'crown' + i,
        [x, 0.24, -0.035],
        [x * 1.5, 0.48 + 0.08 * Math.cos(i), -0.02],
        [x * 1.8 + (i < 3 ? -0.035 : 0.03), 0.52 + 0.15 * Math.cos((i - 3) * 0.43), -0.04],
        0.108,
        0.078,
      );
    }
    for (const s of [-1, 1]) {
      tuft(
        'side' + s,
        [s * 0.15, 0.2, -0.015],
        [s * 0.32, 0.31, -0.045],
        [s * 0.39, 0.39, -0.08],
        0.118,
        0.072,
      );
      tuft(
        'back' + s,
        [s * 0.14, 0.19, -0.12],
        [s * 0.28, 0.26, -0.22],
        [s * 0.3, 0.36, -0.31],
        0.122,
        0.072,
      );
      tuft(
        'bang' + s,
        [s * 0.09, 0.28, 0.122],
        [s * 0.16, 0.15, 0.18],
        [s * 0.095, 0.105, 0.177],
        0.063,
        0.035,
      );
    }
  } else if (h === 'swept') {
    for (let i = 0; i < 6; i++)
      tuft(
        i,
        [-0.14 + i * 0.038, 0.3, 0.05],
        [-0.03 + i * 0.043, 0.42, 0.16],
        [0.21 + i * 0.012, 0.15 + i * 0.035, 0.155],
        0.072,
        0.049,
      );
    tuft('side', [-0.14, 0.22, 0.02], [-0.22, 0.11, 0.06], [-0.17, -0.055, 0.085], 0.07, 0.04);
  } else if (h === 'crop') {
    for (let i = 0; i < 7; i++)
      tuft(
        i,
        [(i - 3) * 0.046, 0.28, 0.045],
        [(i - 3) * 0.058, 0.38, 0.09],
        [(i - 3) * 0.063, 0.39 + (i % 2) * 0.045, 0.05],
        0.056,
        0.047,
      );
    for (let i = 0; i < 4; i++)
      tuft(
        'fringe' + i,
        [-0.12 + i * 0.075, 0.21, 0.12],
        [-0.14 + i * 0.073, 0.16, 0.165],
        [-0.15 + i * 0.072, 0.12, 0.15],
        0.045,
        0.023,
      );
  } else if (h === 'long') {
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++)
        tuft(
          s + ':' + i,
          [s * (0.13 + i * 0.012), 0.23, -0.075 - i * 0.025],
          [s * (0.24 + i * 0.028), -0.13, -0.09 - i * 0.03],
          [s * (0.2 + i * 0.045), -0.53 + (i % 2) * 0.08, -0.025 - i * 0.055],
          0.078,
          0.053,
        );
    tuft('fringe', [-0.08, 0.29, 0.125], [0.04, 0.26, 0.2], [0.16, 0.105, 0.161], 0.11, 0.036);
  } else if (h === 'ponytail') {
    ball('hair-tie', 'head', [0, 0.21, -0.185], [0.088, 0.075, 0.053], p.accentColor);
    for (let i = 0; i < 5; i++)
      tuft(
        i,
        [(i - 2) * 0.03, 0.22, -0.185],
        [(i - 2) * 0.04, 0.09, -0.43],
        [(i - 2) * 0.047, -0.43, -0.37],
        0.075,
        0.073,
      );
    tuft('bang', [-0.1, 0.28, 0.12], [-0.2, 0.13, 0.17], [-0.16, -0.015, 0.145], 0.063, 0.038);
  }
}
function addClothing(p, b, { m, fat, chest, waist, hip, wide }) {
  const { ball, ring, stroke } = b,
    c = p.outfitColor,
    a = p.accentColor,
    h = p.outfit;
  if (h === 'physique') return;
  const pants = h === 'gi' || h === 'armor';
  for (const s of [-1, 1]) {
    const side = s === 1 ? 'right' : 'left';
    ring(
      'bottom-' + side,
      'leg-' + side,
      [
        [0.035, 0.19, 0.205],
        [-0.14, 0.213 + m * 0.015, 0.23],
        [-0.35, 0.21, 0.22],
        [-0.52, 0.2, 0.213],
        ...(pants
          ? [
              [-0.7, 0.146, 0.15],
              [-0.88, 0.121, 0.135],
              [-1.1, 0.13, 0.135],
              [-1.47, 0.096, 0.1],
              [-1.58, 0.065, 0.077],
            ]
          : []),
      ],
      c,
    );
    if (pants) {
      ball(
        'shoe-' + side,
        'shin-' + side,
        [0, -0.81, 0.07],
        [0.093, 0.15, 0.19],
        h === 'gi' ? '#303543' : c,
      );
      ring(
        'shoe-trim-' + side,
        'shin-' + side,
        [
          [-0.64, 0.071, 0.078],
          [-0.7, 0.075, 0.08],
        ],
        a,
      );
    }
    if (h === 'armor' || h === 'gi')
      ring(
        'wrist-wrap-' + side,
        'forearm-' + side,
        [
          [-0.31, 0.07, 0.076],
          [-0.47, 0.055, 0.06],
        ],
        a,
      );
  }
  ball('clothing-hip', 'root', [0, 1.915, 0], [hip + 0.024, 0.225, 0.245], c);
  ring(
    'waistband',
    'root',
    [
      [2.06, waist + 0.033, 0.246],
      [2.12, waist + 0.03, 0.244],
    ],
    a,
  );
  if (h === 'shorts') return;
  ring(
    'top',
    'torso',
    [
      [0.18, waist + 0.025, 0.21],
      [0.32, waist + 0.032, 0.206 + fat * 0.12],
      [0.6, chest * 0.94 + 0.017, 0.25],
      [0.85, chest + 0.018, 0.285],
      [1.025, chest * 0.96 + 0.01, 0.234],
      [1.13, 0.24, 0.155],
      [1.17, 0.135, 0.117],
    ],
    c,
  );
  if (h === 'gi') {
    // Contrasting wrap lapels and belt use actual geometry, not painted skin.
    stroke(
      'lapel-left',
      'torso',
      [
        [-0.135, 1.17, 0.121],
        [-0.18, 1.05, 0.235],
        [-0.1, 0.81, 0.297],
        [0.035, 0.58, 0.272],
        [0.18, 0.3, 0.233],
      ],
      a,
      0.032,
    );
    stroke(
      'lapel-right',
      'torso',
      [
        [0.135, 1.17, 0.121],
        [0.19, 1.04, 0.235],
        [0.1, 0.84, 0.295],
        [0.015, 0.65, 0.289],
      ],
      a,
      0.03,
    );
    stroke(
      'belt-tail',
      'torso',
      [
        [0.06, 0.25, 0.232],
        [0.13, 0.04, 0.229],
        [0.1, -0.12, 0.195],
      ],
      a,
      0.044,
    );
  } else if (h === 'armor') {
    for (const s of [-1, 1]) {
      ball('chest-plate' + s, 'torso', [s * 0.2, 0.87, 0.212], [0.205, 0.174, 0.089], a);
      ball(
        'shoulder-guard' + s,
        'arm-' + (s === 1 ? 'right' : 'left'),
        [0, 0.015, 0],
        [0.17 + m * 0.045, 0.146, 0.171],
        a,
      );
    }
    for (let i = 0; i < 3; i++)
      ring(
        'armor-rib' + i,
        'torso',
        [
          [0.29 + i * 0.125, waist + 0.04, 0.232],
          [0.335 + i * 0.125, waist + 0.045, 0.24],
        ],
        '#41485a',
      );
  } else {
    stroke(
      'shirt-mark',
      'torso',
      [
        [0.16, 0.87, 0.286],
        [0.2, 0.94, 0.294],
        [0.265, 0.94, 0.281],
      ],
      a,
      0.01,
    );
    stroke(
      'shirt-seam-left',
      'torso',
      [
        [-0.31, 0.95, 0.257],
        [-0.23, 0.72, 0.259],
        [-0.22, 0.27, 0.215],
      ],
      a,
      0.004,
    );
    stroke(
      'shirt-seam-right',
      'torso',
      [
        [0.31, 0.95, 0.257],
        [0.23, 0.72, 0.259],
        [0.22, 0.27, 0.215],
      ],
      a,
      0.004,
    );
  }
}
