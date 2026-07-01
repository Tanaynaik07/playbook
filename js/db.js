import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, orderBy, setDoc,
} from "./firebase-config.js";

let uid = null;
export function setUid(id) { uid = id; }

// Paths -----------------------------------------------------------------
const root = () => `users/${uid}`;
export const projectsPath = () => `${root()}/projects`;
export const sectionPath = (projectId, sectionKey) => `${root()}/projects/${projectId}/sections/${sectionKey}/items`;
export const knowledgePath = () => `${root()}/knowledge`;
export const playbookPath = () => `${root()}/playbook`;
export const journalPath = () => `${root()}/journal`;
export const streaksPath = () => `${root()}/streaks`;
export const expensesPath = () => `${root()}/expenses`;
export const logPath = () => `${root()}/log`;

// Generic CRUD ------------------------------------------------------------
export async function listAll(path, orderField = null) {
  const ref = collection(db, path);
  const q = orderField ? query(ref, orderBy(orderField, "desc")) : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addItem(path, data) {
  return addDoc(collection(db, path), { ...data, createdAt: Date.now() });
}

export async function setItem(path, id, data) {
  return setDoc(doc(db, path, id), { ...data, updatedAt: Date.now() }, { merge: true });
}

export async function updateItem(path, id, data) {
  return updateDoc(doc(db, path, id), { ...data, updatedAt: Date.now() });
}

export async function removeItem(path, id) {
  return deleteDoc(doc(db, path, id));
}

export async function getOne(path, id) {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}