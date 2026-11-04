// Importar as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase da sua aplicação
const firebaseConfig = {
  apiKey: "AIzaSyCfxM0tbi8S-NbjPTZHFKlaYKGQbz5Ds",
  authDomain: "sistema-de-manutencao-g.firebaseapp.com",
  projectId: "sistema-de-manutencao-g",
  storageBucket: "sistema-de-manutencao-g.firebasestorage.app",
  messagingSenderId: "495876097440",
  appId: "1:495876097440:web:43959c3557519b4a8f90c5",
  measurementId: "G-Q83223V1M7"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };