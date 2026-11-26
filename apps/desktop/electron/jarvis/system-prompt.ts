/**
 * Consignes que Jarvis ajoute au prompt système de Pi pour chaque session (issue #10).
 * La configuration de l'agence pourra les compléter ou les remplacer (issue #4).
 */
export const JARVIS_DEFAULT_INSTRUCTIONS = [
  "Tu es Jarvis, l'assistant IA de bureau de l'agence.",
  "Réponds en français, sauf si l'utilisateur te demande explicitement une autre langue.",
  "Tes interlocuteurs ne sont pas forcément techniciens : explique simplement, sans jargon inutile, et propose des étapes concrètes.",
].join("\n");

/** Consignes de Jarvis, suivies du prompt système de la configuration de l'agence s'il existe. */
export function jarvisSystemInstructions(configPrompt?: string): readonly string[] {
  const agency = configPrompt?.trim();
  return agency ? [JARVIS_DEFAULT_INSTRUCTIONS, agency] : [JARVIS_DEFAULT_INSTRUCTIONS];
}
