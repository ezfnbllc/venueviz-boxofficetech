import{initializeApp,getApps}from'firebase/app'
import{getFirestore}from'firebase/firestore'
import{getAuth}from'firebase/auth'
import{getStorage}from'firebase/storage'
const config={
apiKey:"AIzaSyAgI8RZe6Ywv3GJvV4-nKc6QMNeoePW9Ao",
authDomain:"venueviz.firebaseapp.com",
projectId:"venueviz",
storageBucket:"venueviz.firebasestorage.app",
messagingSenderId:"909590204619",
appId:"1:909590204619:web:f38c3e014375e23dac8b4e"
}
const app=!getApps().length?initializeApp(config):getApps()[0]
export const db=getFirestore(app)
export const auth=getAuth(app)
export const storage=getStorage(app)
export const STORAGE_URL='https://firebasestorage.googleapis.com/v0/b/venueviz.firebasestorage.app/o/production%2F'
export default app
