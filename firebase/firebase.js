// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: 'AIzaSyD61g1b3Fm_MA0eCSQyyWNEcsNgR5Hepnw',
	authDomain: 'ebin-e75ab.firebaseapp.com',
	projectId: 'ebin-e75ab',
	storageBucket: 'ebin-e75ab.appspot.com',
	messagingSenderId: '457196453654',
	appId: '1:457196453654:web:b3b987717ae161e5915a37',
	measurementId: 'G-RDGD2NDN7T',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;
