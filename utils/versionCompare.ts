/**
 * Semantic version comparison utility for FlashFits app updates.
 */

/**
 * Compares two semantic version strings (e.g. "1.0.2" vs "1.1.0").
 * Returns:
 *  -1 if v1 < v2
 *   1 if v1 > v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string = '0.0.0', v2: string = '0.0.0'): number {
  // Clean version strings (remove pre-release suffixes or non-numeric chars except dots)
  const cleanV1 = v1.replace(/[^0-9.]/g, '');
  const cleanV2 = v2.replace(/[^0-9.]/g, '');

  const parts1 = cleanV1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] !== undefined ? parts1[i] : 0;
    const num2 = parts2[i] !== undefined ? parts2[i] : 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}

export type AppUpdateType = 'MANDATORY' | 'OPTIONAL' | 'UP_TO_DATE';

/**
 * Determines whether the user requires a mandatory update, an optional update,
 * or is already on the latest version.
 */
export function getUpdateStatus(
  currentVersion: string,
  minVersion: string,
  latestVersion: string
): AppUpdateType {
  // If current version is less than the minimum required version -> MANDATORY
  if (compareVersions(currentVersion, minVersion) < 0) {
    return 'MANDATORY';
  }

  // If current version is at least minimum, but less than latest -> OPTIONAL
  if (compareVersions(currentVersion, latestVersion) < 0) {
    return 'OPTIONAL';
  }

  return 'UP_TO_DATE';
}
