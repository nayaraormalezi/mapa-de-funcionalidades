/**
 * Notifica instâncias montadas de FeatureComments (prévia e ficha)
 * para recarregar a mesma fonte após mutação — sem cache paralelo.
 */

type Listener = (featureId: string) => void;

const listeners = new Set<Listener>();

export function subscribeFeatureCommentsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyFeatureCommentsChanged(featureId: string) {
  const id = String(featureId ?? "").trim();
  if (!id) return;
  for (const listener of listeners) {
    try {
      listener(id);
    } catch {
      // ignore listener errors
    }
  }
}
