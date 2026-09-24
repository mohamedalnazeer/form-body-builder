export const HAIRSTYLES = [
  { id: 'spiky', name: 'Rising edge', description: 'Swept, angular spikes' },
  { id: 'swept', name: 'Side sweep', description: 'A sharp side part' },
  { id: 'crop', name: 'Textured crop', description: 'Short and sculpted' },
  { id: 'long', name: 'Long flow', description: 'Layered shoulder length' },
  { id: 'ponytail', name: 'High tail', description: 'Tied back for training' },
  { id: 'bald', name: 'Clean shave', description: 'No hair, all focus' },
];
export const OUTFITS = [
  { id: 'training', name: 'Training kit', description: 'Fitted top + shorts' },
  { id: 'gi', name: 'Fighter gi', description: 'Wrap vest + training pants' },
  { id: 'armor', name: 'Tech suit', description: 'Light armored sportswear' },
  { id: 'shorts', name: 'Shirtless', description: 'Training shorts only' },
  { id: 'physique', name: 'Physique view', description: 'Unclothed, smooth mannequin anatomy' },
];
export const CHARACTER_DEFAULTS = {
  hairStyle: 'spiky',
  hairColor: '#242638',
  eyeColor: '#457e8a',
  outfit: 'shorts',
  outfitColor: '#384559',
  accentColor: '#d6ed86',
  units: 'imperial',
  animations: true,
};
export const normalizeProfile = (p) => ({ ...CHARACTER_DEFAULTS, ...p });
export const validCharacter = (p) =>
  (p.units === undefined || ['metric', 'imperial'].includes(p.units)) &&
  (p.hairStyle === undefined || HAIRSTYLES.some((h) => h.id === p.hairStyle)) &&
  (p.outfit === undefined || OUTFITS.some((o) => o.id === p.outfit)) &&
  ['hairColor', 'eyeColor', 'outfitColor', 'accentColor'].every(
    (k) => p[k] === undefined || /^#[0-9a-fA-F]{6}$/.test(p[k]),
  ) &&
  (p.animations === undefined || typeof p.animations === 'boolean');
