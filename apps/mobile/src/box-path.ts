// One phase covers one straight edge and its following rounded corner.
// Arc-length parameterization keeps the guide's speed constant through corners.
export function boxPoint(progress: number) {
  const radius = 0.09;
  const straight = 1 - 2 * radius;
  const arc = Math.PI * radius / 2;
  const edge = Math.min(3, Math.floor(Math.max(0, progress)));
  const distance = Math.min(1, Math.max(0, progress - edge)) * (straight + arc);
  let x: number, y: number;
  if (distance <= straight) {
    x = radius + distance;
    y = 0;
  } else {
    const angle = (distance - straight) / radius;
    x = 1 - radius + Math.sin(angle) * radius;
    y = radius - Math.cos(angle) * radius;
  }
  for (let turn = 0; turn < edge; turn++) [x, y] = [1 - y, x];
  return { x, y };
}

export const boxSamples = Array.from({ length: 161 }, (_, index) => {
  const progress = index / 40;
  return { progress, ...boxPoint(progress) };
});
