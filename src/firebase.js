// // src/firebase.js
// import { initializeApp } from "firebase/app";
// import { getDatabase } from "firebase/database";

// const firebaseConfig = {
//   apiKey: "AIzaSyBVJUQoZ-RB7BpKqsrHQyFfOr_DEta6A3k",
//   authDomain: "health-sync-dev.firebaseapp.com",
//   databaseURL: "https://health-sync-dev-default-rtdb.firebaseio.com",
//   projectId: "health-sync-dev",
//   storageBucket: "health-sync-dev.appspot.com",
//   messagingSenderId: "265588697923",
//   appId: "1:265588697923:web:63eeb1253d0a025bd3ddf6",
// };

// const app = initializeApp(firebaseConfig);
// export const database = getDatabase(app);


// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVJUQoZ-RB7BpKqsrHQyFfOr_DEta6A3k",
  authDomain: "health-sync-dev.firebaseapp.com",
  databaseURL: "https://health-sync-dev-default-rtdb.firebaseio.com",
  projectId: "health-sync-dev",
  storageBucket: "health-sync-dev.appspot.com",
  messagingSenderId: "265588697923",
  appId: "1:265588697923:web:63eeb1253d0a025bd3ddf6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
