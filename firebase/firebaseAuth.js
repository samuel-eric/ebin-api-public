// Import the functions you need from the SDKs you need
import admin from 'firebase-admin';
import serviceAccount from '../ebin-e75ab-firebase-adminsdk-cpkpb-e0bd07ec1a.json' assert { type: 'json' };

// Initialize Firebase
const app = admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});
const auth = admin.auth(app);

export default auth;
