export type SceneSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type ScenePhase = 'dawn' | 'day' | 'evening' | 'night';
export type SceneCelebration = 'none' | 'christmas' | 'newyear';
export interface SceneCalendar { season: SceneSeason; phase: ScenePhase; celebration: SceneCelebration }

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
/** Existing editorial lighting bands, independent of weather requests and the host timezone. */
export function sceneCalendar(date = new Date()): SceneCalendar & { month: number } {
  const parts = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  const season: SceneSeason = parts.month >= 3 && parts.month <= 5 ? 'spring'
    : parts.month >= 6 && parts.month <= 8 ? 'summer' : parts.month >= 9 && parts.month <= 11 ? 'autumn' : 'winter';
  const [morning, evening] = { spring: [7, 20], summer: [6, 21], autumn: [7, 18], winter: [8, 17] }[season];
  const time = parts.hour + parts.minute / 60;
  const phase: ScenePhase = time < morning - .75 || time >= evening + .5 ? 'night'
    : time < morning + .5 ? 'dawn' : time >= evening - 1 ? 'evening' : 'day';
  const celebration: SceneCelebration = parts.month === 12 && parts.day <= 26 ? 'christmas'
    : parts.month === 12 && parts.day >= 27 || parts.month === 1 && parts.day <= 6 ? 'newyear' : 'none';
  return { season, phase, celebration, month: parts.month };
}

/** The built fragment is deterministic; the server replaces it for each actual request. */
export const DEFAULT_SCENE: SceneCalendar = { season: 'autumn', phase: 'day', celebration: 'none' };
export function initialSceneCalendar(): SceneCalendar {
  if (typeof document === 'undefined') return DEFAULT_SCENE;
  const scene = document.getElementById('sceneCanvas');
  const season = scene?.dataset.season, phase = scene?.dataset.phase, celebration = scene?.dataset.celebration;
  if (season && phase && celebration && ['spring', 'summer', 'autumn', 'winter'].includes(season)
    && ['dawn', 'day', 'evening', 'night'].includes(phase) && ['none', 'christmas', 'newyear'].includes(celebration)) {
    return { season: season as SceneSeason, phase: phase as ScenePhase, celebration: celebration as SceneCelebration };
  }
  // A client-side navigation also chooses the correct room before React commits its first frame.
  return sceneCalendar();
}
