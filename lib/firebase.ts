import{initializeApp,getApps}from'firebase/app'
import{getFirestore,connectFirestoreEmulator}from'firebase/firestore'
import{getAuth,connectAuthEmulator}from'firebase/auth'
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
export const dbStatus={connected:true,name:'Firebase Firestore - VenueViz'}
export default app
