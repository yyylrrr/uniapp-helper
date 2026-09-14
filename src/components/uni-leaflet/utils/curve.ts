import type { LatLngTuple } from '../types';

/**
 * Generate a smooth arc / flight route between two LatLng points using quadratic Bézier curve.
 * @param p1 Starting [lat, lng]
 * @param p2 Ending [lat, lng]
 * @param curvature Curvature factor, default 0.25 (positive arches left/up, negative arches right/down, 0 is straight)
 * @param segments Number of interpolation segments along the curve, default 36
 */
export function generateCurvedArc(
  p1: LatLngTuple,
  p2: LatLngTuple,
  curvature = 0.25,
  segments = 36
): LatLngTuple[] {
  if (Math.abs(curvature) < 1e-4) {
    return [p1, p2];
  }

  const [lat1, lng1] = p1;
  const [lat2, lng2] = p2;

  // Vector between points
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.hypot(dLat, dLng);

  if (dist < 1e-7) {
    return [p1, p2];
  }

  // Midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Normal perpendicular vector [-dLng / dist, dLat / dist]
  const normLat = -dLng / dist;
  const normLng = dLat / dist;

  // Control point
  const ctrlLat = midLat + normLat * dist * curvature;
  const ctrlLng = midLng + normLng * dist * curvature;

  const points: LatLngTuple[] = [];
  const steps = Math.max(12, segments);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    // Quadratic Bézier formula: B(t) = (1-t)^2 * P1 + 2*(1-t)*t * C + t^2 * P2
    const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
    const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }

  return points;
}

/**
 * Generate a curved polyline from an array of waypoints.
 * If 2 points: generates a single arc.
 * If > 2 points: generates sequential arcs between consecutive pairs.
 */
export function generateCurvedPolyline(
  latLngs: LatLngTuple[],
  curvature = 0.25,
  segments = 36
): LatLngTuple[] {
  if (!latLngs || latLngs.length < 2) return latLngs || [];
  if (Math.abs(curvature) < 1e-4) return latLngs;

  if (latLngs.length === 2) {
    return generateCurvedArc(latLngs[0], latLngs[1], curvature, segments);
  }

  const result: LatLngTuple[] = [];
  for (let i = 0; i < latLngs.length - 1; i++) {
    const arc = generateCurvedArc(latLngs[i], latLngs[i + 1], curvature, segments);
    if (i > 0) {
      // Avoid duplicate junction point
      arc.shift();
    }
    result.push(...arc);
  }
  return result;
}
