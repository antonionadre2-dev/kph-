export const PRIVATE_REQUEST_NOTES = 'maintenance_request_internal';
export interface RequestTeamNote { id:string; author:string; text:string; createdAt:string; updatedAt?:string }
export function validTeamNotes(value:unknown):value is RequestTeamNote[] {
  return Array.isArray(value)&&value.every(note=>note&&typeof note==='object'&&['id','author','text','createdAt'].every(key=>typeof note[key]==='string')&&(note.updatedAt===undefined||typeof note.updatedAt==='string'));
}
export const teamNotesSummary=(notes:RequestTeamNote[])=>notes.map(note=>`[${note.author} - ${note.createdAt}]: ${note.text}`).join('\n\n');
/** Only staff callers may use legacy fallbacks; an explicitly empty private history stays empty. */
export function resolveStaffNotes(privateData:any|undefined,legacy:any,localValue:unknown):RequestTeamNote[]{
  if(privateData!==undefined){if(!validTeamNotes(privateData.teamNotes))throw Error('PRIVATE_NOTES_INVALID');return privateData.teamNotes;}
  if(validTeamNotes(legacy.teamNotes)&&legacy.teamNotes.length)return legacy.teamNotes;
  if(validTeamNotes(localValue)&&localValue.length)return localValue;
  if(typeof legacy.notes==='string'&&legacy.notes.trim())return [{id:'legacy_note_1',author:'Sistema / Equipo',text:legacy.notes,createdAt:'Fecha registrada'}];
  return [];
}
