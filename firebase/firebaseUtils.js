import db from './firebase.js';
import auth from './firebaseAuth.js';
import {
	doc,
	getDocs,
	getDoc,
	setDoc,
	collection,
	updateDoc,
} from 'firebase/firestore';

async function getAllData(col) {
	const querySnapshot = await getDocs(collection(db, col));
	const result = [];
	querySnapshot.forEach((doc) => {
		result.push({
			id: doc.id,
			...doc.data(),
		});
	});
	return result;
}

async function getData(col, id) {
	const querySnapshot = await getDoc(doc(db, col, id));
	if (querySnapshot.exists()) {
		const result = { id, ...querySnapshot.data() };
		return result;
	} else {
		return null;
	}
}

function getDocRef(col, id) {
	return doc(db, col, id);
}

async function getDataByRef(ref) {
	const querySnapshot = await getDoc(ref);
	if (querySnapshot.exists()) {
		return querySnapshot.data();
	} else {
		return null;
	}
}

async function addData(col, id, data) {
	await setDoc(doc(db, col, id), data);
	return getData(col, id);
}

async function updateData(col, id, data) {
	await updateDoc(doc(db, col, id), data);
	return getData(col, id);
}

async function getUserByID(id) {
	const userRecord = await auth.getUser(id);
	return userRecord.toJSON();
}

async function getUserByEmail(email) {
	const userRecord = await auth.getUserByEmail(email);
	return userRecord.toJSON();
}

async function getUserByPhone(phone) {
	const userRecord = await auth.getUserByPhoneNumber(phone);
	return userRecord.toJSON();
}

async function createUser(data) {
	const userCredential = await auth.createUser(data);
	return userCredential;
}

async function updateUser(id, data) {
	const userRecord = await auth.updateUser(id, data);
	return userRecord.toJSON();
}

export {
	getAllData,
	getData,
	getDocRef,
	getDataByRef,
	addData,
	updateData,
	getUserByID,
	createUser,
	updateUser,
};
