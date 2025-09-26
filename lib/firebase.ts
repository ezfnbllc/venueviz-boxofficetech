import{initializeApp}from'firebase/app'
import{getFirestore}from'firebase/firestore'
import{getAuth}from'firebase/auth'
const config={
  apiKey:"AIzaSyBXyK5rNbOS8wqKkPvMhd5Xm9iQgLqWYmE",
  authDomain:"venueviz.firebaseapp.com",
  projectId:"venueviz",
  storageBucket:"venueviz.appspot.com",
  messagingSenderId:"123456789",
  appId:"1:123456789:web:abc123"
}
const app=initializeApp(config)
export const db=getFirestore(app)
export const auth=getAuth(app)
export default app
