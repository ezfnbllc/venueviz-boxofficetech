import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAgI8RZe6Ywv3GJvV4-nKc6QMNeoePW9Ao",
  authDomain: "venueviz.firebaseapp.com",
  projectId: "venueviz",
  storageBucket: "venueviz.firebasestorage.app",
  messagingSenderId: "909590204619",
  appId: "1:909590204619:web:f38c3e014375e23dac8b4e"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
