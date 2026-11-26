export type Locale = 'fr-CA' | 'en-CA';
export type Persona = 'cooperative' | 'worried' | 'hurried' | 'hesitant';
export interface DialogueRequest {
 scenarioId: string;
 locale: Locale;
 persona: Persona;
 allowedFacts: readonly string[];
 learnerText: string;
}
export interface DialogueResponse {
 utterance: string;
 factIds: string[];
 needsClarification: boolean;
}
export function validateDialogue(value: unknown, allowedFactIds: readonly string[]): value is DialogueResponse {
 if (!value || typeof value !== 'object') return false;
 const v = value as Record<string, unknown>;
 return Object.keys(v).every(k => ['utterance','factIds','needsClarification'].includes(k))
 && typeof v.utterance === 'string' && v.utterance.length > 0 && v.utterance.length <= 600
 && Array.isArray(v.factIds) && v.factIds.every(id => typeof id === 'string' && allowedFactIds.includes(id))
 && typeof v.needsClarification === 'boolean';
}
// Structural validation does not establish semantic factuality.
// Use approved scripted fallback when semantic fidelity cannot be established.
