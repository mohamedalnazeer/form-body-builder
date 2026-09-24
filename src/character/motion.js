const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (n) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export const EMOTE_DURATION = 4.2;
export const GAINS_APPLY_AT = 3.25;
export function characterPose(kind, seconds, idle = 0) {
  const pose = {
    torsoY: Math.sin(idle * 1.6) * 0.006,
    torsoX: 0,
    headX: Math.sin(idle * 0.7) * 0.018,
    headY: Math.sin(idle * 0.4) * 0.018,
    armLeft: [0, 0, -0.14],
    armRight: [0, 0, 0.14],
    forearmLeft: [-0.06, 0, 0],
    forearmRight: [-0.06, 0, 0],
    food: false,
    foodScale: 1,
    aura: 0,
    rootY: 0,
  };
  if (!kind) return pose;
  const t = seconds;
  if (kind === 'meal') {
    const lift = smooth(t / 0.65) * (1 - smooth((t - 2.45) / 0.65));
    pose.armRight = [-0.38 * lift, 0, 0.14 - 1.13 * lift];
    pose.forearmRight = [0.12 * lift, 0, -1.92 * lift];
    pose.headX = 0.09 * lift + Math.sin(t * 15) * 0.022 * lift;
    pose.food = t < 2.5;
    pose.foodScale = t > 1.4 ? 0.65 : 1;
    pose.torsoY += t > 2.65 && t < 3.1 ? Math.sin(((t - 2.65) / 0.45) * Math.PI) * 0.028 : 0;
  } else if (kind === 'workout') {
    const power = smooth((t - 0.15) / 0.65) * (1 - smooth((t - 2.6) / 0.75));
    pose.armRight = [-0.06, 0, 0.14 + 1.22 * power];
    pose.armLeft = [-0.06, 0, -0.14 - 1.22 * power];
    pose.forearmRight = [0, 0, 1.51 * power];
    pose.forearmLeft = [0, 0, -1.51 * power];
    pose.rootY = -0.035 * power;
    pose.headX = -0.055 * power;
    pose.aura = power * (0.7 + 0.12 * Math.sin(t * 7));
  } else {
    const breathe = Math.sin(clamp(t / 3.2) * Math.PI);
    pose.torsoY += breathe * 0.025;
    pose.headX = 0.08 * breathe;
  }
  return pose;
}
