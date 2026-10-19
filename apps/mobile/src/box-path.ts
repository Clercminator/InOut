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

export const triangleVertices = [{ x: .5, y: 0 }, { x: 1, y: Math.sqrt(3) / 2 }, { x: 0, y: Math.sqrt(3) / 2 }];
export function trianglePoint(progress: number) {
  const edge = Math.min(2, Math.floor(Math.max(0, progress)));
  const amount = Math.min(1, Math.max(0, progress - edge));
  const from = triangleVertices[edge], to = triangleVertices[(edge + 1) % 3];
  return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
}
export const triangleSamples = Array.from({ length: 121 }, (_, i) => ({ progress: i / 40, ...trianglePoint(i / 40) }));
