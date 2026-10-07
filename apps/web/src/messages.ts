const translations: Record<string, [string, string]> = {
  "Breathing safety": ["Seguridad al respirar", "Segurança ao respirar"],
  "A moment to breathe.": ["Un momento para respirar.", "Um momento para respirar."],
  "Shared breathing practice": ["Práctica de respiración compartida", "Prática de respiração compartilhada"],
  "Practice seated somewhere safe. Never practice while driving or in or near water. Keep holds comfortable; stop if dizzy or unwell.": ["Practica sentado en un lugar seguro. Nunca practiques al conducir ni en el agua o cerca de ella. Las pausas deben ser cómodas; detente si te mareas o te sientes mal.", "Pratique sentado em um lugar seguro. Nunca pratique ao dirigir, na água ou perto dela. As pausas devem ser confortáveis; pare se sentir tontura ou mal-estar."],
  "Breathing guide": ["Guía de respiración", "Guia de respiração"],
  "Ready when you are": ["Cuando tú quieras", "Quando você quiser"],
  "Time remaining": ["Tiempo restante", "Tempo restante"],
  "Session progress": ["Progreso de la sesión", "Progresso da sessão"],
  "Choose Start practice when you are in a safe place.": ["Elige Empezar práctica cuando estés en un lugar seguro.", "Escolha Começar prática quando estiver em um lugar seguro."],
  "Start practice": ["Empezar práctica", "Começar prática"],
  "Stop · I feel unwell": ["Detener · Me siento mal", "Parar · Estou me sentindo mal"],
  "Practice again": ["Volver a practicar", "Praticar novamente"],
  "Keep your practice close.": ["Ten tu práctica a mano.", "Tenha sua prática por perto."],
  "Open this exercise in IN/OUT": ["Abrir este ejercicio en IN/OUT", "Abrir este exercício no IN/OUT"],
  "If IN/OUT is not installed, you can keep practicing here.": ["Si no tienes IN/OUT instalado, puedes seguir practicando aquí.", "Se o IN/OUT não estiver instalado, você pode continuar praticando aqui."],
  "Privacy": ["Privacidad", "Privacidade"],
  "Support": ["Ayuda", "Ajuda"],
  "Practice complete. Return to your natural breathing.": ["Práctica completada. Vuelve a tu respiración natural.", "Prática concluída. Volte à sua respiração natural."],
  "Well done": ["Muy bien", "Muito bem"],
  "Breathe naturally": ["Respira con naturalidad", "Respire naturalmente"],
  "Inhale": ["Inhala", "Inspire"],
  "Top up": ["Inhala un poco más", "Inspire um pouco mais"],
  "Exhale": ["Exhala", "Expire"],
  "Hold": ["Pausa", "Segure"],
  "Hum": ["Zumba al exhalar", "Expire com um zumbido"],
  "left nostril": ["fosa nasal izquierda", "narina esquerda"],
  "right nostril": ["fosa nasal derecha", "narina direita"],
  "Pause": ["Pausar", "Pausar"],
  "Stop": ["Detener", "Parar"],
  "Resume": ["Continuar", "Continuar"],
  "Follow gently. Stop whenever you need to.": ["Sigue el ritmo suavemente. Detente cuando lo necesites.", "Siga o ritmo suavemente. Pare quando precisar."],
  "Paused. Breathe naturally; resume when ready.": ["En pausa. Respira con naturalidad y continúa cuando quieras.", "Em pausa. Respire naturalmente e continue quando quiser."],
  "Stopped. Breathe naturally and rest somewhere safe.": ["Detenido. Respira con naturalidad y descansa en un lugar seguro.", "Interrompido. Respire naturalmente e descanse em um lugar seguro."],
  "Paused after leaving this page. Breathe naturally, then resume when ready.": ["En pausa porque saliste de esta página. Respira con naturalidad y continúa cuando quieras.", "Em pausa porque você saiu desta página. Respire naturalmente e continue quando quiser."],
  "This exercise link is invalid or unsupported. Ask for a new link.": ["Este enlace de ejercicio no es válido o no es compatible. Pide un enlace nuevo.", "Este link de exercício é inválido ou incompatível. Peça um novo link."],
  "Exercise unavailable": ["Ejercicio no disponible", "Exercício indisponível"],
  "Loading exercise…": ["Cargando ejercicio…", "Carregando exercício…"],
  "This link has expired or been revoked.": ["Este enlace venció o fue revocado.", "Este link expirou ou foi revogado."],
  "This exercise link is invalid or unsupported.": ["Este enlace de ejercicio no es válido o no es compatible.", "Este link de exercício é inválido ou incompatível."],
  "Exercise sharing is not available online yet. Please try again later.": ["El uso compartido de ejercicios aún no está disponible en línea. Vuelve a intentarlo más tarde.", "O compartilhamento de exercícios ainda não está disponível online. Tente novamente mais tarde."],
  "Sharing is temporarily unavailable. Please try again online.": ["El uso compartido no está disponible temporalmente. Vuelve a intentarlo con conexión.", "O compartilhamento está temporariamente indisponível. Tente novamente com conexão."],
  "Too many links were created recently. Please try again later.": ["Se crearon demasiados enlaces recientemente. Vuelve a intentarlo más tarde.", "Muitos links foram criados recentemente. Tente novamente mais tarde."],
  "No account, payment, or installation needed. This page saves no practice history. Leaving the page pauses the timer; reloading resets it. Shared links expire after 30 days and can be revoked by their creator. An exercise already loaded may still be used.": ["No necesitas cuenta, pago ni instalación. Esta página no guarda historial. Al salir, el temporizador se pausa; al recargar, se reinicia. Los enlaces vencen a los 30 días y su creador puede revocarlos. Un ejercicio ya cargado puede seguir usándose.", "Não é necessário criar conta, pagar ou instalar. Esta página não guarda histórico. Ao sair, o cronômetro pausa; ao recarregar, ele reinicia. Os links expiram após 30 dias e o criador pode revogá-los. Um exercício já carregado pode continuar sendo usado."],
};
const preferred = new URLSearchParams(location.search).get("lang") ?? navigator.language.slice(0, 2);
export const language = preferred === "es" || preferred === "pt" ? preferred : "en";
export const t = (text: string) => translations[text]?.[language === "es" ? 0 : 1] && language !== "en" ? translations[text][language === "es" ? 0 : 1] : text;
export function localizePage() {
  document.documentElement.lang = language;
  document.title = `IN/OUT · ${t("Shared breathing practice")}`;
  const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "", trimmed = text.trim();
    if (trimmed) node.textContent = text.replace(trimmed, t(trimmed));
  }
  for (const node of document.querySelectorAll("[aria-label]")) node.setAttribute("aria-label", t(node.getAttribute("aria-label")!));
}
