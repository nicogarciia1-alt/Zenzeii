import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveWord, updateSavedWord, deleteSavedWord, submitReview, updateProgress } from './api';

const QUEUE_KEY = 'z:queue';

async function loadQueue() {
  try {
    const v = await AsyncStorage.getItem(QUEUE_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

async function persistQueue(queue) {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

export async function enqueue(type, payload) {
  const queue = await loadQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, payload });
  await persistQueue(queue);
}

// Called by App.js when connectivity is restored.
// Processes each op in order; any that fail remain in the queue for the next reconnect.
export async function flushQueue() {
  const queue = await loadQueue();
  if (!queue.length) return;

  const failed = [];
  for (const op of queue) {
    try {
      switch (op.type) {
        case 'saveWord':         await saveWord(op.payload);                               break;
        case 'updateSavedWord':  await updateSavedWord(op.payload.id, op.payload.data);   break;
        case 'deleteSavedWord':  await deleteSavedWord(op.payload.wordId);                break;
        case 'submitReview':     await submitReview(op.payload.wordId, op.payload.correct); break;
        case 'updateProgress':   await updateProgress(op.payload);                        break;
      }
    } catch {
      failed.push(op);
    }
  }
  await persistQueue(failed);
}
